from schemas.state import (
    ProductState, AnalysisOutput, CategoryScore, Strength, Weakness,
)
from agents.orchestrator import advance_phase
from tools.gemini import generate_json
from tools.profiler import span
from prompts.analysis import analysis_prompt
from config import settings

try:
    from langgraph.config import dispatch_custom_event as _dispatch
except ImportError:
    def _dispatch(name, data): pass

_HB_NAME_MAP = {
    "ses_kalitesi":      "Ses Kalitesi",
    "mikrofon_kalitesi": "Mikrofon Kalitesi",
    "sarj_performansi":  "Şarj Performansı",
    "malzeme_kalitesi":  "Malzeme Kalitesi",
    "goruntu_kalitesi":  "Görüntü/Ekran Kalitesi",
    "kullanim_kolayligi":"Kullanım Kolaylığı",
    "fiyat_performans":  "Fiyat/Performans",
    "hiz":               "Hız/Performans",
    "tasarim":           "Tasarım",
    "konfor":            "Konfor",
}


def _build_context(state: ProductState) -> str:
    research = state.get("research", {})
    xray = state.get("xray", {})

    parts: list[str] = []

    threads = research.get("forum_threads", [])
    if threads:
        parts.append("## Forum Gönderileri")
        parts.extend(
            f"[{t['platform']}] {t['title']}: {t['snippet']}"
            for t in threads[:8]
        )

    videos = research.get("youtube_videos", [])
    if videos:
        parts.append("## YouTube Videoları")
        parts.extend(
            f"Başlık: {v['title']} | Kanal: {v['channel']}"
            for v in videos[:6]
        )

    claims = xray.get("claims", [])
    if claims:
        parts.append("## Doğrulanmış İddialar")
        parts.extend(
            f"{c['claim']} → {c['reality']} (skor: {c['score']:.2f})"
            for c in claims
        )

    hb_summary = research.get("hb_summary")
    if hb_summary:
        parts.append("## Hepsiburada Hazır Özellik Puanlamaları (Kullanıcı Oyları)")
        for key, val in hb_summary.items():
            name = _HB_NAME_MAP.get(key, key.replace("_", " "))
            parts.append(f"- {name}: {val} / 5")

    return "\n".join(parts)



def analysis_node(state: ProductState) -> ProductState:
    try:
        _dispatch("scraper_progress", {"line": "Güçlü ve zayıf yönler çıkarılıyor"})
    except Exception:
        pass
    product_name = state["product_name"]
    context = _build_context(state)

    if not context.strip():
        state["error"] = "analysis_agent: analiz edilecek veri yok"
        return state

    prompt = analysis_prompt(product_name, context)

    try:
        with span("analysis:llm"):
            result = generate_json(prompt, model=settings.model_lite)
    except Exception as e:
        state["error"] = f"analysis_agent: {e}"
        return state

    state["analysis"] = AnalysisOutput(
        category_scores=[
            CategoryScore(
                category=c["category"],
                score=float(c["score"]),
                positive_count=int(c["positive_count"]),
                negative_count=int(c["negative_count"]),
            )
            for c in result.get("category_scores", [])
        ],
        strengths=[
            Strength(aspect=s["aspect"], mention_count=int(s["mention_count"]))
            for s in result.get("strengths", [])
        ],
        weaknesses=[
            Weakness(aspect=w["aspect"], mention_count=int(w["mention_count"]))
            for w in result.get("weaknesses", [])
        ],
        suitable_for=result.get("suitable_for", []),
        not_suitable_for=result.get("not_suitable_for", []),
    )

    return advance_phase(state)
