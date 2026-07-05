# MergeN — Frontend ↔ Backend Entegrasyon Rehberi

> Bu doküman, mevcut clickable prototip'i (mock data ile çalışan) FastAPI + LangGraph backend'e bağlama planıdır.
> Hedef: tek bir günlük iş içinde sıfırdan canlı bağlantıya geçmek. Sprint dokümanındaki API contract'ı baz alır.

---

## 0. Mevcut Durum Özeti

**Frontend (bu prototip)**
- Saf React 18 + Babel runtime (no build step). 4 dosya: `mockdata.jsx`, `widgets.jsx`, `scenes.jsx`, `app.jsx`.
- Tüm veri `mockdata.jsx` içinde sabit (`window.MOCK_PRODUCT`, `window.RIVAL_PRODUCT`).
- Akış 7 ekran: Hero → Analiz → Kişiselleştirme → Dashboard → Karşılaştır → Sohbet → Extension.
- State: top-level `App` içinde `useState` (view, query, profile, extOpen). Backend yok.

**Backend (henüz yok / yazılacak)**
- FastAPI + LangGraph + SQLite cache (sprint dokümanına göre).
- 5 ajan: Research → X-Ray → Analysis → Advisor → Challenger.
- API: `POST /api/analyze` (full SSE stream), `POST /api/analyze/summary` (extension için lite), `POST /api/chat`.

---

## 1. Önerilen Mimari Değişiklikler (Frontend Tarafı)

### 1.1 `lib/api.js` — Tek bir API istemcisi
Tüm fetch çağrıları için merkezi modül. Mevcut prototip plain HTML olduğu için `window.MERGEN_API` üzerine bağlanabilir:

