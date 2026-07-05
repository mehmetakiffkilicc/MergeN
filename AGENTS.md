# MergeN Agentic — Proje Kılavuzu

## Genel Amaç

E-ticaret ürünlerinde manipülasyon tespiti yapan çok ajanlı bir pipeline. Kullanıcı bir ürün adı/URL'si girer; sistem Trendyol/Hepsiburada yorumlarını, forum tartışmalarını ve YouTube incelemelerini analiz ederek **AL / KOŞULLU / ALMA** kararı üretir.

Projenin üç ana katmanı vardır:

1. **Scrapper** (`C:\Users\Akif\Desktop\review scrapper`) — veri toplama, ayrı proje, ileride entegre edilecek
2. **Agentic** (bu klasör) — LangGraph pipeline, AI analiz
3. **Backend + Frontend** — henüz yok, ileride eklenecek

---

## Mimari

```
graph.py              ← LangGraph StateGraph; tüm ajanları bağlar
config.py             ← Pydantic BaseSettings (API key'ler, model isimleri)
models/
  schemas.py          ← Tüm TypedDict tanımları; pipeline'ın ortak dili
agents/
  orchestrator.py     ← route() + advance_phase(); faz yönetimi
  research_agent.py   ← Veri toplama (stub)
  xray_agent.py       ← Manipülasyon röntgeni (stub)
  analysis_agent.py   ← Güçlü/zayıf yön analizi (stub)
  advisor_agent.py    ← Kişisel öneri üretici (stub)
  challenger_agent.py ← Şeytan'ın avukatı (stub)
tools/
  cache.py            ← Disk-based JSON cache (sha256 key, .cache/ klasörü)
  gemini.py           ← google.genai wrapper (text / json / vision)
  tavily.py           ← Tavily arama wrapper
  __init__.py         ← Re-export
```

### Pipeline akışı

```
orchestrator → research → orchestrator → xray → orchestrator
            → analysis → orchestrator → advisor → orchestrator
            → challenger → END
```

Hata varsa orchestrator hemen `done`'a yönlendirir, ajanlar çalışmaz.

---

## State Şeması (`models/schemas.py`)

`ProductState` pipeline boyunca taşınan tek veri yapısıdır.

| Alan | Tip | Kim doldurur |
|------|-----|--------------|
| `product_name` | `str` | Caller (giriş) |
| `product_url` | `Optional[str]` | Caller (giriş) |
| `current_phase` | `Phase` | `advance_phase()` |
| `error` | `Optional[str]` | Herhangi bir ajan |
| `research` | `ResearchOutput` | research_agent |
| `xray` | `XrayOutput` | xray_agent |
| `analysis` | `AnalysisOutput` | analysis_agent |
| `advisor` | `AdvisorOutput` | advisor_agent |
| `challenger` | `ChallengerOutput` | challenger_agent |
| `user_profile` | `UserProfile` | advisor_agent (kullanıcı cevaplarından) |
| `manipulation_dna` | `ManipulationDNA` | xray_agent (4 katman: review/fiyat/görsel/iddia) |
| `weighted_trust_score` | `WeightedTrustScore` | xray_agent |
| `image_verification` | `ImageVerification` | xray_agent (görsel karşılaştırma) |
| `video_analysis` | `list[VideoMoment]` | xray_agent (multimodal) |
| `contradictions` | `list[Contradiction]` | challenger_agent |

---

## tools/ — Ortak Yardımcı Katman

### `tools/cache.py`
```python
cache_get_or_compute(key: str, fn: Callable) -> Any
cache_clear() -> None
```
- Çıktılar `.cache/<sha256>.json` olarak saklanır
- TTL yok; temizlemek için `.cache/` klasörünü sil
- Bozuk cache sessizce yok sayılır, yeniden hesaplanır

### `tools/gemini.py`
```python
generate_text(prompt, *, model=None, temperature=0.7) -> str
generate_json(prompt, *, schema=None, model=None) -> dict
generate_from_image(prompt, image_url, *, model=None) -> str
```
- SDK: `google.genai` (yeni; `google.generativeai` deprecated)
- `model=None` → `settings.model_flash` kullanılır
- Tüm çağrılar cache üzerinden geçer
- Network hatasında 1 retry (2s)

### `tools/tavily.py`
```python
search(query, *, max_results=10, include_domains=None, search_depth="basic") -> list[dict]
```
- Kapsam: YouTube keşfi, alternatif ürün araması, iddia doğrulama
- Forum/e-ticaret araması **kapsam dışı** (scrapper hallediyor)
- Sonuç: `[{"url", "title", "content", "score"}, ...]`

---

## Scrapper Entegrasyonu (İleride)

`review scrapper` projesi (`C:\Users\Akif\Desktop\review scrapper\`) şu çıktıları üretiyor (schema_version 3.0):

```
scraped_data/<Ürün>/
├── raw/
│   ├── ecommerce_all.json   # Trendyol + HB yorumları, {items: [...]}
│   ├── forum_all.json       # 9 forum + Reddit, {items: [...]}
│   ├── youtube_all.json     # video + transkript + yorumlar (henüz stabil değil)
│   ├── qa_all.json          # Trendyol + HB S&C soruları
│   └── full_archive.json    # tüm kaynakların master kopyası
└── gemini_distilled_input.md  # AI-ready filtrelenmiş özet
```

### Entegrasyon noktaları
```python
import sys; sys.path.insert(0, r"C:\Users\Akif\Desktop\review scrapper")
from collector import collect
data = asyncio.run(collect(product_name="..."))
# data["ecommerce_reviews"], data["forum_posts"], data["youtube_videos"], data["qa_items"]
```

### HB Feature Stars
`ecommerce_all.json` içinde `"is_summary": true` olan özel kayıt: ses_kalitesi, mikrofon_kalitesi,
sarj_performansi, malzeme_kalitesi, goruntu_kalitesi, kullanim_kolayligi, fiyat_performans,
hiz, tasarim, konfor — bunlar `xray_agent`'ın `ManipulationDNA` hesabına girer.

Entegre edildiğinde `research_agent` bu JSON'ları okuyacak, kendi Tavily araması yapmayacak.
Scrapper loader (`tools/scrapper_io.py`) o gün açılacak, şimdi yok.

---

## Kurallar

1. **Scrapper bu projeye dokunma** — ayrı proje, ileride entegre edilecek.
2. **Backend/frontend yok** — ileride eklenecek.
3. **Ajanlar aceleye getirilmez** — her ajan sırayla, ayrı ayrı implement edilir.
4. **Ajan stub'ları `advance_phase()` çağırır** — faz ilerlemesi ajanların sorumluluğu, orchestrator'ın değil.
5. **Hata durumunda `state["error"]` yaz** — orchestrator kısa devre yaparak `done`'a gider.
6. **`tools/` üzerinden API çağrısı** — ajan içinde doğrudan SDK kullanma, wrapper'ları kullan.

---

## Bağımlılıklar

```
langgraph
google-genai
tavily-python
pydantic-settings
httpx
```

`.env` dosyasında olması gerekenler:
```
GEMINI_API_KEY=...
TAVILY_API_KEY=...
```

---

## Mevcut Durum (Son Güncelleme: 2026-05-14)

### Tamamlanan
- [x] `models/schemas.py` — tüm TypedDict'ler tanımlandı; `ecommerce_signal: Optional[float]`, `review/price/visual_layer: Optional[float]`, `data_gaps: list[str]` eklendi
- [x] `agents/orchestrator.py` — `route()` error short-circuit eklendi
- [x] `graph.py` — 7 node (advisor iki node: `advisor_questions` + `advisor_decision`); `MemorySaver` + `interrupt_before=["advisor_decision"]` ile derleniyor
- [x] `run.py` — `graph.stream()` / `graph.update_state()` / `graph.stream(None, ...)` ile interrupt mekanizması; doğrudan node import yok
- [x] `config.py` — Pydantic Settings (gemini/tavily key, model isimleri)
- [x] `tools/gemini.py` — retry loglama, schema cache key, mime_type tespit
- [x] `tools/` katmanı — `cache.py` + `gemini.py` + `tavily.py` + `__init__.py`
- [x] `research_agent` — Tavily YouTube arama + forum araması; `_extract_channel` @handle URL'den türetme; `reviews`/`price_data` scrapper entegrasyonuna kadar boş
- [x] `xray_agent` — forum analizi + YouTube güven skoru; ecommerce yokken ağırlık renormalize (forum %40 + youtube %40 + claim %20); `review/price/visual_layer=None`, `data_gaps` şeffaf raporlama
- [x] `analysis_agent` — kategori skorları, güçlü/zayıf yön, uygun/uygun değil profilleri
- [x] `advisor_agent` — iki node: `advisor_questions_node` (soru üretir, fazı ilerletmez) + `advisor_decision_node` (AL/KOŞULLU/ALMA kararı + advance_phase)
- [x] `challenger_agent` — 3 itiraz senaryosu + çelişkiler + dengelenmiş final tavsiye
- [x] `prompts/xray.py` — `review_analysis_prompt` + `price_analysis_prompt` hazır (scrapper-day için)

### Sıradaki
- [ ] `tools/scrapper_io.py` — scrapper entegre edileceği gün yazılacak; hazır olunca `xray_agent` içinde `review_analysis_prompt` ve `price_analysis_prompt` çağrılacak
- [ ] Backend (FastAPI) + Frontend — proje ilerleyince

---

## Doğrulama

```bash
# Graph compile + node listesi
python -c "from graph import graph; print(list(graph.nodes.keys()))"

# Tool import
python -c "from tools import generate_text, tavily_search, cache_get_or_compute; print('ok')"

# Pipeline uçtan uca (stub)
python -c "
from graph import graph
result = graph.invoke({'product_name': 'Test', 'product_url': None, 'current_phase': 'research', 'error': None, 'research': None, 'xray': None, 'analysis': None, 'advisor': None, 'challenger': None, 'user_profile': None, 'manipulation_dna': None, 'weighted_trust_score': None, 'image_verification': None, 'video_analysis': [], 'contradictions': []})
print('phase:', result['current_phase'])
"
```
