# MergeN — Review Scrapper Entegrasyonu

## Context

Masaüstündeki review scrapper projesi (`C:\Users\Akif\Desktop\review scrapper`) forum gönderilerini, e-ticaret yorumlarını ve YouTube yorumlarını başarıyla topluyor. Şu an MergeN backend'inde entegrasyon iskeleti yarı hazır: `tools/scrapper_io.py` ve `tools/_scrapper_runner.py` var ama `research_node` / `xray_node` bunları çağırmıyor — research hâlâ sadece Tavily ile çalışıyor, xray'de `suspicious_reviews=[]`, `review_layer=None`.

Bu plan entegrasyonu tamamlar: research scrapper verisini çeker (Tavily fallback), xray e-ticaret yorumlarını manipülasyon analizinden geçirir, frontend kaynak sayılarını gösterir.

### Kritik Kısıtlar:
* **Scrapper projesine dokunulmaz** (review scrapper ayrı proje — `CLAUDE.md` kural 1). Tüm entegrasyon kodu MergeN içinde kalır.
* **YouTube transkripti şimdilik atlanır.** Scrapper transkript üretse bile mapping katmanında `transcript=None` set edilir. YouTube yorumları (comments) kullanılır. Transkript ileride dışarıdan eklenecek.
* **SSE phase anahtarları** (`research/xray/analysis/advisor/challenger`) değişmez.
* **`.env` API key'leri** asla commit edilmez.

---

## Değişen Dosyalar

### 1. `backend/schemas/state.py`
`YouTubeVideo` TypedDict'ine `transcript` alanından sonra:
```python
comments: list[str]  # YouTube video yorumları (scrapper)
```
Scrapper YouTube yorumlarını taşımak için yeni alan. Transkript alanı kalır ama şimdilik hep `None` doldurulur.

### 2. `backend/tools/scrapper_io.py`
`_map_to_research_output` içindeki YouTube döngüsünde:
* transcript çıkarımını kaldır ➔ `transcript=None` (kullanıcı isteği: transkript atla).
* `comments=v.get("comments", [])` ekle.
* `YouTubeVideo(...)` constructor'ına `comments=...` parametresi eklenir.

### 3. `backend/agents/research_agent.py`
`research_node` önce scrapper'ı dener, başarısızsa Tavily'ye düşer:
```python
from tools.scrapper_io import collect_with_scrapper_sync

def research_node(state):
    product_name = state["product_name"]
    try:
        research = collect_with_scrapper_sync(
            product_name,
            trendyol_url=state.get("product_url") if "trendyol" in (state.get("product_url") or "") else None,
            hepsiburada_url=state.get("product_url") if "hepsiburada" in (state.get("product_url") or "") else None,
            skip_youtube=False,   # YouTube yorumları çalışıyor
        )
        if research is None:      # scrapper yok / hata ➔ Tavily fallback
            youtube_videos = _search_youtube(product_name)
            forum_threads = _search_forums(product_name)
            research = ResearchOutput(
                reviews=[], forum_threads=forum_threads,
                youtube_videos=youtube_videos, price_data=[],
            )
    except Exception as e:
        state["error"] = f"research_agent: {e}"
        return state
    state["research"] = research
    return advance_phase(state)
```
* **Önemli:** Tavily fallback yolundaki `_search_youtube` içindeki `YouTubeVideo(...)` constructor'ına `comments=[]` eklenmeli (yeni zorunlu alan).

