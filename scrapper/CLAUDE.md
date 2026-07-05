# Review Scrapper — Proje Kılavuzu

## Projenin Amacı

E-ticaret sitelerindeki ürün yorumlarını, forum tartışmalarını ve YouTube içeriklerini **saniyeler içinde** toplayarak AI analizine hazır formatta kaydetmek.

Bu proje **yalnızca veri toplama** katmanıdır. AI analizi (Gemini, LangGraph vb.) bu projenin dışındadır.

---

## Ne Toplanıyor?

| Kaynak | İçerik | Araç |
|--------|---------|------|
| Trendyol | Ürün yorumları (metin, yıldız, tarih) | curl_cffi → Trendyol Review API |
| Hepsiburada | Ürün yorumları (metin, yıldız, tarih) | curl_cffi → HB Hermes API |
| Forum siteleri | Thread içerikleri, kullanıcı gönderileri, şikayetler | Tavily (katman 1) + curl_cffi direkt HTTP (katman 2) |
| YouTube | Video transkriptleri + video yorumları | Tavily + yt-dlp keşif, yt-dlp transkript, youtube-comment-downloader |

**Forum siteleri:** donanimhaber.com, technopat.net, webtekno.com, forum.shiftdelete.net, forum.donanimarsivi.com, pchocasi.com.tr, sikayetvar.com, eksisozluk.com, reddit.com

---

## Mimari

```
run.py                  ← CLI giriş noktası
collector.py            ← Ana orkestratör (asyncio.gather ile tümü paralel)
tools/
  url_finder.py         ← Tavily ile Trendyol/HB URL keşfi
  trendyol.py           ← curl_cffi CF bypass → Trendyol API yorum çekme
  hepsiburada.py        ← curl_cffi CF bypass → HB Hermes API yorum çekme
  forums.py             ← Tavily (4 paralel sorgu) + Playwright direkt arama
  youtube.py            ← Tavily + yt-dlp video keşfi, transkript, yorumlar
scraped_data/           ← Çıktılar buraya kaydedilir
  <Ürün_Adı>/
    ecommerce.json      ← Trendyol + HB yorumları, star rating'li (schema_version: 3.0)
    forum.json          ← Forum gönderileri, discussion-based (schema_version: 3.0)
    youtube.json        ← YouTube video transkriptleri + video yorumları (schema_version: 3.0)
    qa.json             ← Soru-Cevap verileri (Claude Code yönetir, dokunulmamalı)
    gemini_input.md     ← Gemini'ye doğrudan gönderilebilir birleşik markdown
    raw_data.json       ← Ham debug verisi
    images/             ← Görsel grafikler (rating_distribution, source_distribution, review_timeline, summary)
```

**Eski dosyalar (aktif kullanılmıyor):**
- `main.py` — ilk versiyon, Playwright tabanlı, `collector.py` ile değiştirildi
- `analyzer.py` — standalone Gemini analiz aracı, scraping akışının dışında

---

## Hız Hedefi ve Paralelllik Stratejisi

**Hedef:** Ürün başına 5–15 saniye (forum direkt araması dahilse ~10-20s)

Tüm kaynaklar `asyncio.gather()` ile aynı anda başlatılır:
- Trendyol sayfaları paralel çekilir (tüm review sayfaları aynı anda)
- Hepsiburada sayfaları paralel çekilir
- Forum Tavily sorguları (4 adet) paralel çalışır
- Forum curl_cffi direkt HTTP araması Tavily ile aynı anda başlar; forum siteleri kendi aralarında da paralel
- YouTube: Tavily + yt-dlp keşfi paralel, her video için transkript + yorum paralel

**Playwright projede kullanılmaz.** Trendyol ve HB için curl_cffi + doğrudan API çağrıları, forum siteleri için curl_cffi direkt HTTP + HTML/JSON parse kullanılır.

---

## Cloudflare Bypass Stratejisi

Trendyol ve Hepsiburada Cloudflare arkasındadır:
- `curl_cffi` ile Chrome 120 TLS fingerprint kullanılır
- Session açılmadan önce ana sayfaya istek atılarak CF clearance cookie alınır
- httpx ile yapılan istekler 403 döner, bu nedenle httpx E-ticaret sitelerinde kullanılmaz

---

## Fallback Zinciri

**Trendyol:**
1. URL'den çıkarılan `contentId` ile API → yorum yoksa
2. Trendyol arama sayfasından tüm varyant ID'leri bul → paralel API çağrısı → yorum yoksa
3. Tavily snippet fallback

**Hepsiburada:**
1. Verilen HBCV SKU ile Hermes API → SKU yoksa veya HBCV formatında değilse
2. HB arama sayfasından en çok yorumlu HBCV SKU'yu bul → Hermes API

**Forum:**
1. Tavily (4 paralel sorgu, farklı arama niyetleri)
2. Playwright direkt arama (her sitenin kendi arama motoru)

