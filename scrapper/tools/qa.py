import asyncio
import json
import re
import os
from typing import Optional
from curl_cffi.requests import AsyncSession

async def fetch_qa(product_name: str, trendyol_id: str = None, hb_sku: str = None, trendyol_url: str = None) -> list[dict]:
    """
    Trendyol ve Hepsiburada için ham soru-cevap verilerini toplar.
    """
    hb_skus = [hb_sku] if hb_sku else await _find_hb_skus(product_name)
    ty_ids = await _find_ty_ids(product_name)
    if trendyol_id and trendyol_id not in ty_ids:
        ty_ids.insert(0, trendyol_id)

    
    # Trendyol için "gerçek" contentId bulmaya çalış
    resolved_ty_ids = []
    if trendyol_url:
        cid = await _resolve_ty_content_id(url=trendyol_url)
        if cid: resolved_ty_ids.append(cid)
    
    if not resolved_ty_ids and ty_ids:
        # Eğer URL yoksa veya başarısızsa ilk 2 ID için deneme yap
        res = await asyncio.gather(*[_resolve_ty_content_id(product_id=tid) for tid in ty_ids[:2]])
        resolved_ty_ids.extend([r for r in res if r])
    
    # Tüm TY ID'lerini birleştir (URL'den gelenler + arama sonuçları)
    all_ty_candidates = list(dict.fromkeys(resolved_ty_ids + ty_ids))
    
    tasks = []
    for sku in hb_skus[:2]:
        tasks.append(_fetch_hb_qa(sku))
    for cid in all_ty_candidates[:2]:
        tasks.append(_fetch_ty_qa(cid))

        
    results = await asyncio.gather(*tasks, return_exceptions=True)
    all_qa = []
    for r in results:
        if isinstance(r, Exception):
            continue
        all_qa.extend(r)
        
    seen = set()
    unique = []
    for q in all_qa:
        key = q.get("question", "").strip().lower()[:150]
        if key and key not in seen:
            seen.add(key)
            if "author" in q:
                del q["author"]
            unique.append(q)
            
    print(f"  [QA] {len(unique)} ham soru-cevap kaydı toplandı ({len(hb_skus)} HB SKU, {len(resolved_ty_ids or ty_ids)} TY ID)")
    return unique



async def _resolve_ty_content_id(url: str = None, product_id: str = None) -> Optional[str]:
    """Ürün sayfasından gerçek contentId (soru API'si için gereken) değerini çeker."""
    from curl_cffi.requests import AsyncSession
    sess = AsyncSession(impersonate="chrome120")
    try:
        target_url = url if url else f"https://www.trendyol.com/p-{product_id}"

        # 1. Öncelik: URL'deki -p- ID'si — en güvenilir kaynak.
        # Sayfa HTML'inde önerilen/benzer ürünlerin contentId'leri de gömülü;
        # ilk regex eşleşmesi yanlış ürünü yakalayıp alakasız QA çekebiliyor.
        m2 = re.search(r"-p-(\d+)", target_url)
        if m2: return m2.group(1)

        r = await sess.get(target_url, timeout=10)
        if r.status_code == 200:
            # 2. Öncelik: contentId
            m = re.search(r'"contentId":\s*(\d+)', r.text)
            if m: return m.group(1)
            # 3. Öncelik: productid (büyük-küçük harf duyarsız)
            m = re.search(r'"productid":\s*(\d+)', r.text, re.I)
            if m: return m.group(1)

        # 4. Öncelik: Verilen product_id
        if product_id: return str(product_id)
    except Exception: pass
    finally: await sess.close()
    return None