### 4. `backend/agents/xray_agent.py`
* `_assess_youtube_reviewers` içindeki `YouTubeVideo(...)` constructor'ına `comments=v["comments"]` ekle (yeni alan).
* `xray_node`: research`["reviews"]` doluysa e-ticaret yorum analizi gerçekleştirilir:
```python
from prompts.xray import review_analysis_prompt

reviews = research.get("reviews", [])
suspicious_reviews, ecommerce_signal = [], None
if reviews:
    r = generate_json(review_analysis_prompt(product_name, reviews))
    review_trust_signal = float(r.get("review_trust_signal", 50.0))
    ecommerce_signal = round(review_trust_signal, 1)
    for s in r.get("suspicious_reviews", []):
        suspicious_reviews.append(SuspiciousReview(
            text=s.get("text", ""),
            signals=s.get("signals", []),
            suspicion=s.get("suspicion", "orta"),
        ))
```
* `data_gaps`: reviews doluysa `"ecommerce_reviews"` çıkarılır (`["price_history", "visual"]` kalır).
* `manipulation_dna.review_layer`: reviews doluysa `round(100 - review_trust_signal, 1)`, yoksa `None`.
* `XrayOutput.suspicious_reviews`: yukarıda doldurulan liste.
* **Ağırlık renormalizasyonu:** `ecommerce_signal` varsa: forum 0.30 + youtube 0.30 + ecommerce 0.25 + claim 0.15; yoksa mevcut forum 0.40 + youtube 0.40 + claim 0.20 korunur.
* `WeightedTrustScore.ecommerce_signal` = hesaplanan değer veya `None`.
* `price_layer` / `visual_layer` `None` kalır (fiyat & görsel ertelendi).

### 5. `backend/main.py`
CORS regex: `localhost:(3000|3001)` ➔ `localhost:(3000|3001|5173)`.
Vite dev sunucusu 5173'te çalışıyor; frontend SSE çağrıları CORS'a takılmasın.

### 6. `frontend/src/lib/adapters.js`
`adaptProductState` içindeki `sources` objesi sabit sıfırlar yerine `backendState.research`'ten doldurulur:
```javascript
const research = backendState.research || {};
const reviews = research.reviews || [];
sources: {
  trendyolReviews:   reviews.filter(r => r.source === 'trendyol').length,
  hepsiburadaReviews:reviews.filter(r => r.source === 'hepsiburada').length,
  forumPosts:        (research.forum_threads || []).length,
  forumThreads:      (research.forum_threads || []).length,
  youtubeVideos:     (research.youtube_videos || []).length,
}
```

---

## Ortam Notu (Çalıştırma)

Backend başlatılırken `sse_starlette` doğru Python ortamında kurulu olmalı.
`ModuleNotFoundError: sse_starlette` hatası alınırsa, backend `requirements.txt` dosyasının kurulu olduğu Python sürümüyle çalıştırılır:
```cmd
python -m uvicorn main:app --reload --port 8000
```
veya sanal ortam (venv) aktif edilerek `pip install -r requirements.txt` sonrası çalıştırılır.

---

## Doğrulama Adımları

1. **Şema Testi:**
   ```cmd
   python -c "from schemas.state import YouTubeVideo; print(YouTubeVideo.__annotations__)"
   ```
   ➔ `comments` alanı görünür olmalıdır.

2. **Graph Compile Testi:**
   ```cmd
   python -c "from graph import graph; print(list(graph.nodes.keys()))"
   ```

3. **Scrapper Alt Süreci:**
   ```cmd
   python tools/_scrapper_runner.py "Apple AirPods Pro 2" --skip-photos
   ```
   ➔ stdout üzerinde `ecommerce_reviews`, `forum_posts` ve `youtube_videos` içeren bir JSON çıktısı görülmelidir.

4. **Pipeline Uçtan Uca (CLI):**
   ```cmd
   python cli.py "Apple AirPods Pro 2"
   ```
   ➔ `research` alanında `reviews` dolu, `xray` alanında `suspicious_reviews` ve `weighted_trust_score.ecommerce_signal` dolu olmalıdır.

5. **Fallback Senaryosu:** Scrapper yolu geçici olarak devre dışı bırakılıp CLI çalıştırıldığında hata vermemeli, Tavily araması ile devam ederek `reviews=[]` ve `ecommerce_signal=None` dönmelidir.

6. **Web Arayüzü Entegrasyonu:**
   `uvicorn main:app --port 8000` ve `npm run dev` komutları çalıştırılıp arayüzden ürün analiz edildiğinde; Dashboard üzerinde kaynak sayıları (forum/youtube/e-ticaret) ve şüpheli yorum kartları listelenmelidir.