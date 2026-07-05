"""
Trendyol yorum toplayıcı.
- curl_cffi ile Cloudflare bypass (httpx 403 döner)
- URL'den elde edilen ID sıfır yorum dönerse Trendyol arama sayfasından gerçek IDs bulur
- Tüm varyantların yorumları toplanır
- Playwright YOK
"""
import asyncio
import os
import re
from datetime import datetime, timezone
from typing import Optional
from tools.youtube_helper import YoutubeHelper

proxy_helper = YoutubeHelper()

REVIEW_API = (
    "https://apigw.trendyol.com/discovery-storefront-trproductgw-service"
    "/api/review-read/product-reviews/detailed"
)
_API_HEADERS = {
    "x-domain": "www.trendyol.com",
    "x-platform": "web",
    "x-language-id": "1",
    "x-country-id": "1",
    "Accept": "application/json",
}


# ---------------------------------------------------------------------------
# Dahili yardımcılar
# ---------------------------------------------------------------------------

def _parse_reviews(data: dict) -> tuple[list[dict], int]:
    """(reviews_list, total_pages) döner."""
    result = data.get("result", {})
    summary = result.get("summary", {})
    total_pages = summary.get("totalPages", 0) or 1
    total_count = summary.get("totalCommentCount", 0)

    items = result.get("reviews", [])
    reviews = []
    for item in items:
        text = (item.get("comment") or "").strip()
        if len(text) >= 10:
            # createdAt alanı milisaniye Unix timestamp olarak gelir
            ts = item.get("createdAt") or item.get("lastModifiedAt")
            date = (
                datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
                if ts else None
            )
            photos = []
            mf = item.get("mediaFiles", [])
            if mf:
                photos = [p["url"] for p in mf if p.get("url")]
            reviews.append({
                "text": text,
                "rating": item.get("rate"),
                "date": date,
                "likes": item.get("likesCount", 0),
                "source": "trendyol",
                "photos": photos,
            })
    # total_count eksik/0 gelse bile sayfa 0'da yorum varsa total_pages'i koru
    return reviews, total_pages if (total_count > 0 or reviews) else 0


async def _session(proxy: Optional[str] = None, impersonate: str = "chrome120"):
    """curl_cffi async session — CF bypass için Chrome TLS fingerprint."""
    from curl_cffi.requests import AsyncSession
    proxies = None
    if proxy:
        proxies = {"http": proxy, "https": proxy}
    session = AsyncSession(impersonate=impersonate, proxies=proxies)
    # Ana sayfayı ziyaret et — CF clearance cookie'si alır
    try:
        await session.get("https://www.trendyol.com/", timeout=8)
    except Exception:
        pass
    return session


# Varsayılan 100 sayfa (5000 yorum/listing) — veri tamlığı öncelikli;
# sayfalar paralel çekildiğinden süre maliyeti düşüktür. Hız için env ile düşürülebilir.
MAX_REVIEW_PAGES = int(os.getenv("MAX_REVIEW_PAGES", "100"))


async def _fetch_all_pages(content_id: str, session, max_pages: int = None) -> list[dict]:
    """Tek bir contentId için tüm sayfalardaki yorumları çeker."""
    if max_pages is None:
        max_pages = MAX_REVIEW_PAGES
    url0 = f"{REVIEW_API}?contentId={content_id}&page=0&pageSize=50&channelId=1"
    try:
        r0 = await session.get(url0, headers=_API_HEADERS, timeout=10)
        print(f"  [Trendyol] Review API response status: {r0.status_code} for ID: {content_id}")
        if r0.status_code == 429 or r0.status_code == 403:
            if hasattr(session, "proxies") and session.proxies:
                p_url = session.proxies.get("http")
                if p_url:
                    proxy_helper.ban_proxy(p_url)
            return []
        if r0.status_code != 200:
            return []
    except Exception as e:
        err = str(e)
        if "Connection" in err or "Timeout" in err or "Connect" in err:
            if hasattr(session, "proxies") and session.proxies:
                p_url = session.proxies.get("http")
                if p_url:
                    proxy_helper.ban_proxy(p_url)
        print(f"  [Trendyol] Review API fetch error for ID {content_id}: {e}")
        return []

    try:
        data = r0.json()
    except Exception as e:
        print(f"  [Trendyol] Review API JSON decode error for ID {content_id}: {e}")
        return []
    reviews, total_pages = _parse_reviews(data)
    print(f"  [Trendyol] Parsed {len(reviews)} reviews out of total pages {total_pages} for ID: {content_id}")
    if total_pages == 0:
        return []

    pages_left = min(total_pages, max_pages) - 1
    if pages_left > 0:
        from .progress import emit_count
        tasks = [
            session.get(
                f"{REVIEW_API}?contentId={content_id}&page={p}&pageSize=50&channelId=1",
                headers=_API_HEADERS,
                timeout=10,
            )
            for p in range(1, pages_left + 1)
        ]
        for coro in asyncio.as_completed(tasks):
            resp = await coro
            if isinstance(resp, Exception):
                err = str(resp)
                if "Connection" in err or "Timeout" in err or "Connect" in err:
                    if hasattr(session, "proxies") and session.proxies:
                        p_url = session.proxies.get("http")
                        if p_url:
                            proxy_helper.ban_proxy(p_url)
                continue
            if resp.status_code == 429 or resp.status_code == 403:
                if hasattr(session, "proxies") and session.proxies:
                    p_url = session.proxies.get("http")
                    if p_url:
                        proxy_helper.ban_proxy(p_url)
                continue
            if resp.status_code == 200:
                try:
                    page_reviews, _ = _parse_reviews(resp.json())
                except Exception:
                    continue
                reviews.extend(page_reviews)
                emit_count("trendyol", len(reviews))

    return reviews


