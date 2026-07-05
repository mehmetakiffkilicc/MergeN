"""
Akıllı Ürün Sorgusu — Gemini AI ile optimal arama terimleri oluşturur.

PERFORMANS KRİTİK: Gemini çağrısı max 6 saniye — başarısızsa anında fallback.
Heuristik her zaman ~0ms'de hazır, AI sonucu gelirse refine eder.
"""

import asyncio
import json
import os
import re
import sys
from typing import Optional


def _progress(msg: str) -> None:
    """Stderr'e flush'lı yaz — SSE event olarak frontend'e iletilir."""
    print(msg, file=sys.stderr, flush=True)


async def resolve_smart_query(raw_query: str) -> dict:
    """
    AI ile optimal arama sorgusu belirler.
    Max 6 saniye timeout — başarısızsa anında heuristik fallback.
    """
    if raw_query.startswith("http://") or raw_query.startswith("https://"):
        return _fallback_from_url(raw_query)

    _progress(f"  [SmartQuery] Ürün sorgusu çözümleniyor: {raw_query}")

    # Heuristik'i hemen hazırla (0ms)
    fallback = _heuristic_fallback(raw_query)

    # Gemini'yi 6 saniye timeout ile dene
    try:
        result = await asyncio.wait_for(_ask_gemini(raw_query), timeout=6.0)
        if result and result.get("search_term"):
            _progress(f"  [SmartQuery] AI çözüm başarılı: {result.get('search_term', '?')}")
            return result
    except asyncio.TimeoutError:
        _progress("  [SmartQuery] Gemini timeout (6s) — heuristik kullanılıyor")
    except Exception as e:
        _progress(f"  [SmartQuery] Gemini hatası: {e} — heuristik kullanılıyor")

    _progress(f"  [SmartQuery] Heuristik sorgu: {fallback.get('search_term', '?')}")
    return fallback


async def _ask_gemini(raw_query: str) -> Optional[dict]:
    """Gemini Flash ile optimal arama sorgusunu belirle."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None

    import httpx

    prompt = f"""Sen bir e-ticaret ürün arama uzmanısın. Kullanıcının yazdığı ürün sorgusunu analiz et ve aşağıdaki bilgileri JSON formatında döndür.

Kullanıcı Sorgusu: "{raw_query}"

Kurallar:
1. search_term: Trendyol ve Hepsiburada'da aratıldığında EN ÇOK sonuç döndürecek, kısa ve öz arama terimi olmalı.
2. canonical_name: Ürünün tam resmi adı.
3. model_code: Varsa kısa model kodu (ör: XM5, A15, Pro 2).
4. brand: Marka adı.
5. forum_query: Türkçe forumlarda (Technopat, DonanımHaber) aranacak terim.
6. trendyol_query: Trendyol'da aratılacak en iyi terim.
7. hb_query: Hepsiburada'da aratılacak en iyi terim.

