# Scraping Mechanics — Tam Teknik Dokümantasyon

Bu belge MergeN Scrapper'ın tüm veri toplama mekanizmalarını açıklar: hangi sitelerden, hangi API/HTTP yöntemiyle, hangi fallback zincirleriyle veri çekildiğini ve çıktı formatını.

---

## İçindekiler

1. [Genel Mimari](#genel-mimari)
2. [CLI Giriş Noktası — run.py](#cli-giriş-noktası--runpy)
3. [Orkestrasyon — collector.py](#orkestrasyon--collectorpy)
4. [URL Keşfi — url_finder.py](#url-keşfi--url_finderpy)
5. [Trendyol — trendyol.py](#trendyol--trendyolpy)
6. [Hepsiburada — hepsiburada.py](#hepsiburada--hepsiburadapy)
7. [Forum Siteleri — forums.py](#forum-siteleri--forumspy)
8. [YouTube — youtube.py](#youtube--youtubepy)
9. [Çıktı Formatı](#çıktı-formatı)

---

## Genel Mimari

```
run.py
  └── collector.collect()
        ├── [Faz 1] url_finder.find_product_urls()   ← yalnızca URL yoksa
        │     └── Tavily: 5 paralel sorgu (Trendyol + HB)
        └── [Faz 2] asyncio.gather() — tümü paralel
              ├── trendyol.fetch_trendyol_reviews()
              ├── hepsiburada.fetch_hepsiburada_reviews()
              ├── trendyol.fetch_trendyol_qa()         ← Q&A
              ├── forums.fetch_forums()
              └── youtube.process_multiple_videos()
```

**Temel prensipler:**
- Tüm kaynaklar `asyncio.gather(*tasks, return_exceptions=True)` ile paralel başlatılır
- Bir kaynak başarısız olursa diğerleri çalışmaya devam eder (partial result)
- Cloudflare korumalı siteler için `curl_cffi AsyncSession(impersonate="chrome120")` kullanılır
- Tavily yalnızca URL keşfinde (`url_finder.py`) kullanılır; forum/YouTube fazında Tavily çağrısı yoktur

---

## CLI Giriş Noktası — run.py

```bash
python run.py --name "Sony WH-1000XM5"
python run.py --name "Sony WH-1000XM5" --trendyol "https://www.trendyol.com/.../p-12345"
python run.py --name "Sony WH-1000XM5" --hepsiburada "https://www.hepsiburada.com/...HBCV..."
python run.py --name "Sony WH-1000XM5" --no-forums
python run.py --name "Sony WH-1000XM5" --no-youtube
python run.py --name "Sony WH-1000XM5" --output "C:/veri"
```

| Flag | Açıklama |
|------|----------|
| `--name` | Ürün adı (zorunlu); dizin adı ve arama sorgusu olarak kullanılır |
| `--trendyol` | Manuel Trendyol URL'si (verilirse Tavily URL keşfi yapılmaz) |
| `--hepsiburada` | Manuel HB URL'si |
| `--no-forums` | Forum fazını atla |
| `--no-youtube` | YouTube fazını atla |
| `--output` | Çıktı kök dizini (varsayılan: `scraped_data/`) |

Windows'ta UTF-8 terminal sorunu için `sys.stdout` ve `sys.stderr` `utf-8` encoding ile yeniden açılır.

---

## Orkestrasyon — collector.py

### Faz 1 — URL Keşfi

`--trendyol` / `--hepsiburada` verilmemişse `url_finder.find_product_urls(product_name)` çağrılır. Bu fonksiyon Tavily ile Trendyol ve HB ürün sayfalarının URL'lerini bulur.

### Faz 2 — Paralel Veri Toplama

```python
results = await asyncio.gather(
    fetch_trendyol_reviews(product_name, trendyol_url),
    fetch_hepsiburada_reviews(product_name, hb_url),
    fetch_trendyol_qa(product_name, trendyol_url),
    fetch_forums(product_name),
    process_multiple_videos(product_name),
    return_exceptions=True,
)
```

### HB Feature Stars Sentineli

`fetch_hepsiburada_reviews()` döndüğünde listedeki ilk eleman `{"is_summary": True, "data": {...}}` ise bu özet kayıt `hb_summary` değişkenine çekilir, `reviews[]` listesine eklenmez.

### Çıktı Dosyaları

| Dosya | İçerik |
|-------|---------|
| `raw/ecommerce_all.json` | Trendyol + HB yorumları, `{"items": [...]}` |
| `raw/forum_all.json` | 9 forum sitesi gönderileri, `{"items": [...]}` |
| `raw/youtube_all.json` | Video + transkript + yorumlar + segmentler |
| `raw/qa_all.json` | Trendyol + HB soru-cevapları |
| `raw/full_archive.json` | Tüm kaynakların master kopyası |
| `gemini_distilled_input.md` | AI-ready filtrelenmiş özet markdown |
| `gemini_full_content.md` | Tüm ham içerik markdown |
| `images/` | rating_distribution, source_distribution, review_timeline, summary grafikleri |

---

## URL Keşfi — url_finder.py

### Yöntem

5 Tavily sorgusu paralel çalışır:

| # | Sorgu şablonu | Hedef |
|---|---------------|-------|
| 1 | `"{ürün}" site:trendyol.com` | Trendyol ürün sayfası |
| 2 | `"{ürün}" trendyol fiyat` | Trendyol (geniş) |
| 3 | `"{ürün}" site:hepsiburada.com` | HB ürün sayfası |
| 4 | `"{ürün}" hepsiburada fiyat` | HB (geniş) |
| 5 | `"{ürün}" hepsiburada indir` | HB (alternatif niyet) |

### URL Doğrulama

```python
# Trendyol: ürün sayfası regex
re.search(r'-p-\d+', url)

# HB: HBCV SKU'lu URL (tercihli)
re.search(r'-p-HBCV[A-Z0-9]+', url)

# HB: HBC formatı (fallback)
re.search(r'-pm-HBC', url)
```

### Çıkarma Fonksiyonları

- `extract_trendyol_id(url)` → `-p-{contentId}` kısmından sayısal ID
- `extract_hb_sku(url)` → `-p-HBCV{sku}` kısmından SKU string

---

## Trendyol — trendyol.py

### Cloudflare Bypass

```python
session = AsyncSession(impersonate="chrome120")
# Ana sayfaya ısınma isteği → CF clearance cookie alınır
await session.get("https://www.trendyol.com/", headers={...})
```

Chrome 120 TLS fingerprint kullanılır. `httpx` bu sitede 403 döndürdüğü için kullanılmaz.

### Review API

**Endpoint:**
```
GET https://apigw.trendyol.com/discovery-storefront-trproductgw-service/api/review-read/product-reviews/detailed
```

**Parametreler:**
| Parametre | Değer |
|-----------|-------|
| `contentId` | Ürün ID (URL'den çıkarılır) |
| `page` | 0-tabanlı sayfa numarası |
| `pageSize` | 50 |
| `isAZ` | false |
| `merchantId` | "" |
| `channelId` | 1 |

**Sayfalama:** İlk istek `totalCount` ve `pageCount` döner. Tüm sayfalar tek seferde paralel fetch edilir (maksimum 200 sayfa).

### Review Alanları

```json
{
  "text": "Ürün gerçekten harika...",
  "rating": 5,
  "date": "2024-01-15",
  "likes": 12,
  "source": "trendyol",
  "photos": ["https://...jpg"]
}
```

- `text` < 10 karakter olanlar atılır
- `date`: Unix millisaniye → ISO 8601 (`YYYY-MM-DD`)

### Fallback Zinciri

```
1. URL'den contentId → API çağrısı
   └── yorum yok mu? →
2. contentId ± 5 komşu ID (paralel) → yorum bulunan ilk ID kullanılır
   └── hâlâ yok mu? →
3. Trendyol arama sayfası (/sr?q=) → tüm varyant ID'leri bul (maks 30)
   └── hepsi paralel API çağrısı → yorum bulunan ilk ID
   └── hâlâ yok mu? →
4. Tavily snippet fallback (son çare; yorum metni API'den gelmiyor)
```

### Q&A Çekme

Soru-cevaplar ayrı endpoint'ten çekilir:
```
GET https://apigw.trendyol.com/.../product-questions
```
Aynı `contentId` ve sayfalama mantığı kullanılır.

---

## Hepsiburada — hepsiburada.py

### Cloudflare Bypass

Trendyol ile aynı yöntem: `AsyncSession(impersonate="chrome120")` + homepage warmup.

### Hermes Review API

**Endpoint:**
```
GET https://user-content-gw-hermes.hepsiburada.com/queryapi/v2/ApprovedUserContents
```

**Parametreler:**
| Parametre | Değer |
|-----------|-------|
| `sku` | HBCV... formatında SKU |
| `page` | 1-tabanlı |
| `pageSize` | 30 |
| `includeSummary` | true |
| `sortOrder` | mostUsefull |

**Sayfalama:** `meta.totalPageCount` ile tüm sayfalar paralel fetch edilir.

### HBCV SKU Keşfi

URL'den HBCV SKU çıkarılamıyorsa:

```
1. HB arama sayfası: GET /ara?q={ürün_adı}
   → HTML parse → product card'lardan tüm HBCV SKU'ları bul
   → Hermes API ile her SKU'nun yorum sayısını kontrol et (paralel)
   → En çok yorumlu SKU seçilir

2. HBC → HBCV dönüşümü (_resolve_hbcv):
   → HB ürün sayfasını fetch et
   → Canonical URL'den HBCV SKU'yu çıkar
```

### Feature Stars (10 Kategori)

`includeSummary=true` ile gelen özel kayıt `is_summary: True` bayrağı taşır:

```json
{
  "is_summary": true,
  "data": {
    "ses_kalitesi":       {"avg": 4.2, "count": 180},
    "mikrofon_kalitesi":  {"avg": 3.8, "count": 165},
    "sarj_performansi":   {"avg": 4.5, "count": 170},
    "malzeme_kalitesi":   {"avg": 4.1, "count": 175},
    "goruntu_kalitesi":   {"avg": 0,   "count": 0},
    "kullanim_kolayligi": {"avg": 4.6, "count": 180},
    "fiyat_performans":   {"avg": 4.0, "count": 178},
    "hiz":                {"avg": 0,   "count": 0},
    "tasarim":            {"avg": 4.3, "count": 160},
    "konfor":             {"avg": 4.4, "count": 172}
  }
}
```

Bu kayıt `reviews[]` listesine eklenmez; `collector.py` içinde `hb_summary` olarak ayrıca işlenir.

### Review Alanları

```json
{
  "text": "...",
  "rating": 4,
  "date": "2024-02-10",
  "source": "hepsiburada",
  "photos": ["..."],
  "_id": "abc123"
}
```

Dedup için `_id` alanı kullanılır.

---

## Forum Siteleri — forums.py

### Genel Akış

```python
direct_results = await _search_direct(product_name)
# → 9 site paralel, curl_cffi Chrome120
# → dedup (URL bazlı)
# → relevance filtresi (trusted siteler hariç)
```

**Tavily bu fazda kullanılmaz.** Tüm forum keşfi `_search_direct()` ile yapılır.

### Desteklenen Siteler (13 Domain, 9 Aktif Scraper)

| Site | Yöntem | Notlar |
|------|--------|--------|
| technopat.net | XenForo 2 arama | POST `/sosyal/ara/search`, 2 mod |
| donanimhaber.com | Dahili arama + fallback | `/arama?q=`, forum link öncelikli |
| forum.shiftdelete.net | XenForo generic | POST `/search/search` |
| forum.donanimarsivi.com | XenForo generic | POST `/search/search` |
| chip.com.tr | XenForo generic | POST `/search/search` |
| pchocasi.com.tr | XenForo + WordPress | XenForo → `_parse_generic_article_html` |
| eksisozluk.com | 2 strateji | `/?q=` başlık + `/entry/list?q=` içerik |
| sikayetvar.com | HTML card parse | `.complaint-item` sınıfı |
| reddit.com | JSON API | `/search.json` + `/r/Turkey/search.json` |

**Trusted siteler** (relevance filtresi atlanır): technopat, donanimhaber, shiftdelete, donanimarsivi, chip.com.tr

### XenForo Generic Arama (`_search_xenforo`)

```
POST /search/search
  body: keywords={q}&search_type=post&_xfToken={token}
  → 303 redirect → /search/{session_id}/
  → sayfa 1 fetch → toplam sayfa sayısı → hepsi paralel fetch
  → her thread link için full içerik fetch (maks 30)
```

Yanıt HTML'den post ID'leri regex ile çekilir:
```python
re.findall(r'href="[^"]*post-(\d+)"', html)
```

### Technopat (`_direct_technopat`)

```
POST /sosyal/ara/search
  body: keywords={q}&search_type=post&c[node][]=2   ← Teknoloji bölümü
```

2 paralel mod:
- `search_type=post` — içerik araması
- `search_type=post&title_only=1` — başlık araması

Sonuçlar birleştirilir, URL bazlı dedup yapılır.

### Donanımhaber (`_direct_donanimhaber`)

```
GET /arama?q={q}&aramaAlan=icerik&type=icerik
```

HTML parse → `<a>` etiketlerinden forum linkler öncelikli (`score=5`).

Forum linki sayısı < 5 ise **DuckDuckGo fallback**:
```
GET https://html.duckduckgo.com/html/?q=site:donanimhaber.com+{q}
```
DDG başarısız → **Google fallback**:
```
GET https://www.google.com/search?q=site:donanimhaber.com+{q}
```

### Ekşi Sözlük (`_direct_eksisozluk`)

2 strateji paralel çalışır:

```
Strateji 1: GET eksisozluk.com/?q={q}
  → başlık araması → konu linkleri → her konunun entry'leri

Strateji 2: GET eksisozluk.com/entry/list?q={q}
  → içerik araması → doğrudan entry listesi
```

Her konu için ilk 30 entry fetch edilir; `[~]` alıntı ve imza bölümleri temizlenir.

### Şikayetvar (`_direct_sikayetvar`)

```
GET sikayetvar.com/{ürün-slug}/sikayet
```

HTML parse → `.complaint-item` kartları → başlık + içerik + tarih + URL.

### Reddit (`_direct_reddit`)

```
GET reddit.com/search.json?q={q}&sort=relevance&t=year&limit=25
GET reddit.com/r/Turkey/search.json?q={q}&restrict_sr=true&limit=15
```

Her iki sorgu paralel çalışır. Her post için `selftext` (gövde) + `title` birleştirilir.

### Tam İçerik Fetch

Kısa snippet yerine tam thread içeriği getirilir:
- XenForo: `.bbWrapper` div içeriği
- Alıntılar (`<blockquote>`) ve imzalar kaldırılır
- Maksimum 30 gönderi per site

### Relevance Filtresi

Güvenilir (trusted) siteler hariç tüm gönderiler için:
- Ürün adındaki önemli kelimeler (stopword hariç) gönderide geçiyor mu?
- Skor eşiği: ≥ %60 kelime eşleşmesi

---

## YouTube — youtube.py

### Çevre Değişkeni

```python
api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
```

Her iki isim de kabul edilir. `.env` dosyasında `GEMINI_API_KEY` tanımlıdır.

### Video Keşfi — `search_product_videos()`

```python
ydl_opts = {
    "quiet": True,
    "extract_flat": True,
    "default_search": f"ytsearch{max_results}",
}
with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    info = ydl.extract_info(f"ytsearch{max_results}:{product_name}", download=False)
```

Her video için dönen alanlar: `video_id`, `title`, `url`.

Varsayılan `max_results = 5`.

### Transkript — `get_video_transcript()`

**Kütüphane:** `youtube_transcript_api.YouTubeTranscriptApi`

**Dil önceliği:** TR → EN → diğer diller

```python
transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
try:
    transcript = transcript_list.find_transcript(["tr"])
except:
    transcript = transcript_list.find_generated_transcript(["en", ...])
```

`return_raw=True` ile zaman damgaları metne gömülür:
```
[0.0] Merhaba bu videoda [4.2] Sony WH-1000XM5 [8.7] inceleyeceğiz
```

### Önemli Bölüm Tespiti — `get_relevant_segments()`

**Model:** `gemini-2.5-flash` (veya `GOOGLE_API_KEY`/`GEMINI_API_KEY` ile init edilen Gemini client)

Transkript maksimum 12.000 karaktere kırpılır.

**Prompt şablonu:**
```
Aşağıdaki YouTube video transkriptinde "{product_name}" ürünüyle ilgili
önemli bölümleri bul. Her bölüm için başlangıç/bitiş zaman damgası ve
neden önemli olduğunu JSON formatında döndür:
[{"start": 0.0, "end": 45.0, "reason": "Ürün tanıtımı"}]
```

Yanıt JSON parse edilir; `[{"start", "end", "reason"}]` listesi döner.

### Rate Limit Yönetimi — `safe_gemini_call()`

Üstel geri çekilme:

```
429 / RESOURCE_EXHAUSTED → retry-after header veya 60s bekle
1. deneme: bekleme süresi
2. deneme: 2x bekleme
3. deneme: 4x bekleme
Maksimum 3 retry
```

`client is None` durumunda (API key yok) açık uyarı verilir, exception fırlatılmaz.

### Paralel İşlem — `process_multiple_videos()`

```python
tasks = [process_single_video(video) for video in videos]
results = await asyncio.gather(*tasks, return_exceptions=True)
```

Her video için aynı anda transkript + yorum fetch yapılır.

### Video Yorumları

**Kütüphane:** `youtube_comment_downloader`

Popülerlik sıralı, API anahtarı gerektirmez. Varsayılan limit: en popüler 100 yorum.

```json
{"text": "...", "author": "...", "likes": 42, "time": "2 ay önce"}
```

---

## Çıktı Formatı

### schema_version: "3.0"

Tüm JSON çıktıları `schema_version: "3.0"` alanı taşır. Mevcut alanlar kaldırılmaz/yeniden adlandırılmaz.

### ecommerce.json (raw/ecommerce_all.json)

```json
{
  "product_name": "Sony WH-1000XM5",
  "collected_at": "2024-01-15T10:30:00",
  "collection_time_sec": 12.3,
  "data_sources": {
    "trendyol_review_count": 150,
    "hepsiburada_review_count": 80,
    "total_count": 230
  },
  "reviews": [
    {"text": "...", "rating": 5, "date": "2024-01-15", "source": "trendyol", "likes": 3, "photos": []}
  ],
  "hb_feature_stars": {
    "ses_kalitesi": {"avg": 4.2, "count": 180},
    "...": "..."
  },
  "schema_version": "3.0"
}
```

### forum.json (raw/forum_all.json)

```json
{
  "product_name": "Sony WH-1000XM5",
  "collected_at": "2024-01-15T10:30:00",
  "post_count": 45,
  "posts": [
    {
      "text": "...",
      "url": "https://technopat.net/...",
      "title": "Sony WH-1000XM5 incelemesi",
      "source": "technopat.net",
      "score": 5
    }
  ],
  "schema_version": "3.0"
}
```

### youtube.json (raw/youtube_all.json)

```json
{
  "product_name": "Sony WH-1000XM5",
  "collected_at": "2024-01-15T10:30:00",
  "video_count": 5,
  "total_comment_count": 300,
  "videos": [
    {
      "video_id": "dQw4w9WgXcQ",
      "title": "Sony WH-1000XM5 İnceleme",
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "transcript": "[0.0] Merhaba [4.2] bu videoda...",
      "description": "...",
      "segments": [
        {"start": 12.0, "end": 45.0, "reason": "Ses kalitesi değerlendirmesi"}
      ],
      "comments": [
        {"text": "...", "author": "...", "likes": 42, "time": "2 ay önce"}
      ]
    }
  ],
  "schema_version": "3.0"
}
```

### qa.json (raw/qa_all.json)

```json
[
  {
    "question": "Bluetooth menzili nedir?",
    "answer": "10 metre.",
    "answerer": "Satıcı",
    "date": "2024-01-10",
    "source": "trendyol"
  }
]
```

---

## Bağımlılıklar

| Paket | Amaç |
|-------|------|
| `curl_cffi` | Cloudflare bypass (Chrome 120 TLS) — Trendyol, HB, tüm forum siteleri |
| `tavily-python` | URL keşfi (yalnızca url_finder.py) |
| `yt-dlp` | YouTube video keşfi |
| `youtube-transcript-api` | YouTube transkript (API anahtarı gerektirmez) |
| `youtube-comment-downloader` | YouTube yorumları (API anahtarı gerektirmez) |
| `google-generativeai` | Gemini Flash — YouTube önemli bölüm tespiti |
| `python-dotenv` | .env yönetimi |
| `matplotlib` | Görsel grafik üretimi |
| `httpx` | Cloudflare korumasız siteler için genel HTTP |
| `beautifulsoup4` | HTML parse (forum içerikleri) |

---

## .env Konfigürasyonu

Tüm anahtarlar `MergeN/.env` dosyasından okunur (scrapper + backend ortak kaynak):

```
GEMINI_API_KEY=...      # YouTube segment tespiti + analyzer.py
TAVILY_API_KEY=...      # URL keşfi (url_finder.py)
```

`load_dotenv()` argümansız çağrıldığında CWD'den yukarıya doğru tarar; `scrapper/` dizininden çalışıldığında otomatik olarak `MergeN/.env` bulunur.
