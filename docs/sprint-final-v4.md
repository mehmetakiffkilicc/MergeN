# ALIŞVERİŞ RÖNTGENİ — FİNAL SPRINT v4.0
## 11-19 Mayıs 2026 | 9 Gün | 2 Kişi | Multimodal Manipülasyon Röntgeni

> **v4.0 — Browser Extension + Web App hibrit mimarisi onaylandı.**
> AI coding asistanları (Claude Code, Antigravity) ile geliştirme yapılacak → 
> süre tahminleri ~1.8-2x hız çarpanıyla revize edildi.
>
> **Ürün modeli:** Web app = tam dashboard (ana ürün). Browser extension = hafif client 
> (mini dashboard, aynı backend'e API call). İkisi birbirini tamamlar.
>
> **Yeni eklenenler (v3→v4):** Browser extension (MUST), multimodal video analizi, 
> görsel doğrulama, ağırlıklı güven skoru, karşı-argüman ajanı, forum entegrasyonu.
>
> **Konumlandırma:** "Sahte yorum tespit aracı" değil → 
> **"Multi-source manipülasyon röntgeni + browser extension + AI karar danışmanı"**

---

## MİMARİ GENEL BAKIŞ (v4.0)

```
┌─────────────────────────────────────────────────┐
│  BACKEND (FastAPI)                               │
│  /api/analyze (SSE streaming)                    │
│  /api/analyze/summary (extension için hafif)     │
│  /api/chat                                       │
│  5 Ajan: Research → Xray → Analysis →            │
│          Advisor → Challenger                    │
│  SQLite cache + Tavily + Gemini + YouTube         │
│  CORS: localhost:3000 + chrome-extension://       │
└────────────────┬────────────────┬────────────────┘
                 │                │
         HTTPS API          HTTPS API
                 │                │
┌────────────────┴───┐  ┌────────┴─────────────────┐
│  WEB APP (Next.js)  │  │  BROWSER EXTENSION (MV3) │
│  Tam dashboard      │  │  Mini dashboard           │
│  - Trust Panel      │  │  - Güven skoru badge      │
│  - Manipulation DNA │  │  - Manipülasyon özeti     │
│  - Video Insights   │  │  - Karar badge            │
│  - Image Verify     │  │  - "Detay →" web link     │
│  - Decision Report  │  │                           │
│  - Chat Panel       │  │  Content Script:          │
│  - Kişiselleştirme  │  │  - Trendyol/HB floating   │
│                     │  │    "Röntgen" butonu        │
│  URL: localhost:3000 │  │  - Ürün adı/URL extract   │
│  (veya Vercel)      │  │                           │
└─────────────────────┘  └───────────────────────────┘
```

**Extension ne gösterir (mini dashboard):**
- Güven skoru gauge (0-100, renkli)
- Manipülasyon özeti (4 katman, tek satır: "Yorum ⚠️ Fiyat ✓ Görsel ✓ İddia ⚠️")
- Karar badge (AL / KOŞULLU / ALMA)
- 2-3 kritik bulgu (en önemli sahte sinyal, fiyat uyarısı)
- "Detaylı Rapor →" butonu (web app'e yönlendirir)

**Extension ne YAPMAZ:**
- Chat paneli yok (web app'te)
- Kişiselleştirme formu yok (web app'te)
- Video insights detayı yok (web app'te)
- Karşılaştırma yok (web app'te)


### Önceki plandan değişen kararlar

| Karar | v2.0 | v3.0 | Neden |
|-------|------|------|-------|
| ChromaDB | Var | **Çıkar** | Use case yok, sadece stack şişirme |
| Karşılaştırma modu (2 ürün yan yana) | Gün 5 | **NICE HAVE - atlanabilir** | Scope yiyici, ana akış değil |
| Bonus satıcı ajanı | Gün 6 | **Tamamen çıkar** | Yer açar, internal data yok zaten |
| Browser extension | "Gelecek vizyon" | **MUST HAVE — mini dashboard + content script** | Demo'nun merkezi, kullanıcı değeri en yüksek |
| Karşı-argüman ajanı | Yok | **MUST HAVE eklendi** | Agentic iddiasını kanıtlayan tek özellik |
| Multimodal video analizi | Transkript only | **MUST HAVE** | Gemini'nin asıl avantajı |
| Ürün görseli doğrulama | Yok | **MUST HAVE eklendi** | Rakipsiz, demo'da şok anı |
| Forum entegrasyonu | Belirsiz | **MUST HAVE - net** | Türkiye için diferansiyatör |
| Manipülasyon DNA radar | Yok | **SHOULD HAVE (4 katman)** | Sunum derinliği |
| Röntgen slider UI | Yok | **SHOULD HAVE (hafif versiyon)** | Proje kimliği |

---

## BÖLÜM 1: ÖZELLİK ÖNCELİKLENDİRME MATRİSİ

### P0 — MUST HAVE (eksiklerse proje teslime gitmez)

| Özellik | Süre (AI ile) | Bağımlılık | Risk |
|---------|---------------|------------|------|
| Backend altyapı: FastAPI + LangGraph + cache | 0.5 gün | - | Düşük |
| Frontend altyapı: Next.js dashboard iskelet | 0.5 gün | - | Düşük |
| Araştırma ajanı: Tavily + Trendyol + Hepsiburada + Forum | 1 gün | Tavily testi | Orta |
| Röntgen ajanı: sahte yorum + fiyat + iddia (3 alt-görev) | 1.5 gün | Araştırma | Orta |
| Analiz ajanı: kategori skorları + güçlü/zayıf yön | 0.5 gün | Röntgen | Düşük |
| Danışman ajanı: kişiselleştirme + karar raporu | 0.5 gün | Analiz | Düşük |
| **Karşı-argüman ajanı (challenger pattern)** | 0.3 gün | Danışman | Düşük |
| Ağırlıklı güven skoru formülü + görsel breakdown | 0.3 gün | Röntgen | Düşük |
| **Multimodal video analizi (en az 1 ürün için)** | 0.7 gün | Gemini Vision testi | **Yüksek** |
| **Ürün görseli doğrulama (Gemini Vision)** | 0.3 gün | Vision testi | Orta |
| Dashboard: güven paneli + analiz paneli + karar | 1 gün | Backend API'ler | Orta |
| AI Chat (sohbet paneli) | 0.3 gün | Backend | Düşük |
| **Browser Extension (mini dashboard + content script)** | 1 gün | Backend API + Web UI | Orta |
| Cache (SQLite) + 3 demo ürünü pre-cache | 0.3 gün | Tüm pipeline | Düşük |
| README + demo dokümantasyon | 0.3 gün | - | Düşük |
| 1 dk demo videosu | 0.5 gün | UI tamam | Düşük |

**Toplam P0:** ~9.5 adam-günü (AI ile) → 2 kişi paralel × 5-6 gün → **3 gün buffer**

### P1 — SHOULD HAVE (önemli ama yetişmezse demo etkilenmez)

| Özellik | Süre | Faydası |
|---------|------|---------|
| **Manipülasyon DNA radar chart (4 katman)** | 0.5 gün | Sunum derinliği, görsel etki |
| **Röntgen slider UI (hafif: tek kart fade transition)** | 0.5 gün | Proje kimliği |
| **Reviewer güvenilirliği skoru** | 1 gün | "Kaynağın kaynağı" agentic argümanı |
| **Kaynaklar arası çelişki tespiti** | 0.5 gün | "AI bunu nasıl yaptı?" anı |
| SSE streaming (faz bazlı UI doluşu) | 1 gün | Demo görselliği |
| 50 yorum elle etiketleme + validation set | 0.5 gün | Jüri "doğruluk?" sorusuna cevap |
| Forum'dan en az 3 thread için derin analiz | 0.5 gün | Türkiye odaklılık vurgusu |

### P2 — NICE TO HAVE (vakit kalırsa, atlanabilir)

| Özellik | Süre | Risk |
|---------|------|------|
| Karşılaştırma modu (2 ürün yan yana) | 1 gün | Yüksek scope risk |
| Sahte yorum dedektifi mini-oyun | 0.5 gün | Düşük, viral potansiyel |
| Kullanıcı hafızası / karar geçmişi | 1 gün | Orta, persist katmanı gerek |
| Dark mode | 0.25 gün | Düşük, kolay |
| Aciliyet manipülasyonu tespiti ("son 2!", "47 kişi bakıyor") | 0.5 gün | Düşük, ama zayıf veri |

### P3 — KESİN ÇIKAR (scope'a hiç sokmayın)

- ChromaDB / Vector DB
- Embedding-based semantic search
- Bonus satıcı ajanı (internal data yok)
- Mobil uygulama
- 5+ farklı kategori desteği (sadece kulaklık)
- Sosyal kanıt manipülasyon tespiti (sponsorlu içerik detection — vakit yok)
- Multi-user / auth sistemi
- Deploy to production (opsiyonel, video yeterli)
- Trendyol/Hepsiburada dışında site desteği (v2 vizyonu olarak README'de belirt)

---


---

### GÜN 1 — 11 MAYIS PAZARTESİ (BUGÜN)

**Tema:** Varsayım doğrulama + çekirdek kurulum + pivot kararı

**Bugün bitmeden cevaplanmış olması gereken sorular:**
- Tavily'den ne kadar gerçek yorum çekebiliyoruz?
- Forum filtreleme çalışıyor mu?
- Gemini Vision video kesitini ne kadar hızlı ve doğru analiz ediyor?
- Hangi Gemini modelleri gerçekten erişilebilir, hangi rate limit'ler altında?

#### KİŞİ A (Backend) — 11 Mayıs

**SABAH BLOĞU (09:00-13:00) — Varsayım Testleri [P0]**

1. **(45 dk) Tavily Trendyol/Hepsiburada test**
   - 3 farklı ürün için test sorgusu at: "Sony WH-1000XM5 yorum site:trendyol.com"
   - Dönen snippet sayısı, içerik kalitesi, gerçek yorum metni var mı kontrol et
   - **Kayıt:** `docs/tavily-test-results.md` — her sorgu ve sonuç sayısı
   - **Beklenen:** Ürün başına 10+ farklı yorum snippet
   - **Eşik:** < 5 yorum çekebiliyorsa Plan B düşün

2. **(45 dk) Tavily forum testi**
   - Aynı 3 ürün için: `include_domains=["donanimhaber.com","technopat.net","sikayetvar.com","eksisozluk.com","webtekno.com"]`
   - Forum thread'lerinin kaç tanesinin URL'i geliyor?
   - Snippet'lerde gerçek tartışma içeriği var mı, sadece sayfa başlığı mı?
   - **Eşik:** En az 2 forum platformundan içerik gelmiyorsa, manuel curated URL listesi yapacaksın

3. **(30 dk) Gemini model erişim doğrulama**
   - Google AI Studio'da hesabı doğrula
   - `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` erişimini test et
   - Free tier günlük limitleri not al (input token, output token, video token, RPM)
   - **NOT:** Eğer 2.5 yoksa 2.0'a düş, ama model isimlerini hardcode etme — `.env`'de değişken tut

4. **(45 dk) Gemini Vision video test — KRİTİK**
   - YouTube'dan örnek kulaklık inceleme videosu seç
   - `yt-dlp` ile 30 saniyelik kesit indir
   - Gemini API'ye base64 olarak gönder, sorgu: "Bu videoda reviewer hangi spec değerlerini sözel veya görsel olarak gösteriyor? Madde madde say."
   - **Ölç:** Süre (< 15sn olmalı), doğruluk (gözle kontrol), token kullanımı (free tier'da kaç kez yapabilirsin?)
   - **Eşik:** 60 saniyeden uzun sürüyorsa veya saçma cevap dönüyorsa, multimodal video'yu MUST'tan SHOULD'a düşür

5. **(15 dk) Karar noktası**
   - 4 testin özetini yaz
   - 1+ test kırmızıysa, Plan B'yi netleştir
   - Kişi B ile öğle yemeği sync (ekipçe ilk büyük karar)

**ÖĞLEDEN SONRA BLOĞU (14:00-19:00) — Çekirdek Kurulum**

6. **(30 dk) GitHub repo + klasör yapısı**
   - Private başlat, 19 Mayıs'ta public'e çevireceksin
   - `.gitignore`: `.env`, `__pycache__`, `*.db`, `node_modules`, `.next`, `dist`
   - `.env.example`: `GEMINI_API_KEY`, `TAVILY_API_KEY`, `BACKEND_URL`
   - Brach stratejisi: `main` (stable), `dev` (günlük commit'ler) — basit tut

7. **(20 dk) Python virtualenv + requirements.txt**
   - Python 3.11+, venv
   - Paketler: `fastapi`, `uvicorn[standard]`, `pydantic`, `httpx`, `google-generativeai`, `tavily-python`, `youtube-transcript-api`, `langgraph`, `langchain-google-genai`, `python-dotenv`, `aiosqlite`
   - **NOT:** ChromaDB EKLEMEZSİN

8. **(30 dk) `config.py` + Pydantic settings**
   - Tüm env değişkenlerini Pydantic BaseSettings ile yükle
   - Model isimleri burada: `MODEL_FLASH`, `MODEL_PRO`, `MODEL_VISION`
   - Default değerlerle çalışan bir test yaz

9. **(45 dk) `main.py` FastAPI iskelet**
   - CORS middleware (`http://localhost:3000` allow)
   - `/health` endpoint
   - `/api/analyze` endpoint stub (henüz logic yok, sadece state döner)
   - `/api/chat` endpoint stub
   - SSE endpoint için altyapı düşün: `EventSourceResponse` veya manuel async generator

10. **(45 dk) Gemini SDK bağlantı testi**
    - 3 model için 3 ayrı test fonksiyonu yaz: `test_flash()`, `test_pro()`, `test_vision()`
    - Yapılandırılmış JSON çıktı testi (response_mime_type="application/json")
    - Hata yönetimi: rate limit, timeout, model unavailable

11. **(60 dk) `tools/web_search.py` — Tavily wrapper**
    - `search_reviews(product_name)` — Trendyol + Hepsiburada filtreli
    - `search_forums(product_name)` — 5 forum domain'i filtreli
    - `search_price_history(product_name)` — Akakce + Cimri filtreli
    - `search_youtube_reviews(product_name)` — youtube.com filtreli, video URL listesi döner
    - **NOT:** Her fonksiyon raw Tavily response'u + parsed clean dict ikisini döndürsün (debug için)

12. **(45 dk) `tools/cache_manager.py` — SQLite**
    - `init_db()`, `get(product_id)`, `set(product_id, data, ttl_days)`, `is_expired(product_id)`
    - JSON blob olarak sakla, expires_at sütunu
    - Migration'a gerek yok — tek tablo, basit

13. **(45 dk) `models/schemas.py` — ProductState Pydantic**
    - Önceki plandaki yapıyı koru, ama EKLE:
      - `manipulation_dna: dict` (4 katman skoru)
      - `counter_argument: Optional[str]` (karşı-argüman ajanı çıktısı)
      - `weighted_trust_score: dict` (ağırlıklı skor breakdown'u)
      - `image_verification: Optional[dict]` (görsel doğrulama)
      - `video_analysis: List[dict]` (multimodal video çıktıları)

**AKŞAM SYNC (19:30-20:00)**
- Kişi A + Kişi B 10 dk konuşma
- Bugün ne çalıştı, ne çalışmadı?
- Hangi varsayım kırmızı? Plan B aktif mi?
- Yarın için blocker var mı?

**Gün 1 Kontrol Listesi:**
- [ ] 3 varsayım testi sonucu dokümante edildi
- [ ] GitHub repo aktif, ilk commit atıldı
- [ ] FastAPI çalışıyor (`/health` 200 dönüyor)
- [ ] Gemini Flash + Pro + Vision API'lere bağlanılıyor
- [ ] Tavily API çalışıyor (4 fonksiyon test edildi)
- [ ] SQLite cache read/write çalışıyor
- [ ] ProductState şeması son halini aldı

---

#### KİŞİ B (Frontend) — 11 Mayıs

**SABAH BLOĞU (09:00-13:00) — Next.js + UI iskelet**

1. **(30 dk) `npx create-next-app frontend`**
   - TypeScript + Tailwind + App Router + ESLint + src/ kullanma (root düzeyde)
   - `npm install`: `framer-motion`, `recharts`, `lucide-react`, `clsx`, `react-markdown`
   - **NOT:** `chart.js` yerine `recharts` daha React-friendly

2. **(20 dk) Tailwind config + tasarım sistemi**
   - Renk paleti: 
     - Primary: koyu mavi/turkuaz (güven)
     - Danger: kırmızı (sahte/manipülasyon)
     - Warning: amber/sarı (şüpheli)
     - Success: yeşil (temiz)
   - Font: Inter veya Geist (Next.js default)
   - Dark mode için CSS variable yapısı kur (`globals.css`)

3. **(45 dk) Layout iskelet**
   - `app/layout.tsx` — header (logo + tema toggle), main content area, footer
   - `app/page.tsx` — boş hero + search bar yeri
   - Mobile-first 2 sütun grid yapısı: sol (giriş + arama) + sağ (sonuçlar)
   - Tailwind `container mx-auto px-4` ile padding

4. **(45 dk) `lib/types.ts` — TypeScript interface'leri**
   - Backend `ProductState`'ın tam aynası
   - `TrustScore`, `ManipulationDNA`, `ClaimResult`, `VideoAnalysis`, `ImageVerification` ayrı tip
   - Helper types: `Phase`, `Recommendation` enum'ları

5. **(60 dk) `lib/api.ts` — Backend API client**
   - `analyzeProduct(input)` — POST `/api/analyze`
   - `streamAnalysis(input, onPhase, onComplete)` — SSE consumer
   - `chat(question, state)` — POST `/api/chat`
   - Tüm error case'leri (network, timeout, API error)

6. **(40 dk) `lib/mockData.ts` — Mock veri**
   - 2 ürün için tam ProductState mock'u (Sony WH-1000XM5, Apple AirPods Pro)
   - Backend bağlantısı yokken UI'ı test edebileceğin tam zengin veri
   - Frontend Gün 3-4'te backend'e bağlanacak; o zamana kadar mock ile çalışılacak

**ÖĞLEDEN SONRA BLOĞU (14:00-19:00) — Çekirdek bileşenler**

7. **(45 dk) `components/SearchBar.tsx`**
   - Büyük input field + "Röntgenden Geçir" CTA butonu
   - Placeholder: "Ürün adı veya Trendyol/Hepsiburada linki"
   - Loading state (disabled + spinner)
   - Hata mesajı state'i

8. **(60 dk) `components/PhaseIndicator.tsx`**
   - 4 adımlı progress: Araştırma → Röntgen → Analiz → Karar
   - Aktif faz: vurgulu + pulsing animasyon
   - Tamamlanan faz: ✓ check icon
   - Bekleyen faz: soluk
   - Framer Motion ile geçişler

9. **(45 dk) `components/LoadingXray.tsx`**
   - "Röntgen taranıyor" animasyonu — yatay tarama çizgisi (gradient + animate)
   - Alt yazı dinamik: "1.247 yorum toplanıyor..." → "Sahte sinyaller analiz ediliyor..." → vs.
   - Tailwind + CSS keyframes ile yap, kütüphane gerekmez

10. **(60 dk) `components/SourceAnalysis.tsx`**
    - Kaynak dağılım kartı: Trendyol X yorum, Hepsiburada Y yorum, Forum Z thread, YouTube N video
    - Her kaynak için ikon + sayı + progress bar
    - Recharts pie chart ile dağılım

11. **(30 dk) Routing + state management düşüncesi**
    - Şimdilik tek sayfa, useState yeterli
    - İleride Zustand veya Context lazım olabilir (chat history için)
    - Bugün karar verme — gerek olunca eklersin

12. **(20 dk) İlk commit + Vercel deploy testi**
    - Mock veriyle dashboard'u Vercel'e deploy et
    - Çalışan link al, README'ye eklemek için sakla
    - **NOT:** Bu deploy zaten dev için, demo değil

**Gün 1 Kontrol Listesi:**
- [ ] `npm run dev` ile dashboard görünüyor
- [ ] SearchBar + PhaseIndicator + LoadingXray çalışıyor
- [ ] Mock veriyle SourceAnalysis render oluyor
- [ ] TypeScript hatasız compile
- [ ] Vercel preview deploy çalışıyor (opsiyonel)

---

### GÜN 2 — 12 MAYIS SALI

**Tema:** Araştırma ajanı + dashboard temel paneller

#### KİŞİ A (Backend) — Araştırma Ajanı [P0]

**SABAH (09:00-13:00)**

1. **(45 dk) `tools/youtube_tool.py`**
   - `get_video_metadata(video_id)` — başlık, kanal adı, açıklama, abone sayısı (yt-dlp veya YouTube oEmbed)
   - `get_transcript(video_id)` — `youtube-transcript-api`, Türkçe öncelikli, otomatik altyazı fallback
   - `download_clip(video_id, start_sec, duration_sec)` — `yt-dlp` ile parça indirme (multimodal için)
   - `find_keyword_moments(transcript, keywords)` — transkripte ANC, pil, ses, mikrofon kelimelerinin geçtiği saniye listesi

2. **(60 dk) `agents/research_agent.py`**
   - Input: `product_name` (zorunlu), `product_url` (opsiyonel)
   - 4 paralel görev (`asyncio.gather`):
     - Trendyol + Hepsiburada yorum toplama (Tavily)
     - Forum thread toplama (Tavily, filtered)
     - YouTube video bulma (Tavily youtube.com filtered, max 3 video)
     - Fiyat geçmişi (Tavily Akakce/Cimri)
   - Çıktı: `raw_reviews`, `forum_threads`, `youtube_videos`, `price_data` listesi
   - **KRİTİK:** Her veri kaynağı için "source" metadata'sı tut (yorumun nereden geldiği önemli)

3. **(45 dk) Veri normalizasyonu**
   - Yorum şeması: `{text, source, date_if_available, length, stars_if_available}`
   - Tüm kaynaklardan gelen yorumları tek formatta birleştir
   - Çok kısa (< 10 karakter) ve duplicate'leri filtrele

4. **(30 dk) Tavily API maliyet izleme**
   - Her search çağrısını logla (kaç search, hangi sorgu)
   - Free tier 1000/ay limitini dashboard'da göster
   - **Hedef:** Ürün başına max 12 search call

**ÖĞLEDEN SONRA (14:00-19:00)**

5. **(60 dk) `agents/supervisor.py` — LangGraph iskelet**
   - StateGraph(ProductState) oluştur
   - Node'lar: `research`, `xray` (placeholder), `analysis` (placeholder), `advisor` (placeholder), `challenger` (placeholder)
   - Edge'ler: research → xray → analysis → advisor → challenger → END
   - `app.invoke(initial_state)` ile çalıştırma test et

6. **(45 dk) FastAPI endpoint: `POST /api/analyze`**
   - Input: `{product_name?, product_url?}`
   - Cache kontrolü → varsa direkt dön (cached: true flag'iyle)
   - Yoksa supervisor'ı çağır, sonucu cache'e yaz, döndür
   - Hata yönetimi: timeout (60sn), Gemini rate limit retry, Tavily fail

7. **(30 dk) Test: "Sony WH-1000XM5" tam araştırma akışı**
   - Endpoint'i Postman/curl ile çağır
   - Kaç yorum, kaç forum, kaç video çektiğini kontrol et
   - **Hedef:** 30-50 e-ticaret yorumu + 2-5 forum thread + 2-3 YouTube videosu

8. **(45 dk) Logging + observability**
   - Her ajan giriş/çıkış JSON'unu disk'e yaz (debug için)
   - Süre logla (her ajan kaç saniye sürdü)
   - Token kullanımı logla (Gemini cost tracking)

9. **(30 dk) Frontend ile entegrasyon koordinasyonu**
   - Kişi B ile sync: endpoint shape onaylanıyor mu?
   - CORS sorunu var mı?

**Gün 2 Kontrol Listesi (Kişi A):**
- [ ] Araştırma ajanı 4 paralel görev çalıştırıyor
- [ ] "Sony WH-1000XM5" için real data dönüyor
- [ ] LangGraph graph kurulu (placeholder node'larla)
- [ ] `/api/analyze` endpoint çalışıyor, cache entegre
- [ ] Tavily call count tracking aktif

#### KİŞİ B (Frontend) — Dashboard kartları [P0]

**SABAH (09:00-13:00)**

1. **(60 dk) `components/trust/TrustPanel.tsx` (container)**
   - Üç alt kart için container
   - Faz durumuna göre fade-in animasyonu

2. **(75 dk) `components/trust/TrustScore.tsx`**
   - Gauge görselleştirme (Recharts veya SVG manuel)
   - 0-100 skor, renkli (kırmızı/sarı/yeşil)
   - Skor altında **breakdown:** "Forum: 35%, YouTube: 30%, E-ticaret: 20%, İddia: 15%"
   - Tooltip: her kaynak ağırlığı neden böyle?

3. **(60 dk) `components/trust/FakeReviewCard.tsx`**
   - Sahte yorum oranı + temizlenmiş puan vs resmi puan karşılaştırması
   - 2-3 örnek "yüksek şüpheli" yorum göster (yorum + tetikleyen sinyaller)
   - **DİL:** "Sahte tespit edildi" değil, "Yüksek şüphe sinyali"

**ÖĞLEDEN SONRA (14:00-19:00)**

4. **(45 dk) `components/trust/PriceAlertCard.tsx`**
   - Mevcut fiyat + son 30 günün en düşük fiyatı + gerçek indirim oranı
   - Sahte indirim varsa kırmızı banner
   - Mini fiyat geçmişi line chart (Recharts)

5. **(60 dk) `components/trust/ClaimTable.tsx`**
   - İddia | Gerçeklik | Skor | Özet sütunlu tablo
   - Her satır renk kodlu (yeşil ✓ / sarı ⚠ / kırmızı ✗)
   - Mobile'da accordion'a dönüştür

6. **(45 dk) `hooks/useAnalysis.ts`**
   - SSE consumer hook'u
   - Faz değişimlerini state'e yansıt
   - Hata durumlarını yönet

7. **(30 dk) Mock veri ile tam koruma paneli render**
   - mockData.ts'i kullanarak tüm trust/* bileşenleri test et
   - Görsel sorunları düzelt (mobile + desktop)

8. **(60 dk) Backend entegrasyonu — ilk gerçek bağlantı**
   - SearchBar → POST /api/analyze → response'u state'e yaz → trust paneller render
   - **Beklenen sonuç:** "Sony WH-1000XM5" yazınca gerçek veri akıyor

**Gün 2 Kontrol Listesi (Kişi B):**
- [ ] TrustPanel + 4 alt kart render oluyor
- [ ] Mock veriyle tüm görseller çalışıyor
- [ ] Backend bağlantısı kuruldu (en azından 1 ürün)
- [ ] Mobil responsive sorun yok

---

### GÜN 3 — 13 MAYIS ÇARŞAMBA

**Tema:** Röntgen ajanı (3 alt-görev) + Multimodal başlangıç

⚠️ **CHECKPOINT 2:** End-to-end ham pipeline kullanılabilir durumda mı?

#### KİŞİ A (Backend) — Röntgen Ajanı [P0]

**SABAH (09:00-13:00)**

1. **(30 dk) `prompts/` klasörü hazırlama**
   - `fake_review_detection.txt` — v2.0'daki prompt + iyileştirme
   - `price_verification.txt`
   - `claim_check.txt`
   - `image_verification.txt` — YENİ
   - `video_segment_analysis.txt` — YENİ
   - `counter_argument.txt` — YENİ

2. **(90 dk) `agents/xray_agent.py` — 3 alt-görev**
   - `detect_suspicious_reviews()` — Gemini Pro, batch yorum analizi
     - **DİL:** "Sahte" yerine "Yüksek/Orta/Düşük şüphe"
     - Cluster timing analizi (aynı gün gelen 5★ yorumlar)
     - Generic ifade tespiti
     - Çıktı: temizlenmiş yorum havuzu + örnek şüpheli yorumlar
   - `verify_price()` — Gemini Flash, fiyat geçmişi analizi
   - `check_claims()` — Gemini Flash, iddia vs yorum çapraz kontrol
   - `asyncio.gather()` ile paralel çalışsın

3. **(45 dk) Ağırlıklı güven skoru hesaplama**
   ```python
   def calculate_weighted_trust(forum_signal, youtube_signal, ecommerce_signal, claim_signal):
       return (
           0.35 * forum_signal +
           0.30 * youtube_signal +
           0.20 * ecommerce_signal +
           0.15 * claim_signal
       )
   ```
   - Her sinyal 0-100, çıktı 0-100
   - Breakdown dict'i de döndür (UI gösterimi için)

4. **(15 dk) Supervisor entegrasyonu**
   - xray node'unu gerçek fonksiyonla değiştir

**ÖĞLEDEN SONRA (14:00-19:00)**

5. **(90 dk) Multimodal video analiz — İLK PROOF OF CONCEPT [P0]**
   - Tek bir YouTube videosu için:
     - Transkriptten "pil" anını bul (örn: 4:23-4:53)
     - `yt-dlp` ile 30sn klip indir
     - Gemini Vision'a yükle: "Bu kesitte reviewer hangi ölçüm cihazını veya değeri gösteriyor? Sayısal değer varsa oku."
     - Çıktı JSON: `{moment, visible_value, claimed_value, discrepancy}`
   - Bu fonksiyonu `tools/youtube_tool.py` içinde `analyze_video_moment()` olarak yaz

6. **(60 dk) `agents/xray_agent.py` içinde video entegrasyonu**
   - Eğer YouTube'dan video varsa: anahtar anları analiz et
   - Çıktıyı `state.video_analysis` listesine ekle
   - **Limit:** Her ürün için max 3 video × max 2 kesit = 6 video call (cost koruması)

7. **(45 dk) Test: "Sony WH-1000XM5" tam röntgen akışı**
   - Resmi puan vs temizlenmiş puan kontrol
   - Sahte indirim algılaması test
   - Video analizi 1+ insight üretti mi?

8. **(30 dk) Prompt tuning ilk pass**
   - Sahte yorum tespiti tutarsız mı? Few-shot ekle
   - JSON parse hataları varsa response format kısıtla

**Gün 3 Kontrol Listesi (Kişi A):**
- [ ] Röntgen ajanı 3 alt-görev üretiyor
- [ ] Ağırlıklı güven skoru hesaplanıyor
- [ ] **Multimodal video analizi en az 1 video için çalışıyor**
- [ ] Supervisor research → xray çalışıyor

#### KİŞİ B (Frontend) — Multimodal UI + Manipülasyon DNA [P0/P1]

**SABAH (09:00-13:00)**

1. **(60 dk) `components/analysis/VideoInsights.tsx` — YENİ**
   - YouTube video kartları
   - Her kart: thumbnail + reviewer adı + "Gemini'nin yakaladığı an" özeti
   - "Reviewer 10 saat dedi, ekranda 6:14 gösterdi" tarzı çelişki gösterimi
   - **DEMO'NUN ALTIN ANI BURADA**

2. **(60 dk) `components/analysis/ImageVerification.tsx` — YENİ**
   - Sol: üretici ürün görseli
   - Sağ: YouTube/forum'dan gerçek ürün fotoğrafı (varsa)
   - Altta: "Tespit edilen farklar" liste

3. **(60 dk) Cache demo modu toggle**
   - Header'da küçük "Demo Modu" switch (sadece dev için)
   - Açıkken: API çağrısı yapmaz, mockData'dan çeker
   - Demo video çekiminde zorunlu olacak

**ÖĞLEDEN SONRA (14:00-19:00)**

4. **(90 dk) `components/analysis/ManipulationDNA.tsx` — YENİ [P1]**
   - Recharts radar chart
   - 4 katman (önce): Yorum, Fiyat, Görsel, İddia
   - Her eksen 0-100 (100 = max manipülasyon)
   - Renkli alan: kırmızı tonlar = kötü, yeşil = temiz
   - **Görsel olarak güçlü sunum elemanı**

5. **(60 dk) `components/trust/TrustScore.tsx` iyileştirme**
   - Skor altına horizontal bar chart: her kaynağın katkısı (%35 forum + %30 YouTube + ...)
   - Tooltip'lerle açıklama

6. **(45 dk) Dashboard layout final**
   - Faz indikatörü üstte
   - Sol: kaynak analizi + kişiselleştirme
   - Ana alan: TrustPanel → AnalysisPanel → DecisionPanel
   - Sağ: Chat paneli (sticky)
   - **Mobile:** dikey stack

7. **(45 dk) Smooth phase transitions**
   - Framer Motion ile her faz tamamlandığında ilgili panel fade-in
   - Önceki panel'ler "completed" state'e geçsin (hafif soluk)

**Gün 3 Kontrol Listesi (Kişi B):**
- [ ] VideoInsights bileşeni mock veriyle çalışıyor
- [ ] ImageVerification bileşeni hazır
- [ ] ManipulationDNA radar chart render oluyor
- [ ] Demo modu toggle çalışıyor
- [ ] Tüm dashboard mobile responsive

---

### GÜN 4 — 14 MAYIS PERŞEMBE

**Tema:** Analiz + Danışman + Karşı-argüman ajanları

⚠️ **CHECKPOINT 2:** Tüm ajanlar entegre edildi mi? Yarın MVP'ye doğru gidiyor muyuz?

#### KİŞİ A (Backend) — Analiz, Danışman, Challenger [P0]

**SABAH (09:00-13:00)**

1. **(75 dk) `agents/analysis_agent.py`**
   - Input: temizlenmiş yorumlar + video insights + forum insights
   - Gemini Pro: kategori bazlı skorlama
     - Kulaklık için: ses, ANC, rahatlık, pil, mikrofon, bağlantı
   - Top 3 güçlü yön, top 3 zayıf yön
   - "Kimler için uygun" / "Kimler için uygun değil" profilleri
   - Çıktı: structured JSON

2. **(90 dk) `agents/advisor_agent.py`**
   - Input: tüm önceki state + kullanıcı profili (opsiyonel)
   - 2 aşamalı:
     - Eğer kullanıcı profili yoksa: 3 akıllı soru üret (kullanım amacı, öncelik, bütçe)
     - Profil varsa: kişisel uyum skoru hesapla + karar (AL/KOŞULLU/ALMA) + gerekçe
   - **Alternatif arama:** Tavily ile "benzer ürün" araması (2-3 alternatif, ama derin analiz YOK — sadece bilgi)
   - Karar raporu prose formatında (markdown destekli)

**ÖĞLEDEN SONRA (14:00-19:00)**

3. **(75 dk) `agents/challenger_agent.py` — YENİ KARŞI-ARGÜMAN [P0]**
   - Input: advisor'ın kararı + state
   - Sistem mesajı:
     ```
     Sen bir "şeytanın avukatı" ajanısın. Danışman ajan {recommendation} kararı verdi.
     Bu karara karşı 3 farklı senaryo veya argüman üret:
     - Eğer karar 'ALMA' ise: bu ürünün AL'ınabilecek senaryoları
     - Eğer 'AL' ise: ALMA'yı düşündürecek edge case'ler
     - Eğer 'KOŞULLU' ise: koşulların nasıl değişebileceği
     Her senaryo: kim için, neden, hangi koşulda
     ```
   - Çıktı: 2-3 karşı-argüman + final dengelenmiş tavsiye
   - Bu **gerçek agentic davranış** — ajanın ajanı sorgulaması
   
4. **(30 dk) Supervisor full graph**
   - research → xray → analysis → advisor → challenger → END
   - Her node'un çıktısı state'e merge ediliyor mu kontrol

5. **(45 dk) Chat endpoint: `POST /api/chat`**
   - Input: `{question, current_state}`
   - Gemini Flash: state'i sistem mesajına ver, kullanıcı sorusunu user'a koy
   - Çıktı: chat response + isteğe bağlı "follow-up action" (örn: "alternatifi de röntgenle")

6. **(30 dk) End-to-end test: 3 farklı ürün**
   - Sony WH-1000XM5
   - JBL Tune 720BT
   - Anker Soundcore Q30
   - Üçü için tam akış, çıktıların kalitesi karşılaştır

7. **(30 dk) Hata yönetimi pass**
   - Her ajanda try/except + state'e error kaydı
   - Bir ajan çökerse pipeline durmasın, partial result dönsün

8. **(30 dk) Cache stratejisi finalize**
   - Yorum cache: 7 gün
   - Fiyat cache: 1 gün
   - YouTube transkript cache: 30 gün
   - Video kesit analizi cache: kalıcı (token tasarrufu için)
   - Kullanıcı kararı: cache'lenmez

**Gün 4 Kontrol Listesi (Kişi A):**
- [ ] 5 ajan (research, xray, analysis, advisor, challenger) entegre
- [ ] Chat endpoint çalışıyor
- [ ] 3 farklı ürünle test edildi
- [ ] Hata durumları graceful handle
- [ ] Cache TTL'leri ayarlandı

#### KİŞİ B (Frontend) — Analiz, Danışman, Chat [P0]

**SABAH (09:00-13:00)**

1. **(60 dk) `components/analysis/CategoryScores.tsx`**
   - Kategori bazlı yatay bar chart
   - Her kategori: skor + olumlu/olumsuz yorum sayısı
   - Renk: kırmızı (< 2.5), sarı (2.5-3.5), yeşil (> 3.5)

2. **(60 dk) `components/analysis/StrengthsWeaknesses.tsx`**
   - 2 sütunlu kart: Güçlü Yönler / Zayıf Yönler
   - Her madde için kaynak (kaç yorum bunu söyledi)
   - Yeşil/kırmızı ikon

3. **(60 dk) `components/analysis/DecisionReport.tsx`**
   - Büyük karar badge: AL (yeşil) / KOŞULLU (sarı) / ALMA (kırmızı)
   - Kişisel uyum skoru gauge
   - Gerekçe prose (markdown render)
   - **Karşı-argüman bölümü:** "Ama düşünmen gereken..."

**ÖĞLEDEN SONRA (14:00-19:00)**

4. **(60 dk) `components/PersonalizationForm.tsx`**
   - Modal/inline form
   - Backend'den gelen sorulara göre dinamik (3 soru tipik)
   - Cevaplar state'e kaydedilir, advisor tekrar çağrılır

5. **(90 dk) `components/ChatPanel.tsx`**
   - Sticky sağ panel (desktop) veya bottom drawer (mobile)
   - Mesaj listesi (kullanıcı + asistan)
   - Önerilen soru butonları: "Bu ürünün en büyük zayıflığı ne?", "Hangi alternatife bakmalıyım?"
   - Input + gönder butonu
   - Streaming response (typing animation)

6. **(45 dk) `components/analysis/AlternativeCards.tsx`**
   - 2-3 alternatif ürün kartı (basit bilgi: ad + ortalama puan + fiyat)
   - "Bunu da röntgenden geçir" butonu (her bir alternatif için)

7. **(30 dk) Full integration test**
   - Sıfırdan: ürün gir → tüm akışı dashboard üzerinden geç
   - Tüm bileşenler gerçek veriyle doluyor mu?

**Gün 4 Kontrol Listesi (Kişi B):**
- [ ] Analiz paneli (kategori, güçlü/zayıf) çalışıyor
- [ ] Karar raporu rendered (karşı-argüman dahil)
- [ ] Chat paneli çalışıyor
- [ ] Kişiselleştirme akışı çalışıyor
- [ ] **🎯 MVP TAMAMLANDI** — tüm pipeline UI'de görünür

---

### GÜN 5 — 15 MAYIS CUMA

**Tema:** Polish + P1 özellikler + SSE streaming + Görsel doğrulama derinleştirme

⚠️ **CHECKPOINT 3 (sabah):** MVP tamam mı? Tamamsa P1'lere geç. Değilse — P1/P2 ertele, MVP'yi sağlamlaştır.

#### KİŞİ A (Backend) — SSE + Görsel doğrulama [P1]

**SABAH (09:00-13:00)**

1. **(90 dk) SSE Streaming**
   - Supervisor'da her ajan bittiğinde event yay
   - Event tipleri: `phase_started`, `phase_completed`, `agent_output`, `final`
   - FastAPI `EventSourceResponse` ile döndür
   - **Faydası:** Frontend her aşamada yeni veri göstersin, kullanıcı 30sn beklerken bir şeyler oluyor görünsün

2. **(60 dk) `agents/xray_agent.py` — Görsel doğrulama derinleştirme**
   - Ürün resmi URL'leri topla (Trendyol/Hepsiburada ürün sayfası — Tavily snippet'tan veya direkt fetch)
   - YouTube videolarından "ürün yakın çekim" frame'leri çıkar (yt-dlp ile keyframe)
   - Gemini Vision karşılaştırma sorgusu:
     ```
     Sol görsel: üretici stüdyo fotoğrafı.
     Sağ görsel: kullanıcı ortamında çekilmiş gerçek görüntü.
     Tespit ettiğin renk, doku, malzeme, boyut, parça eksikliği farklarını listele.
     ```
   - Çıktı: `image_verification` dict'e yaz

3. **(30 dk) Cost izleme dashboard'u (dev için)**
   - `/api/admin/stats` endpoint
   - Bugüne kadar kaç Gemini call, kaç token, kaç Tavily search

4. **(45 dk) `/api/analyze/summary` endpoint — EXTENSION İÇİN [P0]**
   - Tam analiz sonucunun **hafif versiyonu**: sadece güven skoru, manipülasyon özeti (4 katman), karar badge, top 3 bulgu, 1 cümle gerekçe
   - Cache hit varsa: anında dön (< 100ms)
   - Cache miss: full pipeline çalıştır, summary extract et
   - Response boyutu < 2KB (extension popup hızlı render etsin)
   - CORS header'a `chrome-extension://*` ekle (geliştirme aşaması için)

**ÖĞLEDEN SONRA (14:00-19:00)**

4. **(60 dk) Reviewer güvenilirliği skoru [P1]**
   - Her YouTube video için: kanal adı, abone sayısı, geçmiş video sayısı
   - Tavily: `"{kanal adı} sponsorlu güvenilir review"` araması
   - Gemini Flash: video açıklamasında sponsorlu/işbirliği işareti var mı?
   - 0-100 reviewer trust skoru
   - State'e ekle: `youtube_videos[i].reviewer_trust`

5. **(60 dk) Kaynaklar arası çelişki tespiti [P1]**
   - Gemini Pro sistem mesajı:
     ```
     Aşağıda aynı ürün hakkında 4 farklı kaynak var.
     Kaynaklar arası çelişen iddiaları bul. Her çelişki için:
     - İddia
     - Kim ne diyor (kaynak isimleriyle)
     - Hangisi daha güvenilir
     ```
   - Çıktı: `contradictions: List[dict]`

6. **(30 dk) Pre-cache hazırlığı**
   - 3 demo ürünü belirle (henüz veri toplama, sadece liste)
   - Demo Ürün 1: yüksek manipülasyon sinyali olan ürün
   - Demo Ürün 2: temiz, güvenilir alternatif
   - Demo Ürün 3: yedek (jüri "rastgele dene" derse)

7. **(30 dk) Performance optimizasyonu**
   - Her ajan süresini ölç
   - 30sn üstünde olan herhangi bir adım varsa parallel'leştir veya yorum sayısını azalt (max 150 yorum)

8. **(45 dk) Edge case test**
   - Çok az yorumu olan ürün (< 10 yorum)
   - Yabancı dilde yorumlar
   - YouTube videosu olmayan niş ürün
   - Fiyat geçmişi bulunamayan ürün
   - **Beklenen:** Her durumda graceful fallback, dashboard "veri yetersiz" mesajı

**Gün 5 Kontrol Listesi (Kişi A):**
- [ ] SSE streaming çalışıyor
- [ ] `/api/analyze/summary` endpoint çalışıyor (extension için)
- [ ] Görsel doğrulama 1+ ürün için çalışıyor
- [ ] Reviewer trust skoru üretiliyor
- [ ] Çelişki tespiti çalışıyor (en az 1 örnek)
- [ ] Pre-cache ürünleri belirlendi
- [ ] Edge case'ler graceful

#### KİŞİ B (Frontend) — BROWSER EXTENSION + SSE + P1 [P0]

**SABAH (09:00-13:00) — Extension Scaffold + Content Script**

1. **(45 dk) Extension proje yapısı**
   - `extension/` klasörü oluştur (repo root'ta, web app'ten ayrı)
   - Vite + React + Tailwind (web app ile aynı renk paleti / tasarım sistemi)
   - `manifest.json` (Manifest V3):
     ```json
     {
       "manifest_version": 3,
       "name": "Alışveriş Röntgeni",
       "version": "1.0.0",
       "description": "E-ticarette manipülasyonu röntgenle",
       "permissions": ["activeTab", "storage", "sidePanel"],
       "host_permissions": [
         "*://*.trendyol.com/*",
         "*://*.hepsiburada.com/*"
       ],
       "content_scripts": [{
         "matches": [
           "*://*.trendyol.com/*",
           "*://*.hepsiburada.com/*"
         ],
         "js": ["content.js"],
         "css": ["content.css"]
       }],
       "side_panel": {
         "default_path": "sidepanel.html"
       },
       "action": {
         "default_title": "Alışveriş Röntgeni"
       },
       "background": {
         "service_worker": "background.js"
       },
       "icons": {
         "16": "icons/icon16.png",
         "48": "icons/icon48.png",
         "128": "icons/icon128.png"
       }
     }
     ```
   - `chrome://extensions` → Developer Mode → Load Unpacked ile ilk test
   - **ÖNEMLİ:** Side Panel API → `chrome.sidePanel.open()` Chrome 116+ gerektirir, kontrol et

2. **(60 dk) Content Script — Trendyol/Hepsiburada entegrasyonu**
   - `content.js`:
     - Sayfa URL'sinden ürün sayfasında olup olmadığını tespit et
       - Trendyol: URL pattern `/yorumlar` veya `/p-` içeriyor
       - Hepsiburada: URL pattern `-p-` içeriyor
     - Ürün sayfasındaysa: floating "🔍 Röntgen" butonu enjekte et (fixed bottom-right)
     - Buton tıklama → `chrome.runtime.sendMessage({action: "openSidePanel", productUrl, productName})`
     - Ürün adını DOM'dan çek:
       - Trendyol: `h1.pr-new-br` veya benzeri selector
       - Hepsiburada: `h1#product-name` veya benzeri
     - **NOT:** DOM selector'lar kırılgan — fallback olarak `document.title`'dan parse et
   - `content.css`: floating buton stillemesi (z-index: 99999, küçük pill-shape buton)

3. **(45 dk) Background Service Worker**
   - `background.js`:
     - `chrome.runtime.onMessage` listener
     - "openSidePanel" mesajı gelince → `chrome.sidePanel.open({tabId})`
     - `chrome.storage.local` ile son analiz sonucunu cache'le (extension içi hızlı erişim)
     - Backend API URL'i `.env` yerine `chrome.storage.sync` ile sakla (extension ayarlarından değiştirilebilir)

4. **(30 dk) SSE streaming consumer (web app)**
   - `useAnalysis` hook'unu SSE'ye geçir
   - PhaseIndicator her event'te güncellenir
   - "Yorumlar toplanıyor... (847 yorum)" gibi canlı counter

**ÖĞLEDEN SONRA (14:00-19:00) — Side Panel Mini Dashboard**

5. **(90 dk) `sidepanel/App.tsx` — Mini Dashboard**
   - Side Panel boyutu: ~350px genişlik, tam yükseklik
   - Layout (yukarıdan aşağı, scroll):
     - **Header:** "Alışveriş Röntgeni" logo + ürün adı
     - **Güven Skoru:** Büyük daire gauge (0-100), renkli (kırmızı/sarı/yeşil)
     - **Manipülasyon Özeti:** 4 satır ikon formatında:
       - Yorum ⚠️ Orta Şüphe | Fiyat ✓ Temiz | Görsel ⚠️ Fark Var | İddia ✗ Tutarsız
     - **Karar Badge:** Büyük renkli badge (AL / KOŞULLU / ALMA) + 1 cümle gerekçe
     - **Top 3 Bulgu:** En kritik 3 bulgu (kısa, 1-2 cümle her biri)
     - **"Detaylı Rapor →"** butonu: `chrome.tabs.create({url: webAppUrl + "?product=" + productId})`
   - **Loading state:** Faz göstergesi + skeleton

6. **(60 dk) Side Panel ↔ Backend API bağlantısı**
   - `fetch(BACKEND_URL + "/api/analyze/summary", {body: {product_name, product_url}})`
   - Response mapping → mini dashboard state'ine
   - Loading / error / success state'leri
   - CORS: backend'de `chrome-extension://[extension-id]` origin ekle
   - **Development shortcut:** CORS'u `*` yap, production'da kısıtla

7. **(45 dk) Extension içi cache katmanı**
   - `chrome.storage.local` ile son 5 analiz sonucunu tut
   - Aynı ürün tekrar açılırsa: cache'den anında göster + arka planda fresh veri çek
   - Cache key: ürün URL'i hash'i

8. **(45 dk) Web app P1 bileşenleri (paralel)**
   - `components/CrossSourceConflicts.tsx` — çelişki paneli
   - `components/ReviewerTrust.tsx` — YouTube reviewer güvenilirlik göstergesi
   - **NOT:** Bu ikisi side panel'de YOK, sadece web app'te (detaylı rapor)

**Gün 5 Kontrol Listesi (Kişi B):**
- [ ] Extension `chrome://extensions` üzerinden load unpacked çalışıyor
- [ ] Trendyol ürün sayfasında floating buton görünüyor
- [ ] Butona tıklayınca Side Panel açılıyor
- [ ] Side Panel mini dashboard mock veriyle render oluyor
- [ ] Side Panel backend'e gerçek API call yapıyor ve sonuç gösteriyor
- [ ] "Detaylı Rapor" butonu web app'e yönlendiriyor
- [ ] SSE streaming web app'te çalışıyor
- [ ] Çelişki + Reviewer Trust bileşenleri web app'te hazır

---

### GÜN 6 — 16 MAYIS CUMARTESİ

**Tema:** Pre-cache + Validation + Tutarlılık testi + UX polish

⚠️ **CHECKPOINT 3:** Tüm MUST + en az 3 SHOULD özellik hazır mı?

#### KİŞİ A (Backend) — Pre-cache + Validation [P0+P1]

**SABAH (09:00-13:00)**

1. **(60 dk) Demo ürünü 1 — Tam analiz + cache**
   - Yüksek manipülasyon sinyali bekleyen ürün (örn: az bilinen Çin markası bluetooth kulaklık)
   - Tüm pipeline'ı çalıştır
   - Sonucu manuel incele:
     - Sahte yorum tespiti mantıklı mı?
     - Video analizi anlamlı an yakaladı mı?
     - Karşı-argüman makul mu?
   - Sorunlu kısımlar varsa prompt'ları düzelt
   - **3 kez yeniden çalıştır, tutarlılık doğrula**
   - Cache'i sabit blob olarak SQLite'a yaz

2. **(60 dk) Demo ürünü 2 — Tam analiz + cache**
   - Güvenilir, popüler ürün (Sony WH-1000XM5)
   - Aynı kalite kontrol

3. **(45 dk) Demo ürünü 3 (yedek) — Tam analiz + cache**
   - Orta seviye ürün, jüri canlı demo isterse hazır olsun

4. **(15 dk) Pre-cache TTL'i sonsuza ayarla**
   - Bu 3 ürün cache'den hiç düşmesin
   - Konfigürasyonda override

**ÖĞLEDEN SONRA (14:00-19:00)**

5. **(90 dk) Validation set hazırlama [P1]**
   - 50 yorumu elle etiketle (yüksek/orta/düşük şüphe)
   - Bu yorumları sisteme ver, modelin tahminleriyle karşılaştır
   - Precision/Recall hesapla
   - README'de "validation methodology" bölümünde anlat
   - **Jüri "doğruluk?" sorusuna gerçek bir sayıyla cevap vereceksin**

6. **(60 dk) Prompt tuning final pass**
   - Sahte yorum, iddia, video analizi prompt'ları için 3-5 ürün test
   - Tutarsızlıkları gidermek için few-shot ekle
   - JSON parse hata oranını izle

7. **(45 dk) Cost optimization**
   - Toplam analiz cost'unu ölç (Gemini + Tavily call count)
   - Gereksiz call'lar var mı? Caching daha iyi yapılabilir mi?
   - Gemini Pro → Flash'a geçirilebilecek görevler var mı?

8. **(30 dk) Logging cleanup**
   - Dev log'larını prod log'larından ayır
   - Hassas bilgi yok mu (API key, kullanıcı verisi)

**Gün 6 Kontrol Listesi (Kişi A):**
- [ ] 3 demo ürünü cache'lenmiş, tutarlı
- [ ] Validation set çalışması yapıldı (precision/recall sayısı var)
- [ ] Prompt'lar finalize
- [ ] Cost beklenen aralıkta

#### KİŞİ B (Frontend) — Extension Polish + Web App UX Polish [P0+P1]

**SABAH (09:00-13:00)**

1. **(60 dk) Extension — Hepsiburada content script**
   - Trendyol'dan sonra Hepsiburada DOM selector'larını ekle
   - Ürün adı extraction + URL detection
   - Floating buton aynı stilde görünsün
   - **Test:** Hepsiburada'da 3 farklı ürün sayfasında çalışıyor mu?

2. **(45 dk) Extension — Side Panel UX polish**
   - Loading animasyonu (röntgen tarama efekti, küçük versiyon)
   - Hata state'leri (backend kapali, timeout, veri yetersiz)
   - Karar badge'in animasyonlu açılışı
   - "Detaylı Rapor" butonuna web app URL'i doğru geçiyor mu?

3. **(45 dk) Extension — Demo modu + Pre-cache**
   - Extension içinde de demo modu: 3 cached ürün için anında sonuç
   - `chrome.storage.local`'a demo verisini seed olarak yükle
   - Demo video çekiminde: Trendyol aç → butona tıkla → side panel anında açılır ve veri gösterir

4. **(30 dk) Web app — "Demo Modu" sabitleme**
   - Pre-cache'lenmiş 3 ürün için tek tıkla yükleme butonları

**ÖĞLEDEN SONRA (14:00-19:00)**

5. **(60 dk) Web app — Mikro-animasyonlar + Loading**
   - Güven skoru gauge: 0'dan hedefe smooth sayı animasyonu
   - Skor renk geçişi (kırmızı → sarı → yeşil)
   - Manipülasyon DNA radar chart: progressive draw
   - Faz bazlı dinamik loading mesajları

6. **(60 dk) Web app — Boş/hata state'leri**
   - "Bu ürün için yeterli veri bulunamadı" mesajları
   - Network hatası UI'ları + Retry butonları
   - "YouTube videosu bulunamadı" durumu

7. **(45 dk) Extension + Web app — Cross-test**
   - Extension'dan başla → side panel'de özet gör → "Detaylı Rapor" tıkla → web app'te tam sonuç
   - Bu tam akış 3 demo ürünüyle sorunsuz çalışmalı
   - **Bu akış demo videosunun ana senaryosu olacak**

8. **(30 dk) Footer + meta (web app + extension)**
   - Web app: "Bu sistem yardımcı bir analiz aracıdır, satın alma kararı kullanıcıya aittir" disclaimer
   - Extension popup: versiyon + GitHub link
   - Hackathon logosu

**Gün 6 Kontrol Listesi (Kişi B):**
- [ ] Extension Trendyol + Hepsiburada'da çalışıyor
- [ ] Side Panel demo modu ile anında veri gösteriyor
- [ ] Extension → Web App akışı sorunsuz
- [ ] Web app mikro-animasyonlar oturdu
- [ ] Tüm boş/hata state'leri ele alındı
- [ ] **🎯 TAM DEMO AKIŞI ÇALIŞIYOR (extension + web app)**

---

### GÜN 7 — 17 MAYIS PAZAR

**Tema:** FEATURE FREEZE + Test + dokümantasyon başlangıç

⚠️ **CHECKPOINT 4:** Bugünden sonra yeni özellik YOK. Sadece bug fix + test + doc.

#### KİŞİ A (Backend) — Test + dokümantasyon

**SABAH (09:00-13:00)**

1. **(90 dk) End-to-end test 5+ ürün**
   - 5 farklı ürün çalıştır (3 cached, 2 fresh)
   - Her sonucu manuel kontrol et
   - Anomali varsa düzelt

2. **(60 dk) Hata yönetimi stress test**
   - Gemini API kapalı simülasyonu (API key invalid)
   - Tavily timeout simülasyonu
   - SQLite corruption durumu
   - Tüm hataları graceful handle ediyor mu?

3. **(30 dk) Cost final report**
   - Toplam Gemini token kullanımı
   - Toplam Tavily search count
   - Demo gününe yetecek free tier var mı?

**ÖĞLEDEN SONRA (14:00-19:00)**

4. **(60 dk) README.md ilk taslak**
   - Proje açıklaması
   - Problem & çözüm
   - Mimari diyagramı (ASCII veya mermaid)
   - Teknoloji listesi
   - Kurulum talimatları
   - Demo video linki (placeholder)

5. **(45 dk) `prompts/` klasörü temizleme**
   - Final prompt'lar
   - Her prompt için açıklama yorumu
   - **Jüri prompt mühendisliği görmek istiyor**

6. **(45 dk) API dokümantasyonu**
   - FastAPI otomatik OpenAPI docs çalışıyor mu?
   - Endpoint açıklamaları net mi?

7. **(60 dk) Code cleanup**
   - Dead code sil
   - Yorum satırlarındaki TODO'ları gözden geçir
   - `.env.example` finalize

**Gün 7 Kontrol Listesi (Kişi A):**
- [ ] 5 ürünle end-to-end test ✓
- [ ] Hata senaryoları handle ediliyor
- [ ] README ilk taslak hazır
- [ ] Prompt'lar dokümante
- [ ] Code clean

#### KİŞİ B (Frontend) — Extension + Web App final test + dokümantasyon

**SABAH (09:00-13:00)**

1. **(60 dk) Full UX walkthrough — HEM extension HEM web app**
   - Extension: Trendyol'da 3 ürün, Hepsiburada'da 2 ürün test
   - Web app: 5 farklı ürünle dashboard'da gez
   - Extension → Web App geçiş akışını test et
   - UI/UX sorunları listele

2. **(45 dk) Bug fix round**
   - Sabah test'inde bulunan sorunları düzelt (extension + web app)

3. **(30 dk) Extension paketleme**
   - `extension/` klasörünü zip'le (CRX olarak paketlemeye gerek yok, load unpacked yeterli)
   - README'ye extension kurulum talimatları yaz:
     - `chrome://extensions` aç → Developer Mode → Load Unpacked → `extension/` klasörünü seç
   - Extension screenshot'ları (side panel açık hali)

**ÖĞLEDEN SONRA (14:00-19:00)**

4. **(45 dk) Screenshot hazırlama (README için)**
   - Extension: Trendyol'da floating buton + side panel açık hali (3 screenshot)
   - Web app: tam dashboard görünümü (3 screenshot)
   - Her ikisi de demo ürünleriyle

5. **(60 dk) Dashboard accessibility & polish final**
   - Son detay düzenlemeler
   - Yazım denetimi (Türkçe metinler — extension dahil)

6. **(60 dk) Vercel production deploy (web app)**
   - Final URL hazır
   - Environment variables ayarlandı
   - Production'da test

**Gün 7 Kontrol Listesi (Kişi B):**
- [ ] Extension Trendyol + Hepsiburada'da sorunsuz
- [ ] Extension → Web App akışı 3 ürünle test edildi
- [ ] Extension zip paketi hazır + README'de kurulum talimatı
- [ ] Screenshot'lar hazır (extension + web app)
- [ ] Web app production deploy çalışıyor

---

### GÜN 8 — 18 MAYIS PAZARTESİ

**Tema:** Demo video + dokümantasyon final + son testler

#### Sabah (09:00-13:00) — İkisi birlikte

1. **(60 dk) Demo senaryosu yazımı**
   - 60 saniyelik senaryo, saniye saniye
   - **Açılış (0-5sn):** Şok veri + proje adı ("Türkiye'de e-ticaret yorumlarının X%'i şüpheli")
   - **Extension demo (5-25sn):** Trendyol aç → ürün sayfasına git → floating butona tıkla → side panel açılır → güven skoru + karar badge anında görünür
   - **Web app geçiş (25-45sn):** "Detaylı Rapor" tıkla → web app'te tam dashboard → video insight "reviewer 10 saat dedi, ekranda 6:14" anı → manipülasyon DNA radar
   - **Kapanış (45-60sn):** Karşı-argüman ajanı → "AI kendi kararını sorguladı" → tagline
   - Voice-over metni (Türkçe)

2. **(30 dk) Demo provası — 3 kez**
   - Senaryoyu extension + web app üzerinde dene
   - Süre ölç (max 60 saniye)
   - Sorunlu geçişleri tespit et
   - **NOT:** Pre-cache demo modu HER YERDE açık olsun

3. **(90 dk) Video kayıt**
   - OBS Studio veya Loom
   - 1920x1080
   - 3 deneme yap
   - **NOT:** Pre-cache demo modu açık olsun, canlı API'ye bel bağlama

4. **(45 dk) Video edit**
   - DaVinci Resolve / CapCut / iMovie
   - Voice-over ekle (veya altyazı)
   - Müzik (royalty free)
   - Başlık ve geçişler

#### Öğleden sonra (14:00-19:00)

**Kişi A:**
5. (60 dk) README final
   - Demo video YouTube linki
   - Screenshot'lar yerleştir
   - Validation methodology bölümü
   - "Bilinen limitler" bölümü

6. (45 dk) Kısa tanıtım metni (BTK teslim formu için, ~200 kelime)

7. (45 dk) Son end-to-end test
   - Demo modu açık + kapalı
   - Tüm bileşenler çalışıyor mu

**Kişi B:**
8. (60 dk) YouTube'a video yükle (unlisted veya public)
9. (45 dk) Production deploy son kontrolu
10. (45 dk) GitHub issue/feature'ları temizle

**Gün 8 Kontrol Listesi:**
- [ ] 1 dk demo videosu YouTube'da
- [ ] README finalize
- [ ] Tanıtım metni hazır
- [ ] Production URL çalışıyor

---

### GÜN 9 — 19 MAYIS SALI (TESLİM GÜNÜ)

**Tema:** Son kontrol + teslim

#### Sabah (09:00-13:00)

1. **(60 dk) Final smoke test**
   - Sıfırdan kurulum dene (README'den)
   - Tüm akışı sıfırdan dene
   - Video'yu izle, hata var mı?

2. **(30 dk) GitHub repo public'e çevir**
   - `.env` gitignore'da mı, **3 kere kontrol et**
   - Sensitive bilgi yok
   - License ekle (MIT)
   - Topics/tags ekle

3. **(30 dk) Tüm linkler kontrolü**
   - GitHub repo URL
   - YouTube video URL
   - Production demo URL (varsa)
   - Hepsi açılıyor mu?

#### Öğleden sonra (14:00-19:00)

4. **(60 dk) BTK Akademi teslim formu**
   - Form alanlarını doldur
   - Tüm gerekli ekler
   - Kaydet, ama henüz "Gönder" YAPMA

5. **(60 dk) Buffer time — bilinmeyen sorunlar**
   - Bu zamanı son dakika çıkacak sorunlara ayır

#### Akşam (19:00-23:59)

6. **20:00 — Son commit**
   - "Final submission v1.0"

7. **21:00 — Teslim et**
   - Geç teslim = eliminasyon, **23:00'dan önce gönder**

8. **22:00 — Onay maili kontrol**
   - BTK Akademi onay maili geldi mi?

9. **23:00 — Kutlama 🎉**

---





## BÖLÜM 4: DÜŞÜRME STRATEJİSİ — "GERİYE DÜŞTÜYSENIZ NE YAPACAKSINIZ"

Her gün sabah sync'inde geride mi kaldık kontrol edin. Geri kaldıysanız aşağıdaki sırayla özellik kesin:

### Gün 3 sabahı geride miyim?
**Kesilebilir:** Görsel doğrulama (Image Verification) — multimodal video kalır

### Gün 4 sabahı geride miyim?
**Kesilebilir:** Karşı-argüman ajanı (challenger) — ama sonra agentic puanı düşer
- Alternatif: minimal challenger (Gemini Flash, 1 paragraf çıktı)

### Gün 5 sabahı geride miyim?
**Sırayla kesin:**
1. Çelişki tespiti (Cross-source contradictions)
2. Reviewer güvenilirliği skoru
3. SSE streaming (UI hala mock ile gösterilebilir)

### Gün 6 sabahı geride miyim?
**Sırayla kesin:**
1. Validation set (50 yorum etiketleme)
2. Röntgen slider UI
3. Manipülasyon DNA radar (kategori skorlarını kullan)

### Gün 7 sabahı geride miyim?
**Sırayla kesin:**
1. Dark mode
2. Hepsiburada content script (sadece Trendyol kalsın, extension demo için yeter)
3. Alternatif ürün arama (hardcoded 3 alternatif yeter)

### Kırmızı çizgi: Asla kesemeyeceğiniz şeyler
- Çekirdek 5 ajan pipeline (research, xray, analysis, advisor, challenger)
- Web app ana akış (giriş → trust panel → analysis → karar)
- **Browser extension (en azından Trendyol + side panel mini dashboard)**
- Demo modu + 2 pre-cache ürünü
- Chat paneli
- Multimodal video analizi (en az 1 örnek)
- README + 1dk demo video

---

## BÖLÜM 5: TEK NOKTADA BAŞARISIZLIK RİSKLERİ

### Risk 1: Tavily Trendyol yorum sayısı yetersiz
**Olasılık:** Orta-Yüksek (test edilmemiş)
**Tespit:** Gün 1 sabah test
**Mitigation:**
- Plan A: Daha çok search call (10+ farklı sorgu varyasyonu)
- Plan B: SerpAPI'ye geç (free tier 100 search/ay, ama Google sonuçları daha kapsamlı)
- Plan C: Sadece YouTube + forum'a odaklan, e-ticaret yorumu ikincil

### Risk 2: Gemini Vision video rate limit
**Olasılık:** Orta-Yüksek
**Tespit:** Gün 1 + Gün 3 test
**Mitigation:**
- Pre-cache demo ürünleri için video analizini önceden çalıştır, sonuçları sakla
- Demo gün canlı çalıştırma yapma — cache hit
- Free tier yetmezse Gemini 2.5 Flash'a düş (kalite biraz düşer ama hızlı)

### Risk 3: Multi-source veri tutarsız → çıktı kalitesiz
**Olasılık:** Yüksek (her ürün için doğal)
**Tespit:** Gün 4-6 manuel test
**Mitigation:**
- Bu durum aslında **çelişki tespiti özelliğinin meşrulaştığı** durum
- "Kaynaklar çelişiyor" cevabı, "tutarsız" cevap değil — özellik olarak sun

### Risk 4: Chrome Side Panel API sorunları
**Olasılık:** Düşük-Orta
**Tespit:** Gün 5 scaffold aşaması
**Mitigation:**
- Side Panel API Chrome 116+ gerektirir — kontrol et
- Fallback: normal popup (400×600px) kullan, side panel yerine
- Popup'ta UI sığdırmak için compact layout hazırla (vertical scroll)
- Trendyol DOM selector'lar kırılırsa: `document.title` parse fallback

### Risk 5: Frontend-backend SSE entegrasyonu çökerse
**Olasılık:** Düşük-Orta
**Tespit:** Gün 5
**Mitigation:**
- SSE yerine basit polling (her 2 saniye state check) — UI'yi değiştirme
- SSE optional olur, demo videoda zaten cache hit ile gösteriyorsun

### Risk 6: Demo videosu çekiminde bir şey kırılır
**Olasılık:** Yüksek
**Tespit:** Gün 8 sabah
**Mitigation:**
- 3 deneme yap, en iyisini seç
- Pre-cache demo modu açık olsun
- En kötü senaryoda ekran kaydı + voice-over post-prod

### Risk 7: Ekipten birinin hayatına bir şey gelir
**Olasılık:** Düşük ama gerçek
**Mitigation:**
- Her gün commit, kod sürekli backup
- Diğer kişi tek başına demo + teslim yapabilecek durumda olsun (Gün 7'den itibaren)

---

## BÖLÜM 6: GÜNLÜK SYNC RİTÜELİ

Her sabah 09:00-09:15, akşam 19:30-19:45.

### Sabah Sync — 3 soru
1. Dün ne yaptın, nerede kaldın?
2. Bugün ana hedef nedir?
3. Blocker var mı? (varsa hemen çöz)

### Akşam Sync — 3 soru
1. Bugünkü hedefi tutturdun mu? (✓ / kısmen / ✗)
2. Yarına bir blocker bıraktın mı?
3. Çıktıyı git'e push ettin mi?

### Çıkmaza girdiyseniz protokol
- 15 dk tek başına dene
- 15 dk Claude / ChatGPT'ye sor
- 15 dk Stack Overflow / dokümantasyon
- 1 saat sonra hala çözememişsen → ekip arkadaşını çağır
- 2 saat sonra hala çözememişsen → o özelliği başka bir günde dene, geç

---

## BÖLÜM 7: TESLİM KONTROL LİSTESİ (19 MAYIS)

### Zorunlu (eksik = ELİMİNASYON)
- [ ] GitHub repo public, tüm kod (backend + web app + extension)
- [ ] README.md (kurulum + mimari + tech + demo link + extension kurulum talimatı)
- [ ] 1 dk demo videosu YouTube'da
- [ ] Tanıtım metni (BTK formu)

### Repo İçeriği
- [ ] `.env` GİTİGNORE'DA (3 kez kontrol)
- [ ] `.env.example` var
- [ ] `prompts/` klasörü
- [ ] `requirements.txt` + `package.json`
- [ ] Çalışan backend + web app + extension kodu
- [ ] `extension/` klasörü (manifest.json + tüm extension kodu)
- [ ] README'de screenshot'lar (extension side panel + web app dashboard)
- [ ] LICENSE (MIT)

### Demo video (60sn max)
- [ ] Pre-cache modu açık (extension + web app)
- [ ] Extension → Side Panel → Web App tam akışı gösteriliyor
- [ ] Multimodal video insight anı gösteriliyor
- [ ] Karşı-argüman ajanı gösteriliyor
- [ ] Türkçe voice-over veya altyazı
- [ ] YouTube'da public/unlisted

### Opsiyonel (bonus)
- [ ] Production URL (Vercel)
- [ ] Validation metrics README'de

---

## SON SÖZ

Bu plan **gerçekçi ama agresif**. 9 günde 2 kişi ile yapılabilir ama ancak:
- Her gün 8 saat verimli çalışırsanız
- Sync'leri kaçırmazsanız
- Düşürme stratejisini erken aktive ederseniz
- Yeni özellik eklemeye direnirseniz

Hedef "kazanmak" değil — hedef **iyi yaptığın projenin hakkını vermek**. Eğer P0 hepsi + 3-4 P1 yetişirse, jüri'de **finalist** olursunuz. P0 + 5+ P1 + iyi sunum = **top 5 şansı**. Daha fazlasına ne ödülün, ne enerjinin değer.

**11 Mayıs 09:00 — Başla.**

---

*Versiyon 4.0 — Final Sprint. Browser Extension + Web App hibrit. AI-assisted development. Onaylandı: 11 Mayıs 2026.*


technopat, donamım haber , donanım arşivi, redit,techolay.net,pchocasi.com.tr