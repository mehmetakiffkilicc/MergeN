# MergeN Backend — Mimari Kılavuzu

## Genel Amaç

E-ticaret ürünlerinde manipülasyon tespiti yapan çok ajanlı bir pipeline. Kullanıcı ürün adı/URL girer; sistem forum, YouTube ve e-ticaret verilerini analiz ederek **AL / KOŞULLU / ALMA** kararı üretir.

---

## Çalıştırma

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # API key'leri doldur
uvicorn main:app --reload --port 8765
```

CLI testi:
```bash
python cli.py "Sony WH-1000XM5"
```

Smoke testler:
```bash
pytest tests/test_smoke.py -v
```

---

## Dizin Yapısı

```
backend/
├── .env                    # Gerçek API key'ler — asla commit etme
├── .env.example
├── .gitignore
├── requirements.txt
├── config.py               # Tek Settings (Pydantic, Gemini 2.5)
├── main.py                 # FastAPI app, CORS regex, /health
├── cli.py                  # Pipeline interaktif test
├── graph.py                # LangGraph StateGraph + SqliteSaver
├── schemas/
│   ├── state.py            # Tüm TypedDict'ler (ProductState vb.)
│   ├── api.py              # Request/Response Pydantic modelleri
│   └── __init__.py         # Re-export (state + api)
├── agents/
│   ├── orchestrator.py     # route() + advance_phase()
│   ├── research_agent.py
│   ├── xray_agent.py
│   ├── analysis_agent.py
│   ├── advisor_agent.py    # iki node: questions + decision
│   └── challenger_agent.py
├── prompts/                # Prompt fonksiyonları (6 modül)
├── tools/
│   ├── gemini.py           # google.genai wrapper; use_cache param
│   ├── tavily.py           # Tavily arama wrapper
│   ├── cache.py            # Disk-JSON cache (.cache/)
│   └── cache_db.py         # aiosqlite TTL cache (set_cache)
├── routers/
│   ├── analyze.py          # SSE pipeline endpoints
│   └── chat.py             # /api/chat/ endpoint
├── tests/
│   └── test_smoke.py
├── checkpoints.db          # Runtime üretir — .gitignore
└── mergen_cache.db         # Runtime üretir — .gitignore
```

---

## Endpoint Listesi

| Method | Path | Açıklama |
|--------|------|----------|
| `POST` | `/api/analyze/stream` | SSE pipeline akışı |
| `POST` | `/api/analyze/answer` | Advisor interrupt cevapları |
| `GET`  | `/api/analyze/summary/{thread_id}` | Browser extension özeti (< 2KB) |
| `GET`  | `/api/analyze/thread_id` | Deterministik thread_id hesabı |
| `POST` | `/api/chat/` | Gemini sohbet (use_cache=False) |
| `GET`  | `/health` | API key + DB + graph sağlık kontrolü |

---

## Pipeline Akışı

```
orchestrator → research → orchestrator → xray → orchestrator
            → analysis → orchestrator → advisor_questions
            → [INTERRUPT: advisor_decision] ← kullanıcı cevapları
            → advisor_decision → orchestrator → challenger → END
```

`interrupt_before=["advisor_decision"]` ile derlenir. `/api/analyze/answer` resume eder.

---

## Checkpointing

`SqliteSaver` kullanılır (`checkpoints.db`). Instantiation:
```python
_conn = sqlite3.connect(_db_path, check_same_thread=False)
graph = builder.compile(checkpointer=SqliteSaver(_conn), ...)
```
`from_conn_string()` kullanılmaz — context manager döndürür, doğrudan atanamazz.

---

## Config

`config.py` — `Settings(BaseSettings)`:
- `gemini_api_key`, `tavily_api_key` (zorunlu)
- `model_flash = "gemini-2.5-flash"`, `model_pro = "gemini-2.5-pro"`, `model_vision = "gemini-2.5-pro"`
- `env_file = Path(__file__).parent / ".env"` (mutlak — CWD bağımsız)

---

## Cache Katmanları

| Katman | Modül | Amaç |
|--------|-------|------|
| Disk-JSON | `tools/cache.py` | Ajan AI çağrıları; TTL yok; `.cache/` |
| aiosqlite | `tools/cache_db.py` | `/api/analyze` sonuçları; TTL=6h |

Chat yanıtları (`/api/chat/`) disk cache'i bypass eder: `generate_text(prompt, use_cache=False)`.

---

## Async Kuralları

- `graph.stream()` senkron → `asyncio.Queue` + `loop.run_in_executor` pump pattern ile wrap edilir.
- `generate_text()` senkron → `await asyncio.to_thread(generate_text, ...)` ile çağrılır.
- Her `thread_id` için `_thread_locks` dict'inde `asyncio.Lock` tutulur.

---

## Kapsam Dışı

- `C:\Users\Akif\Desktop\review scrapper` — ayrı proje, dokunulmaz.
- Frontend — henüz yok.
