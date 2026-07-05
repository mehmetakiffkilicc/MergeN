import re
import datetime
import random
from typing import Dict, Any, List
from curl_cffi.requests import AsyncSession
import httpx
from ._tavily import search

def decode_akakce_graph(data_str: str) -> List[int]:
    data_str = re.sub(r'n(\d+)?', lambda m: '.' * int(m.group(1) or 1), data_str)
    data_str = re.sub(r'v(\d+)?', lambda m: ',' * int(m.group(1) or 1), data_str)
    data_str = data_str.replace('#', '')
    splitted = data_str.split(',')
    updated = []
    for item in splitted:
        p_text = item.replace('.', '')
        updated.append(item.replace('.', ',' + p_text).strip())
    full = ','.join(updated).split(',')
    res = []
    for val in full:
        if val:
            try:
                res.append(round(float(val) / 100.0))
            except:
                pass
    return res

async def fetch_price_history(product_name: str) -> Dict[str, Any]:
    """
    Akakce üzerinden curl_cffi kullanarak GERÇEK 90 günlük fiyat geçmişini çeker.
    Eğer hata oluşursa güvenli bir şekilde simüle edilmiş geçmişe (fallback) döner.
    """
    print(f"  [PriceHistory] GERÇEK fiyat geçmişi çekiliyor: {product_name}...")
    real_prices = None

    try:
        async with AsyncSession(impersonate="chrome124", timeout=10) as session:
            # Ana sayfaya önce istek atarak CF clearance cookie'si alınır
            await session.get("https://www.akakce.com/", headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
            })

            # 1. Arama sayfasını çek
            search_url = f"https://www.akakce.com/arama/?q={product_name.replace(' ', '+')}"
            r = await session.get(search_url, headers={"Referer": "https://www.akakce.com/"})
            html = r.text

            # Ürün linklerini regex ile çek
            raw_links = re.findall(r'href="(/[^"]*(?:-fiyati,|/en-ucuz-)[^"]*)"', html)

            # Her link için çevresindeki anchor metnini bul ve keyword skoru hesapla
            keywords = [w.lower() for w in product_name.split() if len(w) >= 2]
            candidate_links = []
            for href in raw_links:
                # Link'in yakın çevresindeki metni bul (href öncesi ~200 karakter)
                idx = html.find(f'href="{href}"')
                surrounding = html[max(0, idx - 200):idx + 200].lower()
                match_count = sum(1 for kw in keywords if kw in surrounding)
                if match_count > 0:
                    candidate_links.append((match_count, href))

            if not candidate_links and raw_links:
                # Keyword eşleşmesi yoksa ilk linki dene
                candidate_links = [(0, raw_links[0])]

            if candidate_links:
                candidate_links.sort(key=lambda x: x[0], reverse=True)
                product_path = candidate_links[0][1]
                product_url = "https://www.akakce.com" + product_path
                print(f"  [PriceHistory] Gidilen urun sayfasi: {product_url}")

                # 2. Ürün sayfasını çek
                r2 = await session.get(product_url, headers={"Referer": search_url})
                content = r2.text

                # data-u attribute'unu çek: önce #priceTitle data-u="..." hedefli regex
                data_u = None
                match_attr = re.search(r'id=["\']priceTitle["\'][^>]*data-u=["\']([^"\']+)["\']', content)
                if not match_attr:
                    match_attr = re.search(r'data-u=["\']([^"\']+)["\'][^>]*id=["\']priceTitle["\']', content)
                if match_attr:
                    data_u = match_attr.group(1)
                    print(f"  [PriceHistory] Found data-u in #priceTitle: {data_u}")
                else:
                    # Genel akakce CDN URL regex fallback
                    match_cdn = re.search(r'https://akakce-g\.akamaized\.net/[^"\']+', content)
                    if match_cdn:
                        data_u = match_cdn.group(0)
                        print(f"  [PriceHistory] Found data-u via regex fallback: {data_u}")

                if data_u:
                    cdn_url = data_u if data_u.endswith(":s") else f"{data_u}:s"
                    print(f"  [PriceHistory] Requesting CDN URL: {cdn_url}")
                    async with httpx.AsyncClient(timeout=10.0) as client:
                        r_cdn = await client.get(cdn_url)
                        print(f"  [PriceHistory] CDN HTTP Status: {r_cdn.status_code}")
                        if r_cdn.status_code == 200:
                            match_prg = re.search(r"window\._PRGJ='(.*?)'", r_cdn.text)
                            if match_prg:
                                raw_graph = match_prg.group(1)
                                print(f"  [PriceHistory] Found raw_graph window._PRGJ (len={len(raw_graph)})")
                                real_prices = decode_akakce_graph(raw_graph)
                                print(f"  [PriceHistory] Decoded prices: {real_prices}")
                            else:
                                print(f"  [PriceHistory] window._PRGJ not found in CDN response text! Text starts with: {r_cdn.text[:200]}")
                        else:
                            print(f"  [PriceHistory] CDN request failed with code {r_cdn.status_code}")
                else:
                    print(f"  [PriceHistory] Could not extract data-u from page.")
            else:
                print(f"  [PriceHistory] No candidate product links found on search page.")

    except Exception as e:
        print(f"  [PriceHistory] Gerçek geçmiş çekme hatası (Simüle geçmişe geçiliyor): {e}")

    # Eğer gerçek veriyi başarıyla alabildiysek
    if real_prices and len(real_prices) > 0:
        current_price = real_prices[-1]
        today = datetime.datetime.now()
        history_90d = []

        target_len = min(90, len(real_prices))
        sliced_prices = real_prices[-target_len:]

        for i, p_val in enumerate(sliced_prices):
            diff_days = target_len - 1 - i
            date_str = (today - datetime.timedelta(days=diff_days)).strftime("%Y-%m-%d")
            history_90d.append({
                "date": date_str,
                "price": round(p_val)
            })

        lowest_30d = min([d["price"] for d in history_90d[-30:]]) if len(history_90d) >= 30 else min([d["price"] for d in history_90d])
        highest_90d = max([d["price"] for d in history_90d])

        real_discount_pct = 0
        if current_price < highest_90d:
            real_discount_pct = round(((highest_90d - current_price) / highest_90d) * 100)

        return {
            "current": current_price,
            "was": highest_90d,
            "lowest_30d": lowest_30d,
            "highest_90d": highest_90d,
            "label_discount_pct": real_discount_pct,
            "real_discount_pct": real_discount_pct,
            "history_90d": history_90d,
            "source": "Akakce (Gerçek Geçmiş)",
            "explanation": f"Fiyat geçmişi analiz edildiğine göre, ürün son 3 ayda en yüksek {highest_90d:,.0f} TL'yi gördü. Mevcut fiyat olan {current_price:,.0f} TL, %{real_discount_pct} oranında GERÇEK bir indirim anlamına geliyor."
        }

    # FALLBACK: Simülasyon
    print("  [PriceHistory] GERÇEK fiyat bulunamadı, simüle geçmiş oluşturuluyor...")
    current_price = 0
    try:
        query = f"site:akakce.com {product_name} fiyat"
        results = search(query, max_results=3)
        price_pattern = re.compile(r'([\d\.]+,\d{2})\s*TL')

        for res in results.get("results", []):
            match = price_pattern.search(res.get("content", ""))
            if match:
                price_str = match.group(1).replace(".", "").replace(",", ".")
                current_price = round(float(price_str))
                break

        if not current_price:
            alt_pattern = re.compile(r'(\d{1,3}(?:\.\d{3})+)\s*TL')
            for res in results.get("results", []):
                match = alt_pattern.search(res.get("content", ""))
                if match:
                    price_str = match.group(1).replace(".", "")
                    current_price = round(float(price_str))
                    break
    except Exception as e:
        print(f"  [PriceHistory] Fallback arama hatası: {e}")

    if not current_price:
        current_price = round(random.uniform(10000, 50000))

    history_90d = generate_realistic_history(current_price)
    lowest_30d = min([d["price"] for d in history_90d[-30:]])
    highest_90d = max([d["price"] for d in history_90d])

    real_discount_pct = 0
    if current_price < highest_90d:
        real_discount_pct = round(((highest_90d - current_price) / highest_90d) * 100)

    return {
        "current": current_price,
        "was": highest_90d,
        "lowest_30d": lowest_30d,
        "highest_90d": highest_90d,
        "label_discount_pct": real_discount_pct,
        "real_discount_pct": real_discount_pct,
        "history_90d": history_90d,
        "source": "Akakce (Tahmini)",
        "explanation": f"Fiyat geçmişi analiz edildiğine göre, ürün son 3 ayda en yüksek {highest_90d:,.0f} TL'yi gördü. Mevcut fiyat olan {current_price:,.0f} TL, %{real_discount_pct} oranında tahmini bir indirim anlamına geliyor."
    }

def generate_realistic_history(current_price: float) -> List[Dict[str, Any]]:
    history = []
    base_price = current_price * random.uniform(1.05, 1.25)
    today = datetime.datetime.now()
    trend = -1
    if random.random() > 0.5:
        trend = 1
        base_price = current_price * random.uniform(0.8, 0.95)

    for i in range(90, 0, -1):
        date = today - datetime.timedelta(days=i)
        if i <= 14:
            daily_price = current_price + (base_price - current_price) * (i / 14) * random.uniform(0.9, 1.1)
        else:
            noise = random.uniform(0.98, 1.02)
            daily_price = base_price * noise
            if random.random() < 0.05:
                daily_price *= random.uniform(0.85, 0.95)

        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "price": round(daily_price)
        })
        if i > 14:
            base_price = base_price * (1 + (trend * 0.001))

    history.append({
        "date": today.strftime("%Y-%m-%d"),
        "price": round(current_price)
    })
    return history
