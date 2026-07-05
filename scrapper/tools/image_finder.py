import re
import urllib.parse
from curl_cffi import requests as cffi_requests

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
}

_CDN_PATTERN = re.compile(r"cdn\.akakce\.com/[xzp]/")


def _extract_img_attrs(html: str) -> list[tuple[str, str]]:
    """Her <img> etiketinden (src veya data-src/data-original, alt) çiftlerini döner."""
    results = []
    for tag in re.finditer(r"<img\b([^>]*)>", html, re.IGNORECASE | re.DOTALL):
        attrs = tag.group(1)
        src = ""
        for attr in ("src", "data-src", "data-original"):
            m = re.search(rf'\b{attr}\s*=\s*["\']([^"\']+)["\']', attrs, re.IGNORECASE)
            if m:
                src = m.group(1)
                break
        alt_m = re.search(r'\balt\s*=\s*["\']([^"\']*)["\']', attrs, re.IGNORECASE)
        alt = alt_m.group(1) if alt_m else ""
        if src:
            results.append((src, alt))
    return results


def fetch_real_product_image(product_name: str) -> str:
    """
    curl_cffi kullanarak Akakce arama sonuclarindan urunun gercek gorselini bulur.
    Bulunamazsa Bing Image proxy URL'sini fallback olarak doner.
    """
    print(f"  [ImageFinder] Urun gorseli araniyor: {product_name}...")

    clean_name = product_name
    if clean_name.lower().startswith("1phone"):
        clean_name = "iPhone" + clean_name[6:]

    image_url = ""
    try:
        search_url = f"https://www.akakce.com/arama/?q={clean_name.replace(' ', '+')}"
        with cffi_requests.Session(impersonate="chrome120") as session:
            r = session.get(search_url, headers=_HEADERS, timeout=10)

        if r.status_code == 200:
            keywords = [w.lower() for w in clean_name.split() if len(w) >= 2]
            candidate_images = []

            for src, alt in _extract_img_attrs(r.text):
                if _CDN_PATTERN.search(src):
                    alt_lower = alt.lower()
                    match_count = sum(1 for kw in keywords if kw in alt_lower)
                    if match_count > 0:
                        candidate_images.append((match_count, src))

            if candidate_images:
                candidate_images.sort(key=lambda x: x[0], reverse=True)
                image_url = candidate_images[0][1]
        else:
            print(f"  [ImageFinder] Akakce HTTP {r.status_code} — Bing'e geciliyor")
    except Exception as e:
        print(f"  [ImageFinder] Akakce gorsel arama hatasi (Bing'e geciliyor): {e}")

    if not image_url:
        encoded_name = urllib.parse.quote(clean_name)
        image_url = f"https://tse2.mm.bing.net/th?q={encoded_name}+official+product+render"
        print(f"  [ImageFinder] Fallback gorsel atandi: {image_url}")
    else:
        print(f"  [ImageFinder] Gercek gorsel basariyla atandi: {image_url}")

    return image_url
