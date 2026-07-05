import asyncio
import json
import os
import re
from typing import List, Optional
from datetime import datetime
from tools.youtube_helper import YoutubeHelper

proxy_helper = YoutubeHelper()

# Hepsiburada Hermes API (Reviews)
HERMES_API = "https://user-content-gw-hermes.hepsiburada.com/queryapi/v2/ApprovedUserContents"
PAGE_SIZE = 50

_HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Origin": "https://www.hepsiburada.com",
    "Referer": "https://www.hepsiburada.com/",
}

# Varsayılan 100 sayfa (5000 yorum/SKU) — veri tamlığı öncelikli (env ile düşürülebilir).
# Sayfalar paralel ve HB, YouTube'dan hızlı bittiğinden duvar saatine etkisi yok.
MAX_REVIEW_PAGES = int(os.getenv("MAX_REVIEW_PAGES", "100"))


async def _fetch_all_pages(sku: str, sess, max_pages: int = None) -> list[dict]:
    """Belirli bir HBCV SKU için tüm sayfaları çeker; featureStars'tan özet üretir."""
    if max_pages is None:
        max_pages = MAX_REVIEW_PAGES
    url0 = (
        f"{HERMES_API}?sku={sku}&from=0&size={PAGE_SIZE}"
        "&includeSiblingVariantContents=true&includeSummary=true"
    )

    feature_sums: dict[str, float] = {}
    feature_counts: dict[str, int] = {}
    feature_names: dict[str, str] = {}

    def _process_rev(rev: dict) -> dict:
        review_data = rev.get("review") or {}
        photos = []
        for m in rev.get("media") or []:
            u = m.get("url", "")
            if u:
                photos.append(u.replace("{size}", "800"))
        for fs in rev.get("featureStars") or []:
            fid = fs.get("featureId", "")
            star = fs.get("star", 0)
            text = (fs.get("text") or "").strip()
            if fid and star and text:
                feature_sums[fid] = feature_sums.get(fid, 0.0) + star
                feature_counts[fid] = feature_counts.get(fid, 0) + 1
                feature_names.setdefault(fid, text)
        return {
            "text": review_data.get("content", ""),
            # Hermes v2'de yıldız üst seviyedeki "star" alanında (review.rating artık yok)
            "rating": rev.get("star") or review_data.get("rating", 0),
            "date": rev.get("createdAt") or rev.get("creationDate") or review_data.get("createdAt", ""),
            "source": "hepsiburada",
            "photos": photos,
            "_id": rev.get("id"),
        }

    reviews = []
    try:
        r = await sess.get(url0, headers=_HEADERS, timeout=15)
        if r.status_code in (429, 403):
            if hasattr(sess, "proxies") and sess.proxies:
                p_url = sess.proxies.get("http")
                if p_url:
                    proxy_helper.ban_proxy(p_url)
            # Rate limit geçici olabilir — kısa bekleyip tek retry
            print(f"  [HB] Sayfa0 {r.status_code} ({sku}) — 2s sonra retry")
            await asyncio.sleep(2)
            r = await sess.get(url0, headers=_HEADERS, timeout=15)
        if r.status_code != 200:
            print(f"  [HB] Sayfa0 {r.status_code} ({sku}) — atlandı")
            return []

        payload = r.json()
        data = payload.get("data", {}).get("approvedUserContent", {})
        total = data.get("listCount", 0)
        first_batch = data.get("approvedUserContentList", [])

        for rev in first_batch:
            reviews.append(_process_rev(rev))

        results = []
        if total > PAGE_SIZE:
            max_total = min(total, max_pages * PAGE_SIZE)
            offsets = range(PAGE_SIZE, max_total, PAGE_SIZE)
            
            # Limit concurrency to avoid 429 Too Many Requests / Connection Drops
            sem = asyncio.Semaphore(5)

            async def _fetch_page(offset):
                url = f"{HERMES_API}?sku={sku}&from={offset}&size={PAGE_SIZE}&includeSiblingVariantContents=true"
                async with sem:
                    try:
                        resp = await sess.get(url, headers=_HEADERS, timeout=15)
                        if resp.status_code == 429 or resp.status_code == 403:
                            if hasattr(sess, "proxies") and sess.proxies:
                                p_url = sess.proxies.get("http")
                                if p_url:
                                    proxy_helper.ban_proxy(p_url)
                            return []
                        if resp.status_code == 200:
                            items = resp.json().get("data", {}).get("approvedUserContent", {}).get("approvedUserContentList", [])
                            return items
                    except Exception as e:
                        err = str(e)
                        if "Connection" in err or "Timeout" in err or "Connect" in err:
                            if hasattr(sess, "proxies") and sess.proxies:
                                p_url = sess.proxies.get("http")
                                if p_url:
                                    proxy_helper.ban_proxy(p_url)
                        print(f"  [HB] Page fetch error at offset {offset}: {e}")
                    return []

            from .progress import emit_count
            for coro in asyncio.as_completed([_fetch_page(o) for o in offsets]):
                batch = await coro
                for rev in batch:
                    reviews.append(_process_rev(rev))
                emit_count("hepsiburada", len(reviews))

    except Exception as e:
        print(f"  [HB] Fetch hatası ({sku}): {e}")

    if feature_sums:
        summary = {
            feature_names[fid]: round(feature_sums[fid] / feature_counts[fid], 1)
            for fid in feature_sums
            if feature_counts[fid] > 0
        }
        print(f"  [HB] featureStars özet ({sku}): {summary}")
        reviews.insert(0, {"is_summary": True, "data": summary, "_id": "__summary__"})

    return reviews


