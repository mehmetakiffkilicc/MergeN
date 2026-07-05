"""
Ürün platform URL'si bulucu — curl_cffi + Tavily hibrit.
"""
import os
import re
import asyncio
from typing import Optional


async def _search_tavily(query: str, domain: str, url_pattern: str, max_results: int = 5) -> Optional[str]:
    """Tek bir domain için Tavily'de ürün URL'si ara."""
    from ._tavily import search as tavily_search
    loop = asyncio.get_event_loop()
    try:
        resp = await loop.run_in_executor(None, lambda: tavily_search(
            query=query,
            max_results=max_results,
            include_domains=[domain],
            search_depth="basic",
        ))
        for r in resp.get("results", []):
            url: str = r.get("url", "")
            if domain in url and re.search(url_pattern, url):
                return url
    except:
        pass
    return None


async def find_product_urls(product_name: str) -> dict:
    """Trendyol ve Hepsiburada ürün sayfası URL'lerini döner (Tavily API)."""
    
    result: dict = {"trendyol_url": None, "hepsiburada_url": None}

    print(f"  [URL Finder] Tavily ile platform URL'leri aranıyor...")
    
    tasks = [
        _search_tavily(product_name, "trendyol.com", r"-p-\d+"),
        _search_tavily(product_name, "hepsiburada.com", r"-p-HBCV[A-Z0-9]+"),
        _search_tavily(product_name, "hepsiburada.com", r"-pm-HBC"),
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    for url in results:
        if isinstance(url, Exception) or not url:
            continue
        if "trendyol.com" in url and not result["trendyol_url"]:
            result["trendyol_url"] = url
        if "hepsiburada.com" in url and not result["hepsiburada_url"]:
            # HBCV formatını HBC'ye tercih et
            if re.search(r"-p-HBCV", url):
                result["hepsiburada_url"] = url
            elif "-pm-" in url and not result["hepsiburada_url"]:
                result["hepsiburada_url"] = url

    return result


def extract_trendyol_id(url: str) -> Optional[str]:
    m = re.search(r"-p-(\d+)", url)
    return m.group(1) if m else None


def extract_hb_sku(url: str) -> Optional[str]:
    # Ürün listing: -p-HBCV... (tercih edilir)
    m = re.search(r"-p-(HBCV[A-Z0-9]+)", url)
    if m:
        return m.group(1)
    # Satıcı listing: -pm-HBC... (fallback, HBC prefixli olan)
    m = re.search(r"(?:-pm-|-p-)(HBC[A-Z0-9]+)", url)
    if not m:
        return None
    sku = m.group(1)
    # HBC.. ise HBCV.. olabilir mi diye işaretle (hepsiburada.py _resolve_hbcv ile düzeltecek)
    return sku