```js
// lib/api.js
const BASE = window.MERGEN_API_BASE || 'http://localhost:8000';

window.api = {
  async analyzeSummary({ productName, productUrl }) {
    const r = await fetch(`${BASE}/api/analyze/summary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_name: productName, product_url: productUrl }),
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  },

  streamAnalysis({ productName, productUrl }, onPhase, onFinal, onError) {
    const url = new URL(`${BASE}/api/analyze`);
    url.searchParams.set('product_name', productName);
    if (productUrl) url.searchParams.set('product_url', productUrl);

    const es = new EventSource(url.toString());
    es.addEventListener('phase_started',   (e) => onPhase('start',   JSON.parse(e.data)));
    es.addEventListener('phase_completed', (e) => onPhase('done',    JSON.parse(e.data)));
    es.addEventListener('agent_output',    (e) => onPhase('output',  JSON.parse(e.data)));
    es.addEventListener('final',           (e) => { onFinal(JSON.parse(e.data)); es.close(); });
    es.onerror = (e) => { onError(e); es.close(); };
    return () => es.close(); // cleanup fn
  },

  async chat({ question, state }) {
    const r = await fetch(`${BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, current_state: state }),
    });
    if (!r.ok) throw new Error(`API ${r.status}`);
    return r.json();
  },
};
```

İndex.html'e ekle: `<script src="lib/api.js"></script>` (Babel'den önce).

---

### 1.2 `mockdata.jsx` → `adapters.jsx`
Mock veri yapısını **kontrat** olarak koru. Backend'den gelen response'u bu şekle dönüştürecek bir adapter yaz:

```js
// adapters.jsx
function adaptProductState(backendState) {
  // backendState: FastAPI ProductState (ham ajan çıktıları)
  // returns: frontend'in beklediği MOCK_PRODUCT şekli
  return {
    id: backendState.product_id,
    name: backendState.product_name,
    category: backendState.category || 'Ürün',
    image: 'PLACEHOLDER',
    price: {
      current: backendState.price_data?.current ?? 0,
      was:     backendState.price_data?.was ?? 0,
      discount: backendState.price_data?.label_discount_pct ?? 0,
    },
    realDiscount: {
      label:  `GERÇEK İNDİRİM: %${backendState.price_data?.real_discount_pct ?? 0}`,
      detail: backendState.price_data?.explanation ?? '',
    },
    priceHistory: backendState.price_data?.history_90d ?? [],
    sources: {
      trendyolReviews:    backendState.research_meta?.trendyol_count    ?? 0,
      hepsiburadaReviews: backendState.research_meta?.hepsiburada_count ?? 0,
      forumPosts:         backendState.research_meta?.forum_post_count  ?? 0,
      forumThreads:       backendState.research_meta?.forum_thread_count?? 0,
      youtubeVideos:      backendState.research_meta?.youtube_count     ?? 0,
    },
    trustScore: backendState.weighted_trust_score?.total ?? 0,
    trustBreakdown: [
      { lbl: 'Forum',     pct: 35, score: backendState.weighted_trust_score?.forum    ?? 0 },
      { lbl: 'YouTube',   pct: 30, score: backendState.weighted_trust_score?.youtube  ?? 0 },
      { lbl: 'E-ticaret', pct: 20, score: backendState.weighted_trust_score?.ecommerce?? 0 },
      { lbl: 'İddia',     pct: 15, score: backendState.weighted_trust_score?.claim    ?? 0 },
    ],
    dna: adaptManipulationDNA(backendState.manipulation_dna),
    fakeReviews: (backendState.suspicious_reviews || []).slice(0, 3).map((r) => ({
      stars: r.stars,
      flag: r.suspicion === 'high' ? 'high' : 'med',
      text: r.text,
      reason: r.reason,
    })),
    videos: (backendState.video_analysis || []).map((v) => ({
      channel: v.channel,
      title: v.title,
      thumb: 'YOUTUBE FRAME',
      time: v.duration,
      moment: v.moment_timestamp,
      conflict: {
        claimedLabel: 'İddia (Reviewer)',
        claimed:      v.claimed_value,
        actualLabel:  'Ekranda Görülen',
        actual:       v.visible_value,
        bad:          v.discrepancy > 0.15,
      },
      summary: v.summary,
    })),
    decision: {
      badge:   backendState.recommendation_label, // "AL" / "KOŞULLU AL" / "ALMA"
      tier:    backendState.recommendation_tier,  // "good" / "warn" / "bad"
      summary: backendState.decision_summary,
      detail:  backendState.decision_detail,
      pros:    backendState.pros || [],
      cons:    backendState.cons || [],
    },
    challenger: {
      title:  'Şeytanın Avukatı — Bu kararı sorgula',
      points: backendState.counter_arguments || [],
    },
    imageVerification: backendState.image_verification ? {
      matchScore: backendState.image_verification.match_score,
      matchTier:  backendState.image_verification.tier,
      matchLabel: backendState.image_verification.label,
      studio:     backendState.image_verification.studio,
      real:       backendState.image_verification.real,
      hotspots:   backendState.image_verification.hotspots ?? [],
      findings:   backendState.image_verification.findings ?? [],
      verdict:    backendState.image_verification.verdict ?? '',
    } : null,
  };
}

function adaptManipulationDNA(dna) {
  if (!dna) return [];
  return [
    { axis: 'Yorum',  value: dna.review_score,  label: tierLabel(dna.review_tier),  tier: dna.review_tier,  detail: dna.review_detail },
    { axis: 'Fiyat',  value: dna.price_score,   label: tierLabel(dna.price_tier),   tier: dna.price_tier,   detail: dna.price_detail },
    { axis: 'Görsel', value: dna.visual_score,  label: tierLabel(dna.visual_tier),  tier: dna.visual_tier,  detail: dna.visual_detail },
    { axis: 'İddia',  value: dna.claim_score,   label: tierLabel(dna.claim_tier),   tier: dna.claim_tier,   detail: dna.claim_detail },
  ];
}
function tierLabel(t) {
  return { good: 'Temiz', warn: 'Orta Şüphe', bad: 'Yüksek Şüphe' }[t] || '—';
}

window.adaptProductState = adaptProductState;
```

---

## 2. Backend API Sözleşmesi (Frontend'in Beklediği)

Backend'i yazarken response'ları **bu şekilde** üretmek frontend'e dokunmadan bağlantıyı sağlar.

### 2.1 `POST /api/analyze` — SSE Stream
Request body:
```json
{ "product_name": "Apple AirPods Pro 2", "product_url": "https://trendyol.com/..." }
```

Stream events (her birinin `data:` alanı JSON):

```
event: phase_started
data: { "phase": "research", "label": "Araştırma" }

event: agent_output
data: { "phase": "research", "message": "847 yorum (Trendyol) toplandı" }

event: phase_completed
data: { "phase": "research", "duration_ms": 2150 }

... (xray, analysis, advisor, challenger)

event: final
data: <FULL ProductState — yukarıdaki adapter'ın beklediği şekil>
```

**Frontend tarafı kullanımı (`Analysis` scene'inde):**
```js
useEffect(() => {
  const cleanup = window.api.streamAnalysis(
    { productName: product },
    (kind, evt) => {
      if (kind === 'start')  setPhaseIdx(PHASE_INDEX[evt.phase]);
      if (kind === 'output') setTickerMsg(evt.message);
      if (kind === 'done')   setAgentStates(s => ({ ...s, [evt.phase]: 'done' }));
    },
    (final) => {
      window.CURRENT_PRODUCT = window.adaptProductState(final);
      onComplete();
    },
    (err) => setError(err)
  );
  return cleanup;
}, []);
```

### 2.2 `POST /api/analyze/summary` — Extension için lite
Response < 2KB:
```json
{
  "trust_score": 68,
  "recommendation_label": "KOŞULLU AL",
  "recommendation_tier": "warn",
  "manipulation_dna_compact": [
    { "axis": "Yorum",  "score": 42, "tier": "warn" },
    { "axis": "Fiyat",  "score": 18, "tier": "good" },
    { "axis": "Görsel", "score": 28, "tier": "good" },
    { "axis": "İddia",  "score": 56, "tier": "bad"  }
  ],
  "top_findings": [
    "YouTube'da reviewer \"30 saat pil\" dedi, ekranda 22sa 18dk görünüyor.",
    "Etiketteki %22 indirim yapay. Gerçek %6.",
    "Hepsiburada'da 18-22 Mart kümesi: 153 jenerik yorum."
  ],
  "one_line_reason": "Pil iddiası şişirilmiş, fiyat etiketi yapay.",
  "personal_fit": null
}
```

### 2.3 `POST /api/chat`
Request:
```json
{ "question": "Sony WF-1000XM5 ile karşılaştır", "current_state": { /* mevcut analiz */ } }
```
Response:
```json
{
  "reply": "Hızlı kıyaslama: AirPods (4.4/5)...",
  "agent": "Advisor",          // veya "Challenger"
  "suggested_followups": ["..."],
  "trigger_action": null        // örn. "analyze_alternative"
}
```

---

## 3. Adım Adım Migrasyon Planı

### Faz A — Backend bağımsız hazırlık (1-2 saat, hâlâ mock ile çalışır)
1. `lib/api.js` dosyasını oluştur (yukarıdaki şablon). Henüz çağırma yapma.
2. `mockdata.jsx`'i **adapter format'ına dönüştür**: yani frontend'in beklediği şekil, backend'in üreteceği şekil. Şu an zaten yakın — yalnızca alan isimleri net olarak dokümante edilsin.
3. `adapters.jsx` yaz (yukarıdaki kod). Mock data'yı test verisi olarak adapter'dan geçir:
   ```js
   window.CURRENT_PRODUCT = window.adaptProductState(MOCK_BACKEND_RESPONSE);
   ```
4. Tüm `scenes.jsx` içindeki `window.MOCK_PRODUCT` referanslarını `window.CURRENT_PRODUCT`'a değiştir.

### Faz B — İlk gerçek bağlantı: Summary endpoint (0.5 gün)
5. Backend `/api/analyze/summary` endpoint'ini ayağa kaldır (cache hit + pipeline çağırma).
6. Hero ekranında "Demo Modu" toggle ekle: açıkken mock, kapalıyken `window.api.analyzeSummary()`.
7. Extension preview component'i artık gerçek summary çekiyor → en kolay smoke test.

### Faz C — SSE stream bağlantısı (1 gün)
8. `Analysis` scene'inde mevcut sahte timer'ı kaldır, `streamAnalysis()`'i bağla.
9. Phase mapping:
   ```js
   const PHASE_INDEX = { research: 0, xray: 1, analysis: 2, advisor: 3, challenger: 4 };
   ```
10. Backend her `agent_output` event'inde ham mesaj yollasın (`"847 yorum toplandı"`). Frontend ticker olarak gösterir.
11. `final` event geldiğinde adapter çağrılır, dashboard'a geçilir.

### Faz D — Kişiselleştirme bağlantısı (0.5 gün)
12. Şu an `deriveDecision(profile)` frontend'de hesaplanıyor. **Backend'e taşı**:
    ```
    POST /api/decide
    { product_state, profile }
    →
    { score, badge, tier, summary, reasons[], counter_arguments[] }
    ```
13. `Personalization` ekranındaki canlı preview için **debounced API call** (her seçimde 200ms sonra çağır).
14. Yedek: backend gecikirse, mevcut `deriveDecision` fallback olarak kalır.

### Faz E — Chat (0.25 gün)
15. `Chat` scene'inde sahte timeout'u `window.api.chat()` ile değiştir.
16. `current_state`'i her mesajla beraber yolla (backend stateless çalışsın).
17. Agent badge'i (Advisor / Challenger) backend'in `agent` field'ından gelir.

### Faz F — Error & loading (0.5 gün)
18. Her API çağrısı için 3 state: idle / loading / error.
19. Hero'ya `<ErrorBanner />` ekle (network down, 429, 500).
20. Boş state'ler: "Bu ürün için yeterli veri toplayamadık" (backend `data_sufficient: false` döndürdüğünde).

### Faz G — Karşılaştırma (1 gün, opsiyonel/P1)
21. Backend `/api/compare?products[]=A&products[]=B` endpoint'i. İkisini paralel pipeline'a sokar.
22. `Comparison` scene'i şu an her iki ürün için de mock verisini kullanıyor. `state.products` array'ine bağla.

---

## 4. State Yönetimi

Şu anki: tek bir `App` component'i içinde `useState`'ler. Backend bağlantısıyla bu yetersiz kalacak.

**Önerim — Hafif global store:**

```js
// store.js
window.MERGEN_STATE = {
  view: 'hero',
  query: '',
  profile: null,
  productState: null,     // adapter çıktısı
  loading: false,
  error: null,
  // SSE state
  phase: null,
  agentStates: {},
  liveCounters: {},
  tickerMsg: '',
};

window.MERGEN_LISTENERS = new Set();
window.MERGEN_DISPATCH = (patch) => {
  Object.assign(window.MERGEN_STATE, patch);
  window.MERGEN_LISTENERS.forEach((fn) => fn(window.MERGEN_STATE));
};

// React hook
function useMergeNState() {
  const [, setT] = React.useState(0);
  React.useEffect(() => {
    const l = () => setT(t => t + 1);
    window.MERGEN_LISTENERS.add(l);
    return () => window.MERGEN_LISTENERS.delete(l);
  }, []);
  return window.MERGEN_STATE;
}
```

Zustand veya Jotai gibi paket eklemek istemezsek bu fazlasıyla yeter.

---

## 5. CORS & Deployment Notları

**Lokal dev:**
- Backend `http://localhost:8000`'de.
- Frontend prototip dosyası `file://` olarak açılıyor — fetch CORS'u sorun çıkarabilir.
- Çözüm: Backend'i `--cors-origins "*"` veya frontend'i basit bir static server'dan serve et (`python -m http.server 5500`).

**Backend FastAPI CORS:**
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5500",
        "chrome-extension://*",  # gerçekte tek extension ID
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Extension için ekstra:**
- `manifest.json`'da `host_permissions` içinde `http://localhost:8000/*`.
- Production'da Vercel/Railway URL'i de eklenmeli.

---

## 6. Mock vs. Real — Demo Modu

Sprint dokümanı "demo modu toggle" diyor. Bunu **prod'a kadar koruyacağız**, jüri demosu canlı API'ye bağlanmayacak.

```js
const DEMO_MODE = window.MERGEN_DEMO ?? localStorage.getItem('mergen_demo') === '1';

if (DEMO_MODE) {
  window.CURRENT_PRODUCT = window.MOCK_PRODUCT;  // hâlâ mevcut
} else {
  // real API
}
```

Tweaks panelinde bir toggle ekleyebiliriz (gelecek adımlarda).

---

## 7. Pre-Cache'lenmiş 3 Demo Ürünü

Backend'in cache key'i:
- `apple-airpods-pro-2`  → mevcut MOCK_PRODUCT
- `sony-wf-1000xm5`      → mevcut RIVAL_PRODUCT (genişletilmeli)
- `[3. ürün — sahte sinyalleri yüksek bir niş marka]` → yeni mock yazılmalı

Bu üçü için cache TTL = sonsuz. Demo video'da bu üçü kullanılır.

---

## 8. Test Senaryoları (entegrasyon sonrası smoke test)

1. **Hero**: arama bar'a "Apple AirPods Pro 2" yaz, Enter → analiz ekranı açılır.
2. **Analiz**: 5 faz sırasıyla "active → done" olur, ticker mesajları akar, sayaçlar canlı artar, ~24s'de biter.
3. **Kişiselleştirme**: iPhone + ANC + Esnek seç → sağdaki preview skoru ~85 olur, badge "AL" yeşil olur. Android + Pil seç → ~50 ve "KOŞULLU".
4. **Dashboard**: tüm kartlar doludur. Trust gauge 68, DNA radar 4 eksenli, video çelişkisi "30sa vs 22sa", görsel uyum 89/100.
5. **Karşılaştır**: AirPods vs Sony, 5 preset chip'i kazananı değiştirir.
6. **Sohbet**: "pil hakkında ne diyorsun" → backend cevap döner, agent rozeti uygun (Advisor/Challenger).
7. **Extension**: butonla aç → mini gauge + DNA + top-3 bulgu.
8. **Hata**: backend kapatınca her ekran "bağlantı sorunu" banner'ı gösterir, mock fallback'e düşmez (production policy).

---

## 9. Süre Tahmini

| Faz | Süre | Bağımlılık |
|-----|------|------------|
| A · Frontend hazırlık | 2 sa | — |
| B · Summary endpoint | 4 sa | Backend `/summary` çalışıyor |
| C · SSE stream | 8 sa | Backend SSE çalışıyor |
| D · Kişiselleştirme | 4 sa | Backend `/decide` çalışıyor |
| E · Chat | 2 sa | Backend `/chat` çalışıyor |
| F · Error & loading | 4 sa | — |
| G · Karşılaştırma | 8 sa | Backend `/compare` çalışıyor |
| **Toplam** | **~32 sa** | (4 gün × 1 kişi, AI asistanlı) |

---

## 10. Sıradaki Adım (Frontend için)

Bu doküman onaylandıktan sonra ben:
1. `lib/api.js` ve `adapters.jsx` dosyalarını yazarım (mock fallback'leri ile).
2. `window.MOCK_PRODUCT` → `window.CURRENT_PRODUCT` migration'ını yaparım.
3. Hero'ya "Demo Modu" tweak'ını eklerim (real/mock toggle).
4. Loading/error skeleton state'lerini her ekrana koyarım.

Bu noktadan sonra **backend'in hazır olduğu her endpoint** sırayla bağlanabilir; frontend'in çalışan halini bozmaz.