async def _find_product_ids_from_search(product_name: str, session, max_ids: int = 10) -> list[str]:
    """
    Trendyol arama sayfasından ürün ID'lerini keşfeder.
    
    AI tarafından optimize edilmiş sorgu geldiği için tek ana sorgu + 
    1 kısa varyant kullanılır (toplam 2 sorgu × 2 sayfa = 4 HTTP isteği).
    Eski yöntem: 4+ varyant × 2 sayfa = 8+ HTTP isteği.
    """
    # Sorgu+sayfa bazında sıralı sonuç tut — async yarışta jenerik sorgu
    # sonuçlarının spesifik sorgunun önüne geçmesini engeller
    page_results: dict[tuple, list[str]] = {}
    page_slugs: dict[str, str] = {}

    # Ana sorgu (AI optimize edilmiş) + kısa varyant
    main_q = product_name.replace(" ", "+")
    queries = [main_q]

    # Eğer sorgu 3+ kelimeyse, kısa bir varyant da ekle.
    # Model kodu içeren token varsa onu tercih et (örn "FX608JM-RV073" → "FX608JM"):
    # jenerik "marka+seri" sorgusu alakasız listinglerle ilk 10 ID'yi dolduruyor.
    words = product_name.split()
    if len(words) > 2:
        model_toks = [w for w in words if re.search(r"[A-Za-z]\d|\d[A-Za-z]", w)]
        model_tok = max(model_toks, key=len) if model_toks else None
        if model_tok and len(model_tok.split("-")[0]) >= 4:
            short_q = model_tok.split("-")[0]
        else:
            short_q = "+".join(words[:2])
        if short_q != main_q:
            queries.append(short_q)

    async def _fetch_page(qi: int, q: str, page_num: int) -> None:
        try:
            resp = await session.get(
                f"https://www.trendyol.com/sr?q={q}&pi={page_num}",
                headers={"Accept": "text/html"},
                timeout=12,
            )
            print(f"  [Trendyol] Search response status: {resp.status_code} for query: {q} page: {page_num}")
            if resp.status_code == 429 or resp.status_code == 403:
                if hasattr(session, "proxies") and session.proxies:
                    p_url = session.proxies.get("http")
                    if p_url:
                        proxy_helper.ban_proxy(p_url)
                return
            if resp.status_code != 200:
                print(f"  [Trendyol] Arama {resp.status_code} (q={q[:30]})")
                return
            html = resp.text
            ids: list[str] = []
            slugs: dict[str, str] = {}
            for slug, pid in re.findall(r"/([\w-]+)-p-(\d+)", html):
                if pid not in ids:
                    ids.append(pid)
                    slugs[pid] = slug.lower()
            for pid in re.findall(r'"(?:contentId|productId|id)":\s*(\d{6,})', html):
                if pid not in ids:
                    ids.append(pid)
            page_results[(qi, page_num)] = ids
            page_slugs.update(slugs)
        except Exception as e:
            err = str(e)
            if "Connection" in err or "Timeout" in err or "Connect" in err:
                if hasattr(session, "proxies") and session.proxies:
                    p_url = session.proxies.get("http")
                    if p_url:
                        proxy_helper.ban_proxy(p_url)
            print(f"  [Trendyol] Arama hatası (q={q[:30]} pi={page_num}): {e}")

    tasks = [_fetch_page(qi, q, p) for qi, q in enumerate(queries) for p in range(1, 3)]
    await asyncio.gather(*tasks)

    # Deterministik birleştirme: önce ana (spesifik) sorgu, sonra kısa varyant;
    # her sorguda sayfa sırası korunur
    seen: set = set()
    merged: list[str] = []
    for qi in range(len(queries)):
        for p in range(1, 3):
            for pid in page_results.get((qi, p), []):
                if pid not in seen:
                    seen.add(pid)
                    merged.append(pid)

    # Slug filtresi: model kodu eşleşmesi (FX608JM), kelime+rakam bigramı
    # (Note 13 ≠ Note 13 Pro) ve aksesuar dışlama (kılıf/kapak) — yanlış
    # ürünün yorumlarının karışmasını önler
    from ._search_utils import slug_matches_product
    preferred = [pid for pid in merged
                 if pid in page_slugs and slug_matches_product(page_slugs[pid], product_name)]
    # En az 1 spesifik eşleşme varsa yalnızca onları kullan — eşleşmeyenler
    # kardeş model/aksesuar listingleridir, yorumları hedef ürünü kirletir
    unique_ids = preferred if preferred else merged
    if preferred and len(preferred) < len(merged):
        print(f"  [Trendyol] Model filtresi: {len(preferred)} spesifik / {len(merged)} toplam ID")

    if not unique_ids:
        print(f"  [Trendyol] UYARI: '{product_name}' için arama sayfasından hiç ürün ID'si bulunamadı — Tavily fallback devrede")
    else:
        print(f"  [Trendyol] Arama: {len(unique_ids)} ID bulundu ({len(queries)} sorgu, {len(tasks)} istek)")

    return unique_ids[:max_ids]


