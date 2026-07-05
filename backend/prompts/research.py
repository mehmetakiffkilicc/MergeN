import re
from typing import NamedTuple


# ---------------------------------------------------------------------------
# Ürün adı analizi
# ---------------------------------------------------------------------------

class ProductNameAnalysis(NamedTuple):
    """Ürün adından çıkarılan yapısal bilgi."""
    core_name: str          # "ASUS TUF Gaming A15"
    model_code: str         # "FA506NCG" (kısa model kodu)
    model_code_full: str    # "FA506NCG-HN206" (tam model kodu)
    short_names: list[str]  # ["TUF A15", "TUF Gaming A15", "FA506"]
    brand: str              # "ASUS"


# Tanınan markalar
_BRANDS = {
    "asus", "acer", "lenovo", "hp", "msi", "monster", "casper", "huawei",
    "apple", "samsung", "lg", "dell", "toshiba", "sony", "xiaomi", "realme",
    "oppo", "google", "motorola", "nokia", "oneplus", "jbl", "sony",
    "sennheiser", "bose", "anker", "logitech", "razer", "corsair",
    "nvidia", "asus",
}

# Spesifikasyon stop kelimeleri (bu kelimeleri gördüğünde model adı biter)
_SPEC_STOP = {
    "ssd", "ram", "freedos", "windows", "w11", "w10", "home", "pro",
    "hz", "inch", "inç", "ips", "ddr4", "ddr5", "tb", "mhz", "wh",
}
_SPEC_PATTERNS = [
    r'^\d+gb$', r'^\d+tb$', r'^\d+ssd$',
    r'^(i[3579]|ryzen|r[357])-?\d', r'^ddr\d',
    r'^\d+hz$', r'^\d+w$', r'^\d+wh$',
]


def _is_spec_word(word: str) -> bool:
    """Kelime bir teknik spec mi? (16gb, 512ssd, i7-12650H gibi)"""
    w = word.lower()
    if w in _SPEC_STOP:
        return True
    # GPU isimleri spec değil, model adının parçası
    if re.search(r'rtx|gtx|geforce|radeon|rx\s?\d', w):
        return False
    if re.search(r'\d+gb|\d+tb|\d+ssd', w):
        return True
    return any(re.match(p, w) for p in _SPEC_PATTERNS)


def _extract_model_code(words: list[str]) -> tuple[str, str]:
    """
    Ürün adındaki model kodunu bul.
    Model kodu: harf+rakam karışımı uzun kelime veya hyphenated kod.
    Örn: FA506NCG-HN206, B12VGK, 15ACH6, HN206
    Returns: (short_code, full_code)
      short_code = FA506NCG
      full_code  = FA506NCG-HN206
    """
    # Hyphenated koda sahip kelimeler (FA506NCG-HN206)
    for word in words:
        if '-' in word and re.search(r'[A-Za-z]\d|\d[A-Za-z]', word):
            parts = word.split('-')
            short = parts[0]
            if re.search(r'[A-Za-z]\d|\d[A-Za-z]', short) and len(short) >= 4:
                return short.upper(), word.upper()

    # Hyphen olmayan model kodu (B12VGK, 15ACH6, FA506)
    for word in words:
        w = word.lower()
        if (re.search(r'[a-z]\d|\d[a-z]', w)
                and len(word) >= 4
                and word.lower() not in _BRANDS
                and not _is_spec_word(word)):
            return word.upper(), word.upper()

    return "", ""


