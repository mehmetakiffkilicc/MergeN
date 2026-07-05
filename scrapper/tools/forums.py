"""
Forum toplayıcı — curl_cffi direkt HTTP:

  Her forum sitesine doğrudan HTTP isteği atılır, HTML/JSON parse edilir.
  Tüm siteler paralel çalışır — Playwright gerekmez.

Desteklenen siteler:
  donanimhaber.com · forum.donanimhaber.com · technopat.net · webtekno.com
  forum.shiftdelete.net · forum.donanimarsivi.com · forum.chip.com.tr
  pchocasi.com.tr · sikayetvar.com · eksisozluk.com · reddit.com
  kizlarsoruyor.com
"""
import asyncio
import json
import os
import re
from urllib.parse import urldefrag, quote_plus, urljoin
from curl_cffi.requests import AsyncSession
from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# Desteklenen forum domainleri
# ---------------------------------------------------------------------------

FORUM_DOMAINS = [
    "donanimhaber.com",
    "forum.donanimhaber.com",
    "technopat.net",
    "webtekno.com",
    "forum.shiftdelete.net",
    "forum.donanimarsivi.com",
    "pchocasi.com.tr",
    "sikayetvar.com",
    "eksisozluk.com",
    "reddit.com",
    "forum.chip.com.tr",
    "kizlarsoruyor.com",
]


_DIRECT_SITES = [
    "donanimhaber.com",
    "forum.donanimhaber.com",
    "technopat.net",
    "forum.shiftdelete.net",
    "forum.donanimarsivi.com",
    "pchocasi.com.tr",
    "eksisozluk.com",
    "sikayetvar.com",
    "reddit.com",
    "forum.chip.com.tr",
    "webtekno.com",
    "kizlarsoruyor.com",
]


_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
}


# ---------------------------------------------------------------------------
# Yardımcı fonksiyonlar
# ---------------------------------------------------------------------------

def _norm_url(url: str) -> str:
    base, _ = urldefrag(url)
    return base.rstrip("/")