# ---------------------------------------------------------------------------
# Ana fonksiyon
# ---------------------------------------------------------------------------

async def fetch_trendyol(
    product_name: str, product_id: Optional[str] = None
) -> list[dict]:
    """
    1. curl_cffi ile Trendyol session kur (CF bypass)
    2. URL'den gelen product_id'yi dene
    3. 0 yorum dönerse arama sayfasından gerçek IDs bul
    4. Bulunan tüm varyant IDs için yorumları topla
    5. Hepsi başarısızsa Tavily snippets
    """
    loop = asyncio.get_event_loop()

    try:
        proxy = proxy_helper.get_proxy()
        print(f"  [Trendyol] Session proxy: {proxy or 'Direkt Bağlantı'}")
        sess = await _session(proxy=proxy)
    except ImportError:
        print("  [Trendyol] curl_cffi yok — Tavily fallback")
        return await _fetch_tavily(product_name)
    except Exception as e:
        print(f"  [Trendyol] Proxy ile session kurulamadı ({e}), direkt bağlantı deneniyor...")
        sess = await _session(proxy=None)

    all_reviews: list[dict] = []
    tried_ids: set = set()

    try:
        # --- Adım 1: URL'den gelen ID'yi dene ---
        # (±1 komşu ID denemesi kaldırıldı: katalogda komşu ID'ler
        # alakasız ürünlerdir, yanlış ürünün yorumları karışabiliyordu)
        if product_id:
            tried_ids.add(str(product_id))
            r = await _fetch_all_pages(str(product_id), sess)
            if isinstance(r, list) and r:
                all_reviews.extend(r)

        # --- Adım 2: Tüm varyant ID'lerini bul ve dene ---
        found_ids = await _find_product_ids_from_search(product_name, sess, max_ids=10)

        if not found_ids:
            # Paralel /sr istekleri CF rate-limit 403'e takılabiliyor —
            # kısa bekleme + taze session (farklı fingerprint) ile tek retry
            print("  [Trendyol] Arama boş döndü — 2s bekleyip taze session ile yeniden deneniyor")
            await asyncio.sleep(2)
            await sess.close()
            sess = await _session(proxy=None, impersonate="chrome124")
            found_ids = await _find_product_ids_from_search(product_name, sess, max_ids=10)

        if found_ids:
            tasks = [
                _fetch_all_pages(cid, sess)
                for cid in found_ids
                if cid not in tried_ids
            ]
            tried_ids.update(found_ids)
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, list):
                    all_reviews.extend(r)
    finally:
        await sess.close()

    # Duplicate temizle
    seen_texts: set = set()
    unique_reviews = []
    for rev in all_reviews:
        key = rev.get("text", "")[:80]
        if key not in seen_texts:
            seen_texts.add(key)
            unique_reviews.append(rev)

    if unique_reviews:
        print(f"  [Trendyol] API: {len(unique_reviews)} yorum ({len(tried_ids)} ID denendi)")
        return unique_reviews

    # --- Adım 3: Tavily fallback ---
    fallback = await _fetch_tavily(product_name)
    return fallback


async def _fetch_tavily(product_name: str) -> list[dict]:
    """Son çare: Tavily snippet'ları."""
    from ._tavily import search as tavily_search
    loop = asyncio.get_event_loop()

    def _search() -> list[dict]:
        results = []
        seen: set = set()
        # Ürün adından alaka tokenleri üret (2+ karakter, sayı veya harf)
        name_tokens = [w.lower() for w in re.split(r'\W+', product_name) if len(w) >= 2]
        try:
            resp = tavily_search(
                query=f"{product_name} kullanıcı yorumları",
                max_results=20,
                include_domains=["trendyol.com"],
            )
            for r in resp.get("results", []):
                url = r.get("url", "")
                if url in seen:
                    continue
                seen.add(url)
                content = r.get("content", "").strip()
                words = content.split()
                # Minimum 15 kelime ve ürün tokenlerinden en az 1'i eşleşmeli
                if len(words) < 15:
                    continue
                content_lower = content.lower()
                if not any(tok in content_lower for tok in name_tokens):
                    continue
                results.append({
                    "text": content,
                    "rating": None,
                    "date": None,
                    "source": "trendyol",
                    "is_snippet": True,
                    "url": url,
                })
        except Exception as e:
            print(f"  [Trendyol] Tavily hatası: {e}")
        return results

    reviews = await loop.run_in_executor(None, _search)
    print(f"  [Trendyol] Tavily fallback: {len(reviews)} snippet")
    return reviews