**YouTube:**
1. Tavily + yt-dlp video keşfi paralel
2. Transkript: yt-dlp json3 altyazı (TR → EN → diğer diller)
3. Yorumlar: youtube-comment-downloader (popülerlik sıralı, limitsiz)

---

## AI'a Hazır Çıktı Formatı

### `ecommerce.json` — Trendyol + Hepsiburada Yorumları

```json
{
  "product_name": "...",
  "collected_at": "ISO-8601",
  "collection_time_sec": 12.3,
  "data_sources": {
    "trendyol_review_count": 150,
    "hepsiburada_review_count": 80,
    "total_count": 230
  },
  "reviews": [
    {"text": "...", "rating": 5, "date": "2024-01-15", "source": "trendyol"}
  ],
  "schema_version": "3.0"
}
```

### `forum.json` — Forum Gönderileri

```json
{
  "product_name": "...",
  "collected_at": "ISO-8601",
  "post_count": 45,
  "posts": [
    {"text": "...", "url": "...", "title": "...", "source": "technopat.net"}
  ],
  "schema_version": "3.0"
}
```

### `youtube.json` — Transkriptler + Video Yorumları

```json
{
  "product_name": "...",
  "collected_at": "ISO-8601",
  "video_count": 5,
  "total_comment_count": 300,
  "videos": [
    {
      "video_id": "...",
      "title": "...",
      "url": "...",
      "transcript": "[0.0] Tam transkript [4.2] zaman damgaları [263.4] metne gömülü...",
      "description": "...",
      "comments": [{"text": "...", "author": "...", "likes": 42, "time": "..."}]
    }
  ],
  "schema_version": "3.0"
}
```

### `qa.json` — Soru-Cevap (Claude Code yönetir)

```json
[
  {"question": "...", "answer": "...", "answerer": "...", "date": "...", "source": "trendyol"}
]
```

### `images/` — Görsel Grafikler

- `rating_distribution.png` — Puan dağılımı bar grafik
- `source_distribution.png` — Kaynak dağılımı pasta grafik
- `review_timeline.png` — Aylık yorum trendi
- `summary.png` — Özet kart

---

## CLI Kullanımı

```bash
# Temel kullanım
python run.py --name "Sony WH-1000XM5"

# Manuel URL ile (URL keşfi için Tavily çağrısı yapılmaz)
python run.py --name "Sony WH-1000XM5" --trendyol "https://www.trendyol.com/.../p-12345"

# Forum verisini atla (daha hızlı)
python run.py --name "Sony WH-1000XM5" --no-forums

# YouTube verisini atla
python run.py --name "Sony WH-1000XM5" --no-youtube

# Özel çıktı klasörü
python run.py --name "Sony WH-1000XM5" --output "C:/veri"
```

---

## Geliştirme Kuralları

1. **Playwright projede kullanılmaz.** E-ticaret için curl_cffi API çağrıları, forum siteleri için curl_cffi HTTP + HTML/JSON parse kullanılır. Yeni kaynak eklenirken de Playwright tercih edilmemeli.

2. **Her yeni kaynak tool kendi modülü olur** (`tools/` altında), `collector.py`'ye sadece `asyncio.gather` satırı eklenir.

3. **Hız birinci önceliktir.** Yeni bir kaynak eklendiğinde mutlaka mevcut gather akışına paralel bağlanmalı, sıralı çalışmamalı.

4. **Çıktı şeması (`ai_input.json`) sabit tutulur.** AI tarafının bağımlılığı bu formata karşıdır. Yeni alan eklenebilir ama mevcut alanlar kaldırılmaz/yeniden adlandırılmaz. `schema_version` değiştirilirken dikkat edilir.

5. **Dedup zorunludur.** Aynı yorum/gönderi birden fazla API çağrısında gelebilir. Her toplayıcı kendi içinde metin veya ID bazlı dedup uygular.

6. **Hata durumunda partial result dön, exception fırlatma.** `asyncio.gather(*tasks, return_exceptions=True)` kullanımı standarttır. Bir kaynak başarısız olursa diğerleri çalışmaya devam eder.

7. **`collector.py` ve `run.py` aktif kod tabanıdır.** `main.py` eski versiyon olarak referans için duruyor, dokunulmamalı.

---

## Bağımlılıklar

```
curl_cffi                  — Cloudflare bypass + forum direkt HTTP (Chrome TLS fingerprint)
httpx                      — Genel HTTP istemcisi (CF korumasız siteler)
tavily-python              — Arama motoru API (forum + YouTube + URL keşfi)
yt-dlp                     — YouTube video keşfi + transkript (json3 altyazı)
youtube-comment-downloader — YouTube video yorumları (API anahtarsız, popülerlik sıralı)
python-dotenv              — .env yönetimi
google-generativeai        — (analyzer.py için, scraping akışından bağımsız)
matplotlib                 — Görsel grafik üretimi (images/ klasörü)
```

`.env` dosyasında olması gerekenler:
```
TAVILY_API_KEY=...
GEMINI_API_KEY=...   # Sadece analyzer.py için
```