async def _fetch_hb_qa(sku: str) -> list[dict]:
    """Hepsiburada Hermes QnA API."""
    from curl_cffi.requests import AsyncSession
    sess = AsyncSession(impersonate="chrome120")
    qa_list = []
    try:
        base_url = "https://user-content-gw-hermes.hepsiburada.com/queryapi/v1/PublishedQnA"
        headers = {
            "x-source-application": "voltran",
            "Accept": "application/json",
            "Referer": "https://www.hepsiburada.com/",
            "Origin": "https://www.hepsiburada.com"
        }
        
        async def _fetch_page(offset: int):
            url = f"{base_url}?sku={sku}&from={offset}&size=50"
            r = await sess.get(url, headers=headers)
            if r.status_code == 200:
                data = r.json()
                return data.get("data", {}).get("publishedQnAList", []), data.get("totalItemCount", 0)
            return [], 0

        first_items, total = await _fetch_page(0)
        for item in first_items:
            ans_text = ""
            if item.get("answers"):
                ans_text = " | ".join([a.get("editedAnswer", "") for a in item["answers"]])
            qa_list.append({
                "platform": "hepsiburada",
                "question": item.get("editedQuestion", "").strip(),
                "answer": ans_text.strip(),
                "source": "hepsiburada"
            })
            
        if total > 50:
            offsets = range(50, min(total, 100), 50)
            results = await asyncio.gather(*[_fetch_page(o) for o in offsets])
            for items, _ in results:
                for item in items:
                    ans_text = ""
                    if item.get("answers"):
                        ans_text = " | ".join([a.get("editedAnswer", "") for a in item["answers"]])
                    qa_list.append({
                        "platform": "hepsiburada",
                        "question": item.get("editedQuestion", "").strip(),
                        "answer": ans_text.strip(),
                        "source": "hepsiburada"
                    })
    except Exception: pass
    finally: await sess.close()
    return qa_list

async def _fetch_ty_qa(content_id: str) -> list[dict]:
    """Trendyol Q&A API — Answered endpoint."""
    from curl_cffi.requests import AsyncSession
    sess = AsyncSession(impersonate="chrome120")
    qa_list = []
    try:
        headers = {
            "x-domain": "www.trendyol.com",
            "x-platform": "web",
            "Accept": "application/json"
        }
        
        async def _fetch_page(page: int):
            # Trendyol QA API is 0-indexed.
            url = f"https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/merchant-questions/content/{content_id}/answered?fulfilmentType=mp&excludeTag=false&page={page}&size=50&isMobile=false&channelId=1"
            r = await sess.get(url, headers=headers)
            if r.status_code == 200:
                data = r.json()
                q_obj = data.get("questions", {})
                items = q_obj.get("content", [])
                total = q_obj.get("totalElements", 0)
                return items, total
            return [], 0

        # Page 0 is the first page
        first_items, total = await _fetch_page(0)
        for item in first_items:
            qa_list.append({
                "platform": "trendyol",
                "question": item.get("text", ""),
                "answer": item.get("answer", {}).get("text", "") if item.get("answer") else "",
                "date": item.get("creationDate", ""),
                "source": "trendyol"
            })
            
        if total > 50:
            # Limit to ~100 QA items (2 pages) to avoid blocking
            max_p = min((total // 50), 2) 
            pages = range(1, max_p + 1)
            results = await asyncio.gather(*[_fetch_page(p) for p in pages])
            for items, _ in results:
                for item in items:
                    qa_list.append({
                        "platform": "trendyol",
                        "question": item.get("text", ""),
                        "answer": item.get("answer", {}).get("text", "") if item.get("answer") else "",
                        "date": item.get("creationDate", ""),
                        "source": "trendyol"
                    })
    except Exception: pass
    finally: await sess.close()
    return qa_list


async def _find_hb_skus(name: str) -> list[str]:
    from curl_cffi.requests import AsyncSession
    sess = AsyncSession(impersonate="chrome120")
    skus = []
    try:
        url = f"https://www.hepsiburada.com/ara?q={name.replace(' ', '+')}"
        r = await sess.get(url)
        matches = re.findall(r"HBCV[0-9A-Z]+|HBC[0-9A-Z]+", r.text)
        skus = list(set(matches))
    except Exception: pass
    finally: await sess.close()
    return skus

async def _find_ty_ids(name: str) -> list[str]:
    from curl_cffi.requests import AsyncSession
    from ._search_utils import slug_matches_product
    sess = AsyncSession(impersonate="chrome120")
    ids = []
    try:
        # API yerine HTML arama sayfasını kullan (API 556 dönebiliyor)
        url = f"https://www.trendyol.com/sr?q={name.replace(' ', '+')}"
        r = await sess.get(url, timeout=10)
        if r.status_code == 200:
            # Slug+ID çiftlerini al; hedef ürünle eşleşen slug'lar öncelikli
            preferred, rest = [], []
            for slug, pid in re.findall(r"/([\w-]+)-p-(\d+)", r.text):
                target = preferred if slug_matches_product(slug, name) else rest
                if pid not in target:
                    target.append(pid)
            ids = list(dict.fromkeys(preferred + (rest if not preferred else [])))
    except Exception: pass
    finally: await sess.close()
    return ids