Sadece JSON döndür:
{{"canonical_name": "...", "search_term": "...", "model_code": "...", "brand": "...", "forum_query": "...", "trendyol_query": "...", "hb_query": "..."}}"""

    model = os.getenv("GEMINI_SMART_MODEL", "gemini-2.5-flash")

    async with httpx.AsyncClient(timeout=6) as client:
        resp = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
            params={"key": api_key},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.1,
                    # Düşünme tokenları maxOutputTokens'a dahil — thinking kapalı
                    # olmazsa JSON 800 token'da kesilip parse hatası veriyor
                    "maxOutputTokens": 2048,
                    "responseMimeType": "application/json",
                    "thinkingConfig": {"thinkingBudget": 0},
                },
            },
        )
        if resp.status_code != 200:
            print(f"  [SmartQuery] API hata {resp.status_code}: {resp.text[:200]}")
            return None

        data = resp.json()
        text = (
            data.get("candidates", [{}])[0]
            .get("content", {})
            .get("parts", [{}])[0]
            .get("text", "")
        )
        text = re.sub(r"^```json\s*", "", text.strip())
        text = re.sub(r"\s*```$", "", text.strip())
        if not text.strip():
            return None
        result = json.loads(text)

        return {
            "canonical_name": result.get("canonical_name", raw_query),
            "search_term": result.get("search_term", raw_query),
            "model_code": result.get("model_code", ""),
            "brand": result.get("brand", ""),
            "forum_query": result.get("forum_query", raw_query),
            "trendyol_query": result.get("trendyol_query", result.get("search_term", raw_query)),
            "hb_query": result.get("hb_query", result.get("search_term", raw_query)),
        }


def _heuristic_fallback(raw_query: str) -> dict:
    """AI kullanılamıyorsa basit heuristik (0ms)."""
    words = raw_query.split()
    stop = {"gaming", "edition", "plus", "max", "ultra", "series", "new", "gen", "special",
            "limited", "version", "türkiye", "turkey", "inceleme", "review", "yorum"}
    clean_words = [w for w in words if w.lower() not in stop]
    search_term = " ".join(clean_words) if len(clean_words) >= 2 else raw_query

    model_codes = re.findall(r'\b[A-Z][A-Z0-9\-]{1,}\b', raw_query)
    model_code = ""
    for mc in model_codes:
        if re.search(r'[0-9]', mc):
            model_code = mc
            break

    brand = words[0] if words else ""

    return {
        "canonical_name": raw_query,
        "search_term": search_term,
        "model_code": model_code,
        "brand": brand,
        "forum_query": raw_query,
        "trendyol_query": search_term,
        "hb_query": search_term,
    }


def _fallback_from_url(url: str) -> dict:
    """URL girdisi için ürün adını URL'den çıkar."""
    name = url
    for domain in ["trendyol.com", "hepsiburada.com"]:
        if domain in url:
            try:
                path = url.split(domain)[-1].split("?")[0]
                parts = [p for p in path.split("/") if p]
                if parts:
                    segment = parts[-1]
                    if "-p-" in segment:
                        segment = segment.split("-p-")[0]
                    elif "-pm-" in segment:
                        segment = segment.split("-pm-")[0]
                    name = segment.replace("-", " ").strip()
            except:
                pass
            break

    return {
        "canonical_name": name,
        "search_term": name,
        "model_code": "",
        "brand": name.split()[0] if name.split() else "",
        "forum_query": name,
        "trendyol_query": name,
        "hb_query": name,
        "_source_url": url,
    }


def _model_tokens(term: str) -> set:
    """Rakam+harf karışımlı model tokenlarını çıkarır (örn FX608JM, RV073)."""
    return {
        part.lower()
        for w in term.split()
        if re.search(r"[A-Za-z]\d|\d[A-Za-z]", w)
        for part in w.split("-")
        if len(part) >= 4
    }


async def find_all_platform_urls(search_term: str, validate_name: str = None) -> dict:
    """
    Tek bir Tavily çağrısıyla hem Trendyol hem Hepsiburada URL'lerini bul.

    Üründe model kodu varsa URL slug'ı bu kodu içermek zorundadır —
    Tavily bazen kardeş modeli (örn FX608JH ≠ FX608JM) döndürüyor ve
    yanlış ürünün yorum/QA'sı pipeline'a karışıyor.
    validate_name: doğrulama tokenları için orijinal ürün adı
    (AI search_term modeli genelleştirebildiği için ayrı geçilir).
    """
    from ._tavily import search as tavily_search

    result = {"trendyol_url": None, "hepsiburada_url": None}
    loop = asyncio.get_event_loop()
    _name_for_validation = validate_name or search_term

    def _slug_ok(url: str) -> bool:
        from ._search_utils import slug_matches_product
        try:
            path = url.split("?")[0].rstrip("/").split("/")[-1]
        except Exception:
            return True
        return slug_matches_product(path, _name_for_validation)

    _progress(f"  [URL] Tavily ile platform URL'leri aranıyor...")

    try:
        resp = await loop.run_in_executor(
            None,
            lambda: tavily_search(
                query=f"{search_term} satın al",
                max_results=10,
                include_domains=["trendyol.com", "hepsiburada.com"],
                search_depth="basic",
            ),
        )
        for r in resp.get("results", []):
            url = r.get("url", "")
            if not _slug_ok(url):
                continue
            if "trendyol.com" in url and not result["trendyol_url"]:
                if re.search(r"-p-\d+", url):
                    result["trendyol_url"] = url
            if "hepsiburada.com" in url and not result["hepsiburada_url"]:
                if re.search(r"-p-HBCV[A-Z0-9]+|-pm-HBC", url):
                    result["hepsiburada_url"] = url

        found = sum(1 for v in result.values() if v)
        _progress(f"  [URL] {found}/2 platform URL'si bulundu")
    except Exception as e:
        _progress(f"  [URL] Tavily URL keşif hatası: {e}")

    return result
