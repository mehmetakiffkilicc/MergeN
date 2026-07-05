"""
E-ticaret arama sorgularını çeşitlendiren yardımcı modül.

Özellikle laptop/ürün ailesi adlarında (ör. "Asus TUF Gaming A15") tek
birebir arama başarısız olduğunda birden fazla varyant denemeyi sağlar.
"""
import re


def build_search_terms(product_name: str) -> list[str]:
    """
    Ürün adından e-ticaret araması için varyant sorgu listesi üretir.

    Dönen liste sırası önemlidir: spesifik → genel.
    Maksimum 4 varyant döner; giriş adı her zaman ilk sıradadır.
    """
    terms: list[str] = [product_name]
    words = product_name.split()

    # 1. Stop word'leri kaldırarak kısaltılmış sorgu
    stop_words = {
        "gaming", "edition", "plus", "max", "ultra", "pro", "series",
        "new", "gen", "special", "limited", "version", "türkiye", "turkey",
    }
    short_words = [w for w in words if w.lower() not in stop_words]
    if 2 <= len(short_words) < len(words):
        short = " ".join(short_words)
        if short not in terms:
            terms.append(short)

    # 2. Marka + model kodu (ör. "Asus A15", "Sony XM5")
    # Büyük harfle başlayan ve harf+rakam içeren model kodunu bul
    model_codes = re.findall(r'\b[A-Z][A-Z0-9\-]{1,}\b', product_name)
    if model_codes:
        brand = words[0] if words else ""
        # En belirgin model kodu: sadece büyük harf+rakam karışığı olanlar (ör. A15, XM5, WH-1000XM5)
        alphanumeric_codes = [c for c in model_codes if re.search(r'[0-9]', c) and c != brand.upper()]
        if alphanumeric_codes:
            model_query = f"{brand} {alphanumeric_codes[0]}"
            if model_query not in terms and model_query != product_name:
                terms.append(model_query)

    # 3. Marka + ilk 2 kelime (uzun ürün adları için)
    if len(words) > 3:
        first_two = " ".join(words[:2])
        if first_two not in terms:
            terms.append(first_two)

    return terms[:4]


# ---------------------------------------------------------------------------
# Slug ↔ ürün eşleştirme (yanlış ürün yorumlarının karışmasını önler)
# ---------------------------------------------------------------------------

# Aksesuar listingleri (kılıf, ekran koruyucu vb.) hedef ürün olamaz
_ACCESSORY_TOKENS = {
    "kilif", "kılıf", "kapak", "uyumlu", "koruyucu", "cam", "case",
    "aparat", "stand", "askisi", "tutucu", "sarj", "kablo", "adaptör", "adaptor",
}

# Bigram/model tokenı sonrası bu ekler geliyorsa FARKLI bir modeldir
# (örn "note-13-pro", "g502-x-plus", "g502-lightspeed")
_MODEL_SUFFIXES = {"pro", "plus", "ultra", "max", "lite", "mini", "se", "x", "lightspeed"}


def extract_model_tokens(product_name: str) -> set:
    """Harf+rakam karışımlı model tokenları (örn FX608JM, RV073, T520BT)."""
    return {
        part.lower()
        for w in product_name.split()
        if re.search(r"[A-Za-z]\d|\d[A-Za-z]", w)
        for part in w.split("-")
        if len(part) >= 4
    }


def _number_bigrams(product_name: str) -> list[tuple[str, str]]:
    """'Redmi Note 13' → [('note', '13')] — salt rakam modeller için kelime+rakam çifti."""
    words = [w.lower() for w in product_name.split()]
    out = []
    for i, w in enumerate(words):
        if w.isdigit() and len(w) >= 2 and i > 0 and words[i - 1].isalpha():
            out.append((words[i - 1], w))
    return out


def slug_matches_product(slug: str, product_name: str) -> bool:
    """
    Bir listing slug'ının hedef ürüne ait olup olmadığını değerlendirir.

    - Aksesuar tokenı içeren slug her durumda reddedilir.
    - Model kodu varsa (FX608JM gibi): prefix-toleranslı token eşleşmesi
      ("t520bt" ↔ "520bt" kabul; "fx608jmr" ↔ "fx608jm" red).
    - Model kodu yoksa ('Note 13' gibi): kelime+rakam bigramı slug'da ardışık
      geçmeli ve hemen ardından pro/plus/ultra gibi model eki GELMEMELİ.
    - Hiçbir sinyal yoksa (bigram da yok) karar verilemez → True (filtre pasif).
    """
    toks = [t for t in slug.lower().split("-") if t]
    tok_set = set(toks)

    if tok_set & _ACCESSORY_TOKENS:
        return False

    model_toks = extract_model_tokens(product_name)
    name_words = {w.lower() for w in product_name.split()}
    if model_toks:
        for i, st in enumerate(toks):
            if len(st) < 4:
                continue
            for mt in model_toks:
                if st == mt or st.endswith(mt) or mt.endswith(st):
                    # Varyant ayracı kontrolü: "g502-x-plus" / "g502-lightspeed"
                    # gibi eklentiler ürün adında geçmiyorsa farklı modeldir
                    nxt = toks[i + 1] if i + 1 < len(toks) else ""
                    if nxt in _MODEL_SUFFIXES and nxt not in name_words:
                        continue
                    return True
        return False

    bigrams = _number_bigrams(product_name)
    if bigrams:
        for i in range(len(toks) - 1):
            for word, num in bigrams:
                if toks[i] == word and toks[i + 1] == num:
                    nxt = toks[i + 2] if i + 2 < len(toks) else ""
                    if nxt not in _MODEL_SUFFIXES:
                        return True
        return False

    return True
