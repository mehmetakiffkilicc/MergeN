# Agentic Yapı Kurulumu — İlk Aşama

## Klasör Yapısı

```
MergeN/
├── agentic/
│   ├── __init__.py
│   ├── config.py            # Pydantic Settings (API key'ler, model isimleri)
│   ├── graph.py             # LangGraph StateGraph — tüm ajanları bağlar
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── orchestrator.py  # Yönlendirme mantığı (route + advance_phase)
│   │   ├── research_agent.py # Araştırma ajanı (stub)
│   │   ├── xray_agent.py     # Röntgen ajanı (stub)
│   │   ├── analysis_agent.py # Analiz ajanı (stub)
│   │   ├── advisor_agent.py  # Danışman ajanı (stub)
│   │   └── challenger_agent.py # Karşı-argüman ajanı (stub)
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py       # ProductState + tüm veri tipleri
│   └── prompts/             # Prompt şablonları (boş)
├── scrapper/                # Boş (review scrapper entegrasyonu)
├── backend/                 # Boş (ileride FastAPI)
└── frontend/                # Boş (ileride Next.js)
```

## Yazılan Dosyalar

### `models/schemas.py`
- `Phase` — 6 aşamalı Literal tipi (`research → xray → analysis → advisor → challenger → done`)
- `ProductState` — Pipeline boyunca taşınan ana state (TypedDict)
- Ara tipler: `Review`, `ForumThread`, `YouTubeVideo`, `PriceData`, `SuspiciousReview`, `ClaimResult`, `CategoryScore`, `Strength`, `Weakness`, vb.
- Her ajanın çıktısı ayrı bir alanda (`research`, `xray`, `analysis`, `advisor`, `challenger`)

### `agents/orchestrator.py`
- `route(state)` — `current_phase`'e bakar, conditional edge için hedef ajanı döndürür
- `advance_phase(state)` — Fazı sıradaki ajana ilerletir, son ajan ise `"done"` yapar
- `PHASE_ORDER` — Ajanların çalışma sırası

### `graph.py`
- `StateGraph(ProductState)` kurulumu
- 6 node: orchestrator, research, xray, analysis, advisor, challenger
- `set_entry_point("orchestrator")`
- Orchestrator → `conditional_edges` ile ajana yönlendir
- Her ajan → `orchestrator`'a geri döner
- Orchestrator `"done"` dediğinde → END

### `agents/research_agent.py`
- LangGraph node fonksiyonu (`research_node`)
- Şu an stub — boş ResearchOutput ile state doldurup fazı ilerletir
- İleride: Tavily çağrıları, veri normalizasyonu

## Graph Akışı

```
Entry → orchestrator → research → orchestrator → xray → orchestrator
        → analysis → orchestrator → advisor → orchestrator
        → challenger → orchestrator → END
```

## Export Edilen Semboller

| Dosya | Export |
|-------|--------|
| `graph.py` | `graph` (derlenmiş LangGraph) |
| `orchestrator.py` | `route`, `advance_phase` |
| `research_agent.py` | `research_node` |
| `models/schemas.py` | `ProductState`, `Phase`, tüm TypedDict'ler |