async def _resolve_hbcv(sku: str, sess) -> Optional[str]:
    """HBC formatındaki SKU'yu (productId) ürün sayfasını ziyaret ederek HBCV'ye çevirir."""
    if sku.startswith("HBCV"):
        return sku
    url = f"https://www.hepsiburada.com/ara?q={sku}"
    try:
        r = await sess.get(url, headers={"Accept": "text/html", "Referer": "https://www.hepsiburada.com/"}, timeout=10)
        if r.status_code == 429 or r.status_code == 403:
            if hasattr(sess, "proxies") and sess.proxies:
                p_url = sess.proxies.get("http")
                if p_url:
                    proxy_helper.ban_proxy(p_url)
            return None
        if r.status_code == 200:
            matches = re.findall(r'HBCV[A-Z0-9]+', r.text)
            if matches:
                return matches[0]
    except Exception as e:
        err = str(e)
        if "Connection" in err or "Timeout" in err or "Connect" in err:
            if hasattr(sess, "proxies") and sess.proxies:
                p_url = sess.proxies.get("http")
                if p_url:
                    proxy_helper.ban_proxy(p_url)
    return None

async def fetch_hepsiburada(product_name: str, sku: Optional[str] = None) -> list[dict]:
    """Hepsiburada API'sini kullanarak yüksek hacimli veri çeker (Multi-SKU Agrega)."""
    try:
        from curl_cffi.requests import AsyncSession
    except ImportError:
        print("  [HB] curl_cffi bulunamadı!")
        return []

    proxy = proxy_helper.get_proxy()
    print(f"  [HB] Session proxy: {proxy or 'Direkt Bağlantı'}")
    proxies = {"http": proxy, "https": proxy} if proxy else None
    
    try:
        sess = AsyncSession(impersonate="chrome120", proxies=proxies)
    except Exception as e:
        print(f"  [HB] Proxy ile session kurulamadı ({e}), direkt bağlantı deneniyor...")
        sess = AsyncSession(impersonate="chrome120")

    kf_summary = {}
    all_reviews = []
    skus = []
    try:
        # 1. SKU Keşfi — AI optimize edilmiş tek sorguyla HB'de ara
        skus = []
        # Collector zaten AI optimize edilmiş sorguyu product_name olarak geçiyor
        main_q = product_name.replace(" ", "+")
        queries = [main_q]

        seen_skus: set = set()
        for q in queries:
            try:
                r = await sess.get(
                    f"https://www.hepsiburada.com/ara?q={q}",
                    headers={"Accept": "text/html", "Referer": "https://www.hepsiburada.com/"},
                    timeout=12,
                )
                if r.status_code == 429 or r.status_code == 403:
                    if hasattr(sess, "proxies") and sess.proxies:
                        p_url = sess.proxies.get("http")
                        if p_url:
                            proxy_helper.ban_proxy(p_url)
                    continue
                if r.status_code == 200:
                    from ._search_utils import slug_matches_product

                    def _name_slug(n: str) -> str:
                        n = n.lower().translate(str.maketrans("çğıöşü", "cgiosu"))
                        return re.sub(r"[^a-z0-9]+", "-", n).strip("-")

                    # HB arama sonucu artık çift-kaçışlı JSON ürün kartları içeriyor:
                    # customerReviewCount + variantList[{sku, name, url}] aynı kartta —
                    # ürünü ADIYLA filtreleyip EN ÇOK yorumlu listingi öne alabiliyoruz.
                    # SKU, HBV (ürün) veya HBCV (varyant) formatında olabilir; Hermes
                    # API'si ikisini de kabul ediyor (HBV → 9.893 yorumlu ana listing).
                    cards = re.findall(
                        r'customerReviewCount\\*":(\d+).{0,600}?variantList\\*":\[\{\\*"sku\\*":\\*"(HB[A-Z0-9]{8,})\\*",\\*"name\\*":\\*"(.*?)\\*"',
                        r.text, re.DOTALL)
                    matched_cards, unmatched_cards = [], []
                    seen_card: set = set()
                    for cnt, s, cname in cards:
                        if s in seen_card:
                            continue
                        seen_card.add(s)
                        entry = (int(cnt), s)
                        if slug_matches_product(_name_slug(cname), product_name):
                            matched_cards.append(entry)
                        else:
                            unmatched_cards.append(entry)
                    # Tamlık: en çok yorumlu listing önce çekilsin
                    matched_cards.sort(key=lambda x: -x[0])
                    unmatched_cards.sort(key=lambda x: -x[0])
                    if matched_cards:
                        print(f"  [HB] Kart filtresi: {len(matched_cards)} spesifik / {len(seen_card)} kart; en büyük listing {matched_cards[0][0]} yorum")
                    ordered = [s for _, s in (matched_cards if matched_cards else unmatched_cards)]

                    if not ordered:
                        # Eski markup fallback: slug'lı href + gömülü ham SKU'lar
                        matched, unmatched = [], []
                        for slug, s in re.findall(r'/([\w-]+)-p-(HB[A-Z0-9]{8,})', r.text):
                            target = matched if slug_matches_product(slug, product_name) else unmatched
                            if s not in target:
                                target.append(s)
                        rest = [s for s in re.findall(r'HBC?V[A-Z0-9]{8,}', r.text)
                                if s not in matched and s not in unmatched]
                        ordered = matched if matched else (unmatched + rest)
                        if matched and (unmatched or rest):
                            print(f"  [HB] Slug filtresi (fallback): {len(matched)} spesifik / {len(matched)+len(unmatched)+len(rest)} SKU")
                    for s in ordered:
                        if s not in seen_skus:
                            seen_skus.add(s)
                            skus.append(s)
                else:
                    print(f"  [HB] Arama {r.status_code} (q={q[:30]})")
                if skus and len(skus) >= 3:
                    break
            except Exception as e:
                err = str(e)
                if "Connection" in err or "Timeout" in err or "Connect" in err:
                    if hasattr(sess, "proxies") and sess.proxies:
                        p_url = sess.proxies.get("http")
                        if p_url:
                            proxy_helper.ban_proxy(p_url)
                print(f"  [HB] Arama hatası (q={q[:30]}): {e}")
        if not skus:
            print(f"  [HB] UYARI: '{product_name}' için arama sayfasından hiç HBCV SKU bulunamadı")
        else:
            print(f"  [HB] SKU keşfi: {len(skus)} adet (tek AI optimize sorgu)")

        # 2. Verilen SKU'yu da dene (öncelikli)
        if sku:
            if sku.startswith("HBCV"):
                skus = [sku] + [s for s in skus if s != sku]
            else:
                hbcv = await _resolve_hbcv(sku, sess)
                if hbcv:
                    skus = [hbcv] + [s for s in skus if s != hbcv]
                else:
                    skus = [sku] + skus

        if not skus:
            from .url_finder import find_product_urls, extract_hb_sku
            urls = await find_product_urls(product_name)
            if urls["hepsiburada_url"]:
                found_sku = extract_hb_sku(urls["hepsiburada_url"])
                if found_sku:
                    hbcv = await _resolve_hbcv(found_sku, sess)
                    skus = [hbcv or found_sku]

        if not skus:
            print("  [HB] SKU bulunamadı")
            return []

        # 3. Yorumları Topla — SKU'lar yorum sayısına göre sıralı geldiğinden
        # ilk 5'i yeterli (ana listing + büyük satıcılar); gerisi tekil satıcı
        all_reviews = []
        fetch_tasks = [_fetch_all_pages(s, sess) for s in skus[:5]]
        results = await asyncio.gather(*fetch_tasks)
        for r_list in results:
            all_reviews.extend(r_list)
    finally:
        await sess.close()

    # 4. Dedup — sentinel'i al, tekrar eden yorumları filtrele
    kf_summary = {}
    seen_ids: set = set()
    unique = []
    for rev in all_reviews:
        if rev.get("is_summary"):
            if not kf_summary:
                kf_summary = rev.get("data", {})
            continue
        rid = rev.get("_id") or rev.get("text", "")[:60]
        if rid not in seen_ids:
            seen_ids.add(rid)
            unique.append(rev)

    if kf_summary:
        unique.insert(0, {"is_summary": True, "data": kf_summary, "_id": "__summary__"})

    print(f"  [HB] Agrega: {len(unique)} kayıt ({len(skus)} SKU) + özet")
    return unique
