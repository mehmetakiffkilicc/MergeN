from typing import Literal
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Proje kök dizinini sys.path'e ekle
_current_file = Path(__file__).resolve()
_project_root = _current_file.parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.append(str(_project_root))


from schemas.state import ProductState, AdvisorOutput, AdvisorQuestion
from agents.orchestrator import advance_phase
from tools.gemini import generate_json
from tools.profiler import span
from prompts.advisor import questions_prompt, recommendation_prompt
from config import settings

try:
    from langgraph.config import dispatch_custom_event as _dispatch
except ImportError:
    def _dispatch(name, data): pass


def _build_analysis_summary(state: ProductState) -> str:
    parts: list[str] = []

    analysis = state.get("analysis", {})
    if analysis:
        strengths = analysis.get("strengths", [])
        if strengths:
            parts.append("Güçlü yönler: " + ", ".join(s["aspect"] for s in strengths[:3]))
        weaknesses = analysis.get("weaknesses", [])
        if weaknesses:
            parts.append("Zayıf yönler: " + ", ".join(w["aspect"] for w in weaknesses[:3]))
        suitable = analysis.get("suitable_for", [])
        if suitable:
            parts.append("Uygun profiller: " + ", ".join(suitable))
        not_suitable = analysis.get("not_suitable_for", [])
        if not_suitable:
            parts.append("Uygun olmayan profiller: " + ", ".join(not_suitable))

    wts = state.get("weighted_trust_score")
    if wts:
        parts.append(f"Genel güven skoru: {wts['total']}/100")

    xray = state.get("xray", {})
    claims = xray.get("claims", [])
    if claims:
        parts.append(
            "Öne çıkan iddialar: "
            + "; ".join(f"{c['claim']} ({c['reality']})" for c in claims[:3])
        )

    return "\n".join(parts)


def _generate_questions(product_name: str, summary: str) -> list[AdvisorQuestion]:
    with span("advisor:llm_questions"):
        result = generate_json(questions_prompt(product_name, summary), model=settings.model_lite)
    raw = result.get("questions", [])
    questions: list[AdvisorQuestion] = []
    for i, q in enumerate(raw):
        if isinstance(q, str):
            questions.append(AdvisorQuestion(question=q, options=[]))
        elif isinstance(q, dict):
            questions.append(AdvisorQuestion(
                question=q.get("question", f"Soru {i+1}"),
                options=q.get("options", []),
            ))
    return questions


def _make_recommendation(
    product_name: str,
    summary: str,
    user_profile: dict,
) -> tuple[float, Literal["AL", "KOSULLU", "ALMA"], str, list[dict]]:
    qa_text = "\n".join(
        f"S: {q}\nC: {a}"
        for q, a in user_profile.get("answers", {}).items()
    )
    with span("advisor:llm_decision"):
        result = generate_json(recommendation_prompt(product_name, summary, qa_text), model=settings.model_pro)
    score = float(result.get("personal_score", 50.0))
    rec = result.get("recommendation", "KOSULLU")
    if rec not in ("AL", "KOSULLU", "ALMA"):
        rec = "KOSULLU"
    rationale = result.get("rationale", "")
    alternatives = result.get("alternatives", [])
    return score, rec, rationale, alternatives


def advisor_questions_node(state: ProductState) -> ProductState:
    """Kullanıcıya sorulacak kişiselleştirme sorularını üretir. Faz ilerletmez —
    interrupt_before=["advisor_decision"] ile duraklatılıp kullanıcı cevapları
    alındıktan sonra advisor_decision_node devreye girer."""
    try:
        _dispatch("scraper_progress", {"line": "Kişiselleştirme soruları hazırlanıyor"})
    except Exception:
        pass
    product_name = state["product_name"]
    summary = _build_analysis_summary(state)

    try:
        questions = _generate_questions(product_name, summary)
        state["advisor"] = AdvisorOutput(
            questions=questions,
            personal_score=None,
            recommendation=None,
            rationale="",
            alternatives=[],
        )
    except Exception as e:
        state["error"] = f"advisor_agent (questions): {e}"

    return state


def advisor_decision_node(state: ProductState) -> ProductState:
    """user_profile dolu olduğunda kişisel skor + AL/KOŞULLU/ALMA kararı üretir."""
    try:
        _dispatch("scraper_progress", {"line": "Kişisel öneri hazırlanıyor"})
    except Exception:
        pass
    product_name = state["product_name"]
    summary = _build_analysis_summary(state)
    user_profile = state.get("user_profile")

    try:
        existing = state.get("advisor") or {}
        questions = existing.get("questions", [])
        personal_score, recommendation, rationale, alternatives = _make_recommendation(
            product_name, summary, user_profile or {}
        )
        
        # Her bir alternatif ürün için gerçek görsel paralel çek
        from scrapper.tools.image_finder import fetch_real_product_image

        def _fetch_img(alt):
            alt_name = alt.get("name")
            if not alt_name:
                return alt
            try:
                real_img = fetch_real_product_image(alt_name)
                if real_img:
                    alt["image"] = real_img
            except Exception as e:
                print(f"  [Advisor] Alternatif ürün görseli çekilirken hata: {alt_name} -> {e}")
            return alt

        with ThreadPoolExecutor(max_workers=min(len(alternatives), 4) or 1) as ex:
            futures = {ex.submit(_fetch_img, alt): i for i, alt in enumerate(alternatives)}
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception:
                    pass

        state["advisor"] = AdvisorOutput(
            questions=questions,
            personal_score=personal_score,
            recommendation=recommendation,
            rationale=rationale,
            alternatives=alternatives,
        )
    except Exception as e:
        state["error"] = f"advisor_agent (decision): {e}"
        return state

    return advance_phase(state)