def _strip_tags(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    for ent, ch in [
        ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"),
        ("&quot;", '"'), ("&#39;", "'"), ("&nbsp;", " "),
    ]:
        text = text.replace(ent, ch)
    return re.sub(r"\s+", " ", text).strip()


def _extract_keywords(product_name: str) -> tuple[list[str], list[str]]:
    """Ürün adından marka ve spesifik model anahtar kelimelerini ayıklayıp varyasyonlar üretir."""
    product_name_lower = product_name.lower()
    words = product_name_lower.split()
    
    # Sayı ve harf ayrımı yaparak varyasyonlar üret (T520BT -> T 520 BT)
    # 1. Ham kelimeler
    all_kw = list(dict.fromkeys(words))
    
    # 2. Sayı-Harf geçişlerini ayır (örn: T520BT -> ['t', '520', 'bt'])
    for word in words:
        parts = re.findall(r'([a-z]+|[0-9]+)', word)
        if len(parts) > 1:
            all_kw.extend(parts)
            # Sayı ve harf bitişik hallerini de ekle (örn: 520bt)
            for i in range(len(parts)-1):
                all_kw.append(parts[i] + parts[i+1])

    # 3. Model adı içindeki sayıları da alalım (en az 3 hane)
    extra_kw = []
    for kw in all_kw:
        nums = re.findall(r"\d+", kw)
        if nums and len(nums[0]) >= 3:
            extra_kw.append(nums[0])
    
    all_kw = list(dict.fromkeys(all_kw + extra_kw))
    
    # Marka kelimelerini ayır (genelde kısa ve alfabetik)
    # JBL, Sony, Apple vb.
    brand_kw = [w for w in all_kw if w.isalpha() and len(w) <= 6]
    specific_kw = [w for w in all_kw if w not in brand_kw and len(w) >= 2]

    # Çok kısa sayıları eleyelim (örn: 5, 2 gibi modelle alakasız olanlar)
    specific_kw = [w for w in specific_kw if not (w.isdigit() and len(w) < 3)]

    # Kelime + kısa sayı bigramı ("Mi Band 9" -> "band 9"): model kodu
    # olmayan ürünlerde specific_kw boş kalıyor ve alaka filtresi her şeyi
    # eliyordu (Band 9, Note 13, iPhone 15 gibi adlar). Üç yazım biçimi de
    # eklenir ki metin ("band 9"), bitişik ("band9") ve URL ("band-9") yakalansın.
    for i in range(len(words) - 1):
        w, n = words[i], words[i + 1]
        if w.isalpha() and n.isdigit() and len(n) < 3:
            specific_kw.extend([f"{w} {n}", f"{w}{n}", f"{w}-{n}"])

    return list(set(specific_kw)), list(set(brand_kw))


def _is_relevant(text: str, specific_kw: list[str], brand_kw: list[str], url: str = "") -> bool:
    """İçeriğin ürünle alakalı olup olmadığını kontrol eder (Varyasyon duyarlı)."""
    lower = text.lower()
    url_lower = url.lower()
    
    # 1. Tam eşleşme (URL veya metin)
    if any(kw in lower or kw in url_lower for kw in specific_kw):
        return True
    
    # 2. Regex ile varyasyon kontrolü (örn: "t520bt" metinde "t 520 bt" olarak geçiyor mu?)
    # Model kelimelerinin (örn 520) metinde geçmesi + markanın geçmesi
    if any(kw in lower for kw in brand_kw):
        # Marka geçiyor, şimdi modelin sayısal kısmına bakalım
        # Sayısal model kısımları (örn: 520) mutlaka geçmeli
        model_nums = [kw for kw in specific_kw if (kw.isdigit() and len(kw) >= 3) or (not kw.isdigit() and any(c.isdigit() for c in kw))]
        if model_nums and any(num in lower for num in model_nums):
            return True
            
    # 3. Forum domaini ise daha esnek ol (Sadece marka + URL'de model geçmesi yeterli)
    is_forum = any(d in url_lower for d in ["donanimhaber", "technopat", "donanimarsivi", "shiftdelete", "chip.com.tr", "reddit", "eksi", "webtekno", "sikayetvar", "kizlarsoruyor"])
    if is_forum:
        # Forum ise marka geçmesi + URL'de model parçası geçmesi yeterli olabilir
        if any(kw in lower for kw in brand_kw) and any(kw in url_lower for kw in specific_kw):
            return True
        # Veya başlıkta model geçmesi
        if any(kw in url_lower for kw in specific_kw):
            return True
            
    return False




def _is_mostly_urls(text: str) -> bool:
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    if not lines:
        return True
    def _url_dominated(line: str) -> bool:
        cleaned = re.sub(r"\*{0,2}https?://\S+\*{0,2}", "", line).strip(" .*")
        return len(cleaned) < 15
    url_lines = sum(1 for l in lines if _url_dominated(l))
    return url_lines / len(lines) > 0.5


# ---------------------------------------------------------------------------
# HTML parse yardımcıları
# ---------------------------------------------------------------------------

def _detect_max_page(html: str) -> int:
    """XenForo pageNav'dan son sayfa numarasını çıkarır."""
    pages = re.findall(r'/(?:ara|search)/\d+/\?page=(\d+)', html)
    m = max((int(p) for p in pages), default=1)
    return min(m, 4)



async def _fetch_full_content(url: str, domain: str, session) -> str:
    """Belirli bir URL'den tam metni çeker."""
    try:
        r = await session.get(url, headers=_HEADERS, timeout=10)
        if r.status_code != 200:
            return ""
        html = r.text
        
        # Siteye göre seçici
        if "sikayetvar.com" in url:
            # Şikayet detayı
            desc_m = re.search(r'class="[^"]*(?:complaint-description|description)[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL)
            return _strip_tags(desc_m.group(1)) if desc_m else ""
            
        if any(d in url for d in ["technopat.net", "shiftdelete.net", "donanimarsivi.com", "pchocasi.com.tr", "donanimhaber.com", "chip.com.tr"]):
            # XenForo veya benzeri forum mesaj gövdesi
            # Öncelik: .bbWrapper (XenForo standartı)
            body_m = re.search(r'class="[^"]*bbWrapper[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL)
            if not body_m:
                # Alternatif: Genel mesaj gövdeleri
                body_m = re.search(r'class="[^"]*(?:message-body|message-content|content)[^"]*"[^>]*>(.*?)</div>', html, re.DOTALL)
            
            if body_m:
                text = body_m.group(1)
                # Alıntıları (quote) temizle
                text = re.sub(r'<blockquote.*?>.*?</blockquote>', '', text, flags=re.DOTALL)
                # İmzaları/Footers temizle (XenForo .message-signature)
                text = re.sub(r'<aside class="message-signature">.*?</aside>', '', text, flags=re.DOTALL)
                # Donanimhaber tarzı "bu ileti mobil sürüm..." temizle
                text = re.sub(r'<div[^>]*class="[^"]*signature[^"]*"[^>]*>.*?</div>', '', text, flags=re.DOTALL)
                text = re.sub(r'<div[^>]*class="[^"]*mobile[^"]*"[^>]*>.*?</div>', '', text, flags=re.DOTALL)
                return _strip_tags(text)

                
        return ""
    except Exception:
        return ""

def _parse_xenforo_html(html: str, domain: str) -> list[dict]:
    """XenForo 2 arama sonuç sayfasından post/konu listesini parse eder."""
    results = []
    base = f"https://www.{domain}" if not domain.startswith("www.") else f"https://{domain}"

    # <li class="block-row..."> sınırında böl
    items = re.split(r"(?=<li[^>]*\bclass=\"[^\"]*block-row)", html)
    if len(items) < 3:
        items = re.split(r'(?=<div[^>]*class="contentRow\s*")', html)

    for item in items[1:]:
        title_m = re.search(
            r'class="[^"]*contentRow-title[^"]*"[^>]*>.*?<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>',
            item, re.DOTALL,
        )
        if not title_m:
            continue

        href = title_m.group(1)
        if href.startswith("/"):
            href = base + href
        title = _strip_tags(title_m.group(2))

        snippet_m = re.search(
            r'class="[^"]*contentRow-snippet[^"]*"[^>]*>(.*?)</div>',
            item, re.DOTALL,
        )
        snippet = _strip_tags(snippet_m.group(1)) if snippet_m else ""

        # Tarih — <time datetime="2025-01-15T12:34:56+0300">
        date_m = re.search(r'<time\b[^>]*\bdatetime="([^"T]+)T[^"]*"', item)
        date = date_m.group(1) if date_m else None  # "YYYY-MM-DD"

        combined = f"{title} — {snippet}" if snippet else title
        if len(combined) > 20 and href:
            results.append({
                "text": combined[:900], # Başlangıçta snippet'i tut
                "title": title,
                "url": href,
                "date": date,
                "source": domain,
                "score": 0,
                "needs_full_fetch": True # Daha sonra tam metin çekilmeli
            })
    return results


def _parse_eksi_entries_html(html: str, filter_kws: list[str]) -> list[dict]:
    """Ekşisözlük başlık veya entry/list sayfasından entry'leri parse eder."""
    results = []
    for m in re.finditer(r'<li[^>]*\bdata-id="(\d+)"[^>]*>(.*?)</li>', html, re.DOTALL):
        entry_id = m.group(1)
        block = m.group(2)

        content_m = re.search(r'class="[^"]*\bcontent\b[^"]*"[^>]*>(.*?)</div>', block, re.DOTALL)
        if not content_m:
            continue
        text = _strip_tags(content_m.group(1)).strip()
        if len(text) < 20:
            continue

        if filter_kws:
            lower = text.lower()
            if not any(kw in lower for kw in filter_kws):
                continue

        date_m = re.search(r'class="[^"]*\bentry-date\b[^"]*"[^>]*>(.*?)(?:</a>|</span>)', block, re.DOTALL)
        date = _strip_tags(date_m.group(1)) if date_m else None

        likes_m = re.search(r'class="[^"]*\bfavorite-count\b[^"]*"[^>]*>(\d+)<', block)
        likes = int(likes_m.group(1)) if likes_m else 0

        # topic başlığı (entry/list sayfasında olabilir)
        topic_m = re.search(r'class="[^"]*(?:topic-title|entry-topic-link)[^"]*"[^>]*>(.*?)</a>', block, re.DOTALL)
        topic = _strip_tags(topic_m.group(1)) if topic_m else ""

        results.append({
            "text": text[:900],
            "title": topic or text[:80],
            "date": date,
            "likes": likes,
            "url": f"https://eksisozluk.com/entry/{entry_id}",
            "source": "eksisozluk.com",
            "score": likes,
        })
    return results


def _parse_eksi_topic_links_html(html: str) -> list[str]:
    """Ekşi arama sonuç sayfasındaki başlık linklerini döner."""
    links = []
    for m in re.finditer(
        r'<(?:ul|div)[^>]*(?:topic-list|list-items|search-results)[^>]*>(.*?)</(?:ul|div)>',
        html, re.DOTALL,
    ):
        for link_m in re.finditer(r'href="(https?://eksisozluk\.com/[^?"\']+)"', m.group(1)):
            url = link_m.group(1)
            if url not in links:
                links.append(url)
    # Fallback: herhangi bir ekşi başlık linki
    if not links:
        for link_m in re.finditer(r'href="(https://eksisozluk\.com/[a-z0-9][^?"\'#\s]{5,})"', html):
            url = link_m.group(1)
            if url not in links:
                links.append(url)
    return links[:8]


def _eksi_search_terms(product_name: str) -> list[str]:
    terms = [product_name]
    model_nums = re.findall(
        r'[A-Za-z]{1,6}[0-9]{2,}[A-Za-z0-9]*|[0-9]{2,}[A-Za-z]+[A-Za-z0-9]*',
        product_name,
    )
    for m in model_nums:
        if len(m) >= 4 and m not in terms:
            terms.append(m)
            short = re.match(r'^[A-Za-z]+[0-9]+', m)
            if short and short.group() != m and short.group() not in terms:
                terms.append(short.group())
    return terms[:4]


# ---------------------------------------------------------------------------
# Katman 1: Tavily — çoklu paralel sorgu
# ---------------------------------------------------------------------------

async def fetch_forums(product_name: str, direct: bool = True) -> list[dict]:
    """
    Tüm kaynaklardan paralel forum verisi toplar (curl_cffi direkt HTTP).
    """
    specific_kw, brand_kw = _extract_keywords(product_name)

    direct_results = await _search_direct(product_name)

    seen: set = set()
    combined = []
    all_posts = list(direct_results)
    
    # URL bazlı dedup
    for post in all_posts:
        url = _norm_url(post.get("url", ""))
        key = url if url else post.get("text", "")[:60]
        if key not in seen:
            seen.add(key)
            combined.append(post)

    async with AsyncSession(impersonate="chrome120") as sess:
        # Daha fazla postu tam metin olarak çekelim (özellikle kısa snippet olanları)
        to_fetch = [p for p in combined if p.get("needs_full_fetch") or (len(p.get("text", "")) < 350 and p.get("url"))]
        targets = to_fetch[:20]
        fetch_tasks = [_fetch_full_content(p["url"], p.get("source", ""), sess) for p in targets]
        full_texts = await asyncio.gather(*fetch_tasks)
        
        for p, full_text in zip(targets, full_texts):
            if full_text and len(full_text) > 100:
                p["text"] = full_text[:3000] # Daha geniş limit
                p["is_full_content"] = True


    # Relaxed Relevance Filter
    final_filtered = []
    for p in combined:
        txt = p.get("text", "").lower()
        url_lower = p.get("url", "").lower()
        
        # Arama sayfalarını tamamen eleyelim (zaten konuları çektik)
        if "/search" in url_lower or "/ara" in url_lower or "?q=" in url_lower or "sikayetvar.com/search" in url_lower:
            if p.get("needs_full_fetch"): 
                continue
        
        # Daha yumuşak filtre: Marka VEYA model geçmesi yeterli (eğer forum ise)
        is_relevant = False
        if specific_kw and any(kw in txt for kw in specific_kw):
            is_relevant = True
        elif brand_kw and any(kw in txt for kw in brand_kw):
            # Marka geçiyorsa en azından model de URL'de geçmeli veya metin uzun olmalı
            # VEYA model adının parçaları metinde geçmeli
            if any(kw in url_lower for kw in specific_kw) or len(txt) > 300:
                is_relevant = True
                
        if is_relevant:
            final_filtered.append(p)



    final_filtered.sort(key=lambda x: x.get("score", 0), reverse=True)

    print(
        f"  [Forum] {len(final_filtered)} benzersiz gönderi "
        f"(Direkt: {len(direct_results) if isinstance(direct_results, list) else 0})"
    )
    return final_filtered


# ---------------------------------------------------------------------------
# Katman 2: curl_cffi direkt HTTP — tüm siteler paralel
# ---------------------------------------------------------------------------

def _get_optimized_forum_queries(product_name: str) -> list[str]:
    """
    Forum ve Şikayet aramaları için en verimli arama terimlerini üretir.
    Örn: "ASUS TUF Gaming A15 FA506NCG-HN286" -> ["FA506NCG", "HN286", "ASUS TUF Gaming A15"]
    """
    words = product_name.split()
    if not words:
        return [product_name]
        
    brand = words[0]
    
    # 1. Alfanümerik kodları / Model numaralarını bulalım
    # Örn: A15, FA506NCG, HN286
    model_codes = []
    for w in words:
        w_clean = re.sub(r'[<>:"/\\|?*()\[\]]', '', w)
        if re.search(r'\d', w_clean) and len(w_clean) >= 3:
            if w_clean.lower() != brand.lower():
                model_codes.append(w_clean)
                
    # Tireli olanları bölüp en spesifik model kodunu alalım (örn: FA506NCG)
    refined_codes = []
    for code in model_codes:
        if '-' in code:
            parts = [p for p in code.split('-') if len(p) >= 3]
            refined_codes.extend(parts)
        else:
            refined_codes.append(code)
            
    # Model kodları arasından en spesifik olanı seçelim (uzunluğu >= 5 olan alfanümerikler)
    specific_codes = [c for c in refined_codes if len(c) >= 5 and re.search(r'[A-Za-z]', c) and re.search(r'\d', c)]
    if not specific_codes:
        specific_codes = [c for c in refined_codes if len(c) >= 4]
        
    # 2. Temiz Ürün Ailesi/Seri Adı üretelim
    stop_words = {"edition", "plus", "max", "ultra", "pro", "series", "new", "gen", "special", "limited", "version"}
    family_words = []
    for w in words:
        w_clean = re.sub(r'[<>:"/\\|?*()\[\]]', '', w)
        if len(w_clean) >= 6 and '-' in w:
            continue
        if w_clean in specific_codes and len(w_clean) >= 6:
            continue
        family_words.append(w)
        
    family_name = " ".join(family_words)
    
    # Aile adını daha da temizleyelim (kısa versiyon için stop word'leri atalım)
    short_family_words = [w for w in family_words if w.lower() not in stop_words]
    short_family = " ".join(short_family_words)
    
    queries = []
    
    # 1. Spesifik Model kodu (örn: FA506NCG)
    for code in specific_codes:
        if code not in queries:
            queries.append(code)
            
    # 2. Kısa aile adı (örn: ASUS TUF A15)
    if short_family and len(short_family.split()) >= 2:
        if short_family not in queries:
            queries.append(short_family)
            
    # 3. Tam aile adı (örn: ASUS TUF Gaming A15)
    if family_name and family_name not in queries:
        queries.append(family_name)
        
    # 4. Hiçbiri yoksa orijinal ismi ekle
    if not queries:
        queries.append(product_name)
        
    return queries[:3]


async def _search_direct(product_name: str) -> list[dict]:
    """
    Her forum sitesine curl_cffi ile doğrudan HTTP isteği atar.
    Tüm siteler paralel çalışır — Playwright gerekmez.
    """
    try:
        from curl_cffi.requests import AsyncSession
    except ImportError:
        print("  [Forum/Direkt] curl_cffi yüklü değil, atlanıyor")
        return []

    specific_kw, brand_kw = _extract_keywords(product_name)

    scraper_map = [
        ("donanimhaber.com",       _direct_donanimhaber),
        ("technopat.net",          _direct_technopat),
        ("forum.shiftdelete.net",  _direct_shiftdelete),
        ("forum.donanimarsivi.com", _direct_donanimarsivi),
        ("forum.chip.com.tr",      _direct_chip_forum),
        ("pchocasi.com.tr",        _direct_pchocasi),
        ("eksisozluk.com",         _direct_eksisozluk),
        ("sikayetvar.com",         _direct_sikayetvar),
        ("reddit.com",             _direct_reddit),
        ("webtekno.com",           _direct_webtekno),
        ("kizlarsoruyor.com",      _direct_kizlarsoruyor),
    ]

    _trusted = {"technopat.net", "donanimhaber.com", "forum.donanimhaber.com", "forum.shiftdelete.net", "forum.donanimarsivi.com", "forum.chip.com.tr", "webtekno.com"}

    # Generate optimized forum queries
    queries = _get_optimized_forum_queries(product_name)
    print(f"  [Forum/Arama] Yapilandirilmis Sorgular: {queries}")

    task_keys = [] # list of (domain, function, query)
    for domain, fn in scraper_map:
        if domain == "eksisozluk.com":
            task_keys.append((domain, fn, product_name))
        else:
            for q_term in queries:
                task_keys.append((domain, fn, q_term))

    async with AsyncSession(impersonate="chrome120") as session:
        final_tasks = []
        for domain, fn, q_term in task_keys:
            q = quote_plus(q_term)
            final_tasks.append(fn(product_name, q, session))

        results_list = await asyncio.gather(*final_tasks, return_exceptions=True)

    # Domain bazında sonuçları birleştirelim
    domain_results = {}
    for (domain, fn, q_term), result in zip(task_keys, results_list):
        if isinstance(result, Exception):
            print(f"  [Forum/Direkt] {domain} ({q_term}) hatası: {result}")
            continue
        if result:
            domain_results.setdefault(domain, []).extend(result)

    combined: list[dict] = []
    for domain, result in domain_results.items():
        # URL bazında dedup
        seen_urls = set()
        unique_result = []
        for post in result:
            url = _norm_url(post.get("url", ""))
            key = url if url else post.get("text", "")[:60]
            if key not in seen_urls:
                seen_urls.add(key)
                unique_result.append(post)
                
        if unique_result:
            if domain in _trusted:
                combined.extend(unique_result)
                print(f"  [Forum/Direkt] {domain}: {len(unique_result)} gönderi toplandı")
            else:
                relevant = [
                    p for p in unique_result
                    if _is_relevant(p.get("text", ""), specific_kw, brand_kw, p.get("url", ""))
                ]
                if relevant:
                    combined.extend(relevant)
                    print(f"  [Forum/Direkt] {domain}: {len(relevant)} gönderi (/{len(unique_result)} filtrelendi)")
                else:
                    print(f"  [Forum/Direkt] {domain}: sonuç yok (alakasız {len(unique_result)} elendi)")
        else:
            print(f"  [Forum/Direkt] {domain}: sonuç yok")

    return combined



# ---------------------------------------------------------------------------
# Site scraper'ları — curl_cffi HTTP + HTML parse
# ---------------------------------------------------------------------------

async def _direct_xenforo_generic(
    domain: str,
    search_path: str,
    product_name: str,
    q: str,
    session,
) -> list[dict]:
    """
    Generic XenForo 2 scraper — content search + title-only search, all pages parallel.

    XenForo redirects the initial search to a session URL like /ara/NNNNNN/ or
    /sosyal/ara/NNNNNN/. Pages are then fetched in parallel using that session base.
    """
    base = f"https://{domain}"

    async def _fetch_all_pages(url: str, label: str) -> list[dict]:
        try:
            r = await session.get(url, headers=_HEADERS, timeout=10, allow_redirects=True)
            if r.status_code != 200:
                return []
        except Exception as e:
            print(f"  [Forum/Direkt] {domain} ({label}): {e}")
            return []

        results = _parse_xenforo_html(r.text, domain)
        session_base = str(r.url).split("?")[0]
        max_page = _detect_max_page(r.text)

        if max_page > 1:
            page_urls = [
                f"{session_base}?page={p}&q={q}&t=post&o=relevance"
                for p in range(2, max_page + 1)
            ]
            responses = await asyncio.gather(
                *[session.get(u, headers=_HEADERS, timeout=20) for u in page_urls],
                return_exceptions=True,
            )
            for resp in responses:
                if not isinstance(resp, Exception) and resp.status_code == 200:
                    results.extend(_parse_xenforo_html(resp.text, domain))

        print(f"  [Forum/Direkt] {domain} ({label}): {len(results)} gönderi ({max_page} sayfa)")
        return results

    content_url = f"{base}{search_path}?keywords={q}&search_type=post"
    title_url = f"{base}{search_path}?keywords={q}&search_type=post&c[title_only]=1"

    content_results, title_results = await asyncio.gather(
        _fetch_all_pages(content_url, "icerik"),
        _fetch_all_pages(title_url, "baslik"),
    )

    seen: set = set()
    combined: list[dict] = []
    for post in content_results + title_results:
        key = _norm_url(post["url"])
        if key not in seen:
            seen.add(key)
            combined.append(post)
    return combined


async def _direct_shiftdelete(product_name: str, q: str, session) -> list[dict]:
    return await _direct_xenforo_generic(
        "forum.shiftdelete.net", "/search/search", product_name, q, session
    )


async def _direct_donanimarsivi(product_name: str, q: str, session) -> list[dict]:
    return await _direct_xenforo_generic(
        "forum.donanimarsivi.com", "/search/search", product_name, q, session
    )


async def _direct_chip_forum(product_name: str, q: str, session) -> list[dict]:
    """
    forum.chip.com.tr — XenForo tabanlı, /search/search ile.
    """
    # XenForo standardına uygun URL'leri dene
    search_paths = ["/search/search", "/search/1/"]
    results = []
    for path in search_paths:
        res = await _direct_xenforo_generic(
            "forum.chip.com.tr", path, product_name, q, session
        )
        if res:
            results.extend(res)
            break
            
    if results:
        return results

    # Fallback: Arama motoru fallback (DuckDuckGo/Google)
    return await _fetch_search_engine_fallback(q, "forum.chip.com.tr", session)



async def _direct_donanimhaber(product_name: str, q: str, session) -> list[dict]:
    """
    DonanımHaber Forum araması.
    Katman 1: forum.donanimhaber.com XenForo arama (birden fazla path dener)
    Katman 2: DuckDuckGo/Google fallback

    Not: donanimhaber.com ana site arama (/arama) JS-render ile çalıştığından
    curl_cffi ile parse edilemiyor — doğrudan forum subdomain'i hedeflenir.
    """
    results = []

    # Katman 1: forum.donanimhaber.com — birden fazla XenForo search path dene
    search_paths = ["/search/search", "/arama", "/ara"]
    for path in search_paths:
        forum_results = await _direct_xenforo_generic(
            "forum.donanimhaber.com", path, product_name, q, session
        )
        if forum_results:
            for p in forum_results:
                p["source"] = "forum.donanimhaber.com"
                p["score"] = 5
            results.extend(forum_results)
            break

    # Katman 2: DuckDuckGo/Google fallback
    if not results:
        results = await _fetch_search_engine_fallback(q, "forum.donanimhaber.com", session)

    seen: set = set()
    unique_results: list[dict] = []
    for res in results:
        key = _norm_url(res["url"])
        if key not in seen:
            seen.add(key)
            unique_results.append(res)

    return unique_results[:20]


_fallback_seen_keys = set()
# Tavily'ye aynı anda en çok 2 fallback isteği — pipeline'da YouTube keşfi de
# Tavily kullandığından burst anında oran sınırına takılıp sessizce boş
# dönüyordu (DH/ekşi/webtekno'nun pipeline'da 0 gelmesinin kök nedeni)
_fallback_sem = asyncio.Semaphore(2)

async def _fetch_search_engine_fallback(q: str, domain: str, session) -> list[dict]:
    """
    DuckDuckGo HTML / Google bloklandığı için Tavily API kullanarak forum linklerini toplar.
    Domain ve sorgu bazında mükerrer Tavily isteklerini engellemek için cache kullanır.
    """
    cache_key = f"{domain}:{q}"
    if cache_key in _fallback_seen_keys:
        return []
    _fallback_seen_keys.add(cache_key)

    from tools._tavily import search as tavily_search
    results = []

    import asyncio
    loop = asyncio.get_event_loop()

    from urllib.parse import unquote
    clean_q = unquote(q).replace("+", " ")

    try:
        def _call_tavily():
            return tavily_search(
                query=f"{clean_q}",
                include_domains=[domain],
                max_results=10
            )

        # Semafor + 1 retry (2s backoff): oran sınırı burst'ünde veri kaybını önler
        async with _fallback_sem:
            for _attempt in range(2):
                try:
                    resp = await loop.run_in_executor(None, _call_tavily)
                    break
                except Exception as e:
                    if _attempt == 0:
                        print(f"  [Forum/Fallback] Tavily ({domain}) hata — 2s sonra retry: {e}")
                        await asyncio.sleep(2)
                    else:
                        raise

        for r in resp.get("results", []):
            url = r.get("url", "")
            if domain in url and not any(x in url for x in ["duckduckgo.com", "google.com", "search"]):
                results.append({
                    "text": r.get("content", "Search Fallback Result"),
                    "title": r.get("title", "Search Result"),
                    "url": url,
                    "source": domain,
                    "score": 0,
                    "needs_full_fetch": True,
                })
    except Exception as e:
        print(f"  [Forum/Fallback] Tavily ({domain}) hatası: {e}")
        
    return results



async def _direct_technopat(product_name: str, q: str, session) -> list[dict]:
    """
    Technopat XenForo2 — iki ayrı arama, tüm sayfalar paralel:

    1. İçerik araması (search_type=post):
       Ürün adının post GÖVDESINDE geçtiği tüm gönderileri bulur.
       Session URL alınır → tüm sayfalar paralel çekilir.

    2. Başlık araması (c[title_only]=1):
       Ürün adının KONU BAŞLIĞINDA geçtiği thread'leri bulur.
       Google'da çıkmayan ama Technopat içinde aranınca çıkan konuları yakalar.

    Her iki sonuç dedup edilerek birleştirilir.
    """
    base_search = "https://www.technopat.net/sosyal/ara/search"

    async def _fetch_all_pages(initial_url: str, label: str) -> list[dict]:
        try:
            r = await session.get(initial_url, headers=_HEADERS, timeout=12, allow_redirects=True)
            if r.status_code != 200:
                return []
        except Exception as e:
            print(f"  [Forum/Direkt] technopat.net ({label}): {e}")
            return []

        results = _parse_xenforo_html(r.text, "technopat.net")
        session_base = str(r.url).split("?")[0]          # /sosyal/ara/NNNNNN/
        max_page = _detect_max_page(r.text)

        if max_page > 1:
            page_urls = [
                f"{session_base}?page={p}&q={q}&t=post&o=date"
                for p in range(2, max_page + 1)
            ]
            responses = await asyncio.gather(
                *[session.get(u, headers=_HEADERS, timeout=20) for u in page_urls],
                return_exceptions=True,
            )
            for resp in responses:
                if not isinstance(resp, Exception) and resp.status_code == 200:
                    results.extend(_parse_xenforo_html(resp.text, "technopat.net"))

        print(f"  [Forum/Direkt] technopat.net ({label}): {len(results)} gönderi ({max_page} sayfa)")
        return results

    # İki araştırma paralel başlatılır
    content_results, title_results = await asyncio.gather(
        _fetch_all_pages(f"{base_search}?keywords={q}&search_type=post", "içerik"),
        _fetch_all_pages(f"{base_search}?keywords={q}&search_type=post&c[title_only]=1", "başlık"),
    )

    # URL bazlı dedup
    seen: set = set()
    combined: list[dict] = []
    for post in content_results + title_results:
        key = _norm_url(post["url"])
        if key not in seen:
            seen.add(key)
            combined.append(post)

    return combined



async def _direct_pchocasi(product_name: str, q: str, session) -> list[dict]:
    url = f"https://www.pchocasi.com.tr/search?q={q}&t=all"
    try:
        r = await session.get(url, headers=_HEADERS, timeout=20)
        posts = _parse_xenforo_html(r.text, "pchocasi.com.tr")
        if posts:
            return posts
        r2 = await session.get(
            f"https://www.pchocasi.com.tr/?s={q}", headers=_HEADERS, timeout=15
        )
        return _parse_generic_article_html(r2.text, "pchocasi.com.tr")
    except Exception as e:
        print(f"  [Forum/Direkt] pchocasi.com.tr: {e}")
        return []


def _parse_generic_article_html(html: str, domain: str) -> list[dict]:
    """WordPress/genel site arama sonuçları için yedek parser."""
    base = f"https://www.{domain}"
    results = []
    for m in re.finditer(
        r'<article[^>]*>(.*?)</article>',
        html, re.DOTALL | re.IGNORECASE,
    ):
        block = m.group(1)
        title_m = re.search(r'<h[23][^>]*>.*?<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', block, re.DOTALL)
        if not title_m:
            continue
        href = title_m.group(1)
        title = _strip_tags(title_m.group(2))
        text_m = re.search(r'<(?:p|div)[^>]*class="[^"]*(?:entry-content|excerpt|summary)[^"]*"[^>]*>(.*?)</(?:p|div)>', block, re.DOTALL)
        text = _strip_tags(text_m.group(1)) if text_m else title
        # Protokol-bağıl (//) ve kök-bağıl (/) URL'leri tam URL'ye çevir
        if href:
            href = urljoin(base, href)
        if len(text) > 20 and href:
            results.append({"text": text[:900], "title": title, "url": href, "source": domain, "score": 0})
    return results[:15]


async def _direct_eksisozluk(product_name: str, q: str, session) -> list[dict]:
    """
    İki strateji:
    1) /?q=TERM — başlık sayfasına yönlendiyse entry'leri al;
       arama listesiyse konulara girerek filtrele.
    2) /entry/list?q=TERM — entry içerik araması.
    Engel tespit edilirse DuckDuckGo fallback devreye girer.
    """
    search_terms = _eksi_search_terms(product_name)
    all_filter_kws = [t.lower() for t in search_terms]

    all_entries: list[dict] = []
    seen_keys: set = set()
    blocked = False

    def _add(entries: list[dict]) -> None:
        for e in entries:
            key = e.get("text", "")[:60]
            if key and key not in seen_keys:
                seen_keys.add(key)
                all_entries.append(e)

    def _is_blocked(html: str, final_url: str) -> bool:
        return (
            "/giris" in final_url
            or "login" in final_url
            or "captcha" in html.lower()
            or "cf-browser-verification" in html
            or "challenge-form" in html
        )

    # Strateji 1: başlık araması
    for term in search_terms:
        tq = quote_plus(term)
        url = f"https://eksisozluk.com/?q={tq}"
        try:
            r = await session.get(url, headers=_HEADERS, timeout=20, allow_redirects=True)
            if r.status_code != 200:
                print(f"  [Ekşi/Başlık] HTTP {r.status_code} ('{term}')")
                if r.status_code in (403, 404, 503):
                    blocked = True
                continue
            final_url = str(r.url)
            html = r.text

            if _is_blocked(html, final_url):
                print(f"  [Ekşi/Başlık] '{term}': Anti-bot engeli (login/captcha yönlendirmesi)")
                blocked = True
                continue

            # Yönlendirme → başlık sayfası
            exact_match = "?q=" not in final_url
            filter_kws = [] if exact_match else all_filter_kws

            entries = _parse_eksi_entries_html(html, filter_kws)
            if entries:
                _add(entries)
                continue

            # Arama listesi → konulara gir
            topic_links = _parse_eksi_topic_links_html(html)
            for t_url in topic_links[:4]:
                try:
                    tr = await session.get(t_url, headers=_HEADERS, timeout=15)
                    if tr.status_code == 200:
                        t_entries = _parse_eksi_entries_html(tr.text, all_filter_kws)
                        _add(t_entries)
                except Exception:
                    pass
        except Exception as e:
            print(f"  [Ekşi/Başlık] '{term}': {e}")

    # Strateji 2: entry içerik araması
    if not blocked:
        for term in search_terms:
            tq = quote_plus(term)
            url = f"https://eksisozluk.com/entry/list?q={tq}"
            try:
                r = await session.get(url, headers=_HEADERS, timeout=20)
                if r.status_code != 200:
                    print(f"  [Ekşi/Entry] HTTP {r.status_code} ('{term}')")
                    continue
                e_entries = _parse_eksi_entries_html(r.text, [])
                _add(e_entries)
            except Exception as e:
                print(f"  [Ekşi/Entry] '{term}': {e}")

    # Fallback: DuckDuckGo/Google ekşi araması
    if not all_entries:
        if blocked:
            print(f"  [Ekşi] Anti-bot engeli — DuckDuckGo fallback devrede")
        else:
            print(f"  [Ekşi] Parse boş — DuckDuckGo fallback deneniyor")
        fallback = await _fetch_search_engine_fallback(q, "eksisozluk.com", session)
        for p in fallback:
            p["source"] = "eksisozluk.com"
        return fallback

    return [
        {
            "text": e["text"],
            "url": e.get("url", ""),
            "title": e.get("title", e.get("text", "")[:80]),
            "source": "eksisozluk.com",
            "score": e.get("score", e.get("likes", 0)),
        }
        for e in all_entries
        if e.get("text")
    ]


async def _direct_sikayetvar(product_name: str, q: str, session) -> list[dict]:
    url = f"https://www.sikayetvar.com/search?q={q}"
    try:
        r = await session.get(url, headers=_HEADERS, timeout=20)
        if r.status_code != 200:
            print(f"  [Forum/Direkt] sikayetvar.com: HTTP {r.status_code}")
            if r.status_code in (403, 503):
                print(f"  [Forum/Direkt] sikayetvar.com: Cloudflare engeli — DuckDuckGo fallback devrede")
                return await _fetch_search_engine_fallback(q, "sikayetvar.com", session)
            return []
        html = r.text
        # Cloudflare challenge tespiti
        if any(marker in html for marker in ("cf-browser-verification", "challenge-form", "Checking if the site connection is secure")):
            print(f"  [Forum/Direkt] sikayetvar.com: Cloudflare challenge sayfası — DuckDuckGo fallback devrede")
            return await _fetch_search_engine_fallback(q, "sikayetvar.com", session)
    except Exception as e:
        print(f"  [Forum/Direkt] sikayetvar.com: {e}")
        return []

    results = []
    # Şikayet kartları
    for m in re.finditer(
        r'<(?:article|div)[^>]*class="[^"]*(?:complaint-item|brand-complaint-item|js-complaint-list-item)[^"]*"[^>]*>(.*?)</(?:article|div)>',
        html, re.DOTALL | re.IGNORECASE,
    ):
        block = m.group(1)
        desc_m = re.search(
            r'class="[^"]*(?:description|content|summary)[^"]*"[^>]*>(.*?)</(?:div|p|span)>',
            block, re.DOTALL,
        )
        text = _strip_tags(desc_m.group(1)) if desc_m else _strip_tags(block)
        title_m = re.search(r'<h[23][^>]*>(.*?)</h[23]>', block, re.DOTALL)
        title = _strip_tags(title_m.group(1)) if title_m else ""
        link_m = re.search(r'href="(https?://[^"]+)"', block)
        href = link_m.group(1) if link_m else url
        if text and len(text) > 40:
            results.append({
                "text": text[:800],
                "title": title,
                "url": href,
                "source": "sikayetvar.com",
                "score": 0,
                "needs_full_fetch": True
            })

    # Fallback: uzun paragraflar
    if not results:
        for m in re.finditer(r'<p[^>]*>(.*?)</p>', html, re.DOTALL):
            text = _strip_tags(m.group(1))
            if len(text) > 80:
                results.append({
                    "text": text[:800],
                    "title": "",
                    "url": url,
                    "source": "sikayetvar.com",
                    "score": 0,
                    "needs_full_fetch": True
                })

    if not results:
        print(f"  [Forum/Direkt] sikayetvar.com: Parse boş (HTML {len(html)} karakter) — DuckDuckGo fallback deneniyor")
        return await _fetch_search_engine_fallback(q, "sikayetvar.com", session)

    return results[:20]


async def _direct_reddit(product_name: str, q: str, session) -> list[dict]:
    """
    Reddit JSON API. Reddit 403 döndürdüğünde Tavily zaten reddit.com'u
    kapsadığından bu katman boş dönmek yerine sessizce çıkar.
    """
    search_urls = [
        f"https://www.reddit.com/search.json?q={q}&sort=relevance&limit=15",
        f"https://www.reddit.com/r/Turkey/search.json?q={q}&restrict_sr=1&sort=relevance&limit=10",
    ]
    headers = {**_HEADERS, "Accept": "application/json"}

    results: list[dict] = []
    seen: set = set()

    for url in search_urls:
        try:
            r = await session.get(url, headers=headers, timeout=15)
            if r.status_code in (403, 429) or not r.text.strip():
                continue
            ct = r.headers.get("content-type", "")
            if "json" not in ct:
                continue
            data = r.json()
            for post in data.get("data", {}).get("children", []):
                d = post.get("data", {})
                title = d.get("title", "")
                selftext = d.get("selftext", "")
                permalink = "https://www.reddit.com" + d.get("permalink", "")
                combined = f"{title} — {selftext}".strip(" —") if selftext else title
                key = _norm_url(permalink)
                if combined and len(combined) > 10 and key not in seen:
                    seen.add(key)
                    results.append({
                        "text": combined[:900],
                        "title": title,
                        "url": permalink,
                        "source": "reddit.com",
                        "score": d.get("score", 0),
                    })
        except Exception as e:
            print(f"  [Forum/Direkt] reddit ({url[:60]}): {e}")

    return results


async def _direct_webtekno(product_name: str, q: str, session) -> list[dict]:
    """Webtekno — WordPress tabanlı haber/inceleme sitesi; <article> parse."""
    search_urls = [
        f"https://www.webtekno.com/arama?q={q}",
        f"https://www.webtekno.com/?s={q}",
        f"https://www.webtekno.com/search?q={q}",
        f"https://www.webtekno.com/search/{q}",
    ]
    for url in search_urls:
        try:
            r = await session.get(url, headers=_HEADERS, timeout=15, allow_redirects=True)
            if r.status_code != 200:
                print(f"  [Forum/Direkt] webtekno.com: HTTP {r.status_code} ({url[-40:]})")
                continue
            posts = _parse_generic_article_html(r.text, "webtekno.com")
            if posts:
                return posts
            print(f"  [Forum/Direkt] webtekno.com: Parse boş ({url[-40:]})")
        except Exception as e:
            print(f"  [Forum/Direkt] webtekno.com: {e}")
    return await _fetch_search_engine_fallback(q, "webtekno.com", session)


async def _direct_kizlarsoruyor(product_name: str, q: str, session) -> list[dict]:
    """Kızlar Soruyor — soru-cevap forumu; soru kartları parse."""
    search_urls = [
        f"https://www.kizlarsoruyor.com/arama/{q}",
        f"https://www.kizlarsoruyor.com/search?q={q}",
        f"https://www.kizlarsoruyor.com/ara?q={q}",
    ]
    results: list[dict] = []
    for url in search_urls:
        try:
            r = await session.get(url, headers=_HEADERS, timeout=15, allow_redirects=True)
            if r.status_code != 200:
                continue
            html = r.text
            for m in re.finditer(
                r'<(?:article|div|li)[^>]*class="[^"]*(?:question|soru|entry|post|item|card)[^"]*"[^>]*>(.*?)</(?:article|div|li)>',
                html, re.DOTALL | re.IGNORECASE,
            ):
                block = m.group(1)
                title_m = re.search(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', block, re.DOTALL)
                if not title_m:
                    continue
                href = title_m.group(1)
                if href.startswith("/"):
                    href = "https://www.kizlarsoruyor.com" + href
                title = _strip_tags(title_m.group(2)).strip()
                text_m = re.search(
                    r'<(?:p|div|span)[^>]*class="[^"]*(?:content|excerpt|text|description|cevap)[^"]*"[^>]*>(.*?)</(?:p|div|span)>',
                    block, re.DOTALL,
                )
                text = _strip_tags(text_m.group(1)) if text_m else title
                if len(title) > 10 and href:
                    results.append({
                        "text": text[:900],
                        "title": title,
                        "url": href,
                        "source": "kizlarsoruyor.com",
                        "score": 0,
                        "needs_full_fetch": True,
                    })
            if results:
                return results[:15]
        except Exception as e:
            print(f"  [Forum/Direkt] kizlarsoruyor.com: {e}")
    if not results:
        results = await _fetch_search_engine_fallback(q, "kizlarsoruyor.com", session)
    return results[:15]


async def _direct_instela(product_name: str, q: str, session) -> list[dict]:
    """Instela — tartışma platformu; konu/gönderi kartları parse."""
    search_urls = [
        f"https://www.instela.com/arama?q={q}",
        f"https://www.instela.com/search?q={q}",
        f"https://www.instela.com/ara?q={q}",
    ]
    results: list[dict] = []
    for url in search_urls:
        try:
            r = await session.get(url, headers=_HEADERS, timeout=15, allow_redirects=True)
            if r.status_code != 200:
                continue
            html = r.text
            for m in re.finditer(
                r'<(?:article|div|li)[^>]*class="[^"]*(?:topic|post|item|content|entry|row|card)[^"]*"[^>]*>(.*?)</(?:article|div|li)>',
                html, re.DOTALL | re.IGNORECASE,
            ):
                block = m.group(1)
                title_m = re.search(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', block, re.DOTALL)
                if not title_m:
                    continue
                href = title_m.group(1)
                if href.startswith("/"):
                    href = "https://www.instela.com" + href
                title = _strip_tags(title_m.group(2)).strip()
                text_m = re.search(
                    r'<(?:p|div|span)[^>]*class="[^"]*(?:content|excerpt|text|description)[^"]*"[^>]*>(.*?)</(?:p|div|span)>',
                    block, re.DOTALL,
                )
                text = _strip_tags(text_m.group(1)) if text_m else title
                if len(title) > 10 and href:
                    results.append({
                        "text": text[:900],
                        "title": title,
                        "url": href,
                        "source": "instela.com",
                        "score": 0,
                        "needs_full_fetch": True,
                    })
            if not results:
                results = _parse_generic_article_html(html, "instela.com")
            if results:
                return results[:15]
        except Exception as e:
            print(f"  [Forum/Direkt] instela.com: {e}")
    if not results:
        results = await _fetch_search_engine_fallback(q, "instela.com", session)
    return results[:15]