def analyze_product_name(product_name: str) -> ProductNameAnalysis:
    """
    Ürün adını yapısal olarak analiz eder.
    
    "ASUS TUF Gaming A15 FA506NCG-HN206" →
      core_name      = "ASUS TUF Gaming A15"
      model_code     = "FA506NCG"
      model_code_full= "FA506NCG-HN206"
      short_names    = ["TUF A15", "TUF Gaming A15", "FA506"]
      brand          = "ASUS"
    """
    words = product_name.split()
    
    # Marka
    brand = ""
    for w in words[:3]:
        if w.lower() in _BRANDS:
            brand = w
            break

    # Model kodu
    short_code, full_code = _extract_model_code(words)

    # Core name: spec kelimeleri ve model kodunu çıkar
    core_words = []
    for word in words:
        if _is_spec_word(word):
            break
        # Model kodu varsa ve bu kelime model koduysa al ama kısa formda dur
        if full_code and (word.upper() == full_code or word.upper() == short_code):
            break  # Model kodundan önce dur (core name = "ASUS TUF Gaming A15")
        core_words.append(word)

    core_name = " ".join(core_words).strip()
    core_name = re.sub(r'[\s\-,\/|]+$', '', core_name).strip()
    if len(core_name) < 5:
        core_name = product_name  # Fallback

    # Kısa isimler üret
    short_names: list[str] = []

    # 1. Model kodu (kısa ve uzun)
    if short_code:
        short_names.append(short_code)
    if full_code and full_code != short_code:
        short_names.append(full_code)

    # 2. "Marka + ünlü isim" kısa formlar
    # Örn: "ASUS TUF Gaming A15" → "TUF A15", "TUF Gaming A15"
    non_brand = [w for w in core_words if w.lower() not in _BRANDS]
    if len(non_brand) >= 2:
        short_names.append(" ".join(non_brand))
    if len(non_brand) >= 1 and brand:
        short_names.append(f"{brand} {non_brand[-1]}")

    # 3. Numerik model parçası (A15 → serisi)
    # "A15" gibi seri işaretçilerini yakala
    for w in core_words:
        if re.match(r'^[A-Za-z]\d{1,2}$', w):  # A15, X700, G15 gibi
            short_names.append(w)
            if brand:
                short_names.append(f"{brand} {w}")

    # Dedup, boş olanları çıkar
    seen = set()
    unique = []
    for s in short_names:
        sk = s.lower().strip()
        if sk and sk not in seen and sk != core_name.lower():
            seen.add(sk)
            unique.append(s)

    return ProductNameAnalysis(
        core_name=core_name,
        model_code=short_code,
        model_code_full=full_code,
        short_names=unique,
        brand=brand,
    )


def extract_core_product_name(product_name: str) -> str:
    """Geriye uyumluluk: core_name döndürür."""
    return analyze_product_name(product_name).core_name


def build_search_queries(product_name: str) -> list[str]:
    """
    Ürün için çok katmanlı arama sorguları üretir.
    En spesifikten en genele doğru sıralı liste.
    """
    ana = analyze_product_name(product_name)
    queries = []

    # 1. Tam ürün adı (en spesifik)
    queries.append(product_name)

    # 2. Core name (spec olmadan)
    if ana.core_name != product_name:
        queries.append(ana.core_name)

    # 3. Model kodu
    if ana.model_code:
        queries.append(ana.model_code)
    if ana.model_code_full and ana.model_code_full != ana.model_code:
        queries.append(ana.model_code_full)

    # 4. Kısa yaygın isimler
    for s in ana.short_names:
        if s not in queries:
            queries.append(s)

    return queries


def youtube_search_query(product_name: str) -> str:
    ana = analyze_product_name(product_name)
    # YouTube'da kısa isim daha iyi sonuç verir
    search_term = ana.core_name
    return f"{search_term} inceleme yorum"


def forum_search_query(product_name: str) -> str:
    """
    Tavily forum araması için birincil sorgu.
    Hem tam isim hem de kısa model koduyla arama yapılabilmesi için
    OR mantığıyla sorgu oluşturur.
    """
    ana = analyze_product_name(product_name)
    # Birincil: core name tırnak içinde
    primary = f'"{ana.core_name}" yorum deneyim şikayet kullanıcı'
    return primary


def forum_search_queries_all(product_name: str) -> list[str]:
    """
    Forums.py için tüm sorgu varyasyonlarını döndürür.
    Her sorgu farklı bir format/niyet hedefler.
    """
    ana = analyze_product_name(product_name)
    queries = []

    # Tam isimle tırnaklı sorgu
    queries.append(f'"{product_name}" yorum forum')
    queries.append(f'"{product_name}" sorun şikayet')
    queries.append(f'"{product_name}" inceleme deneyim')

    # Core name ile (spec olmadan)
    if ana.core_name != product_name:
        queries.append(f'"{ana.core_name}" yorum forum')

    # Model kodu ile (kısa)
    if ana.model_code:
        prefix = f"{ana.brand} " if ana.brand else ""
        if not prefix and len(ana.core_name.split()) > 0:
            first_word = re.sub(r'[\s\-,\/|]+$', '', ana.core_name.split()[0]).strip()
            if first_word and len(first_word) > 2:
                prefix = f"{first_word} "
        queries.append(f'{prefix}{ana.model_code} yorum kullanıcı forum')
        queries.append(f'site:donanimhaber.com {prefix}{ana.model_code}')
        queries.append(f'site:technopat.net {prefix}{ana.model_code}')

    # Kısa yaygın isimler
    for short in ana.short_names[:2]:
        if short != ana.model_code:
            queries.append(f'{short} yorum kullanıcı deneyim forum')

    return queries
