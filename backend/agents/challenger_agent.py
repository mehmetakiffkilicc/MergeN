from schemas.state import (
    ProductState, ChallengerOutput, ChallengerArgument, Contradiction, ConflictStatement,
)
from agents.orchestrator import advance_phase
from tools.gemini import generate_json
from tools.profiler import span
from prompts.challenger import challenger_prompt
from config import settings

try:
    from langgraph.config import dispatch_custom_event as _dispatch
except ImportError:
    def _dispatch(name, data): pass


def _build_full_summary(state: ProductState) -> str:
    parts: list[str] = []

    advisor = state.get("advisor") or {}
    rec = advisor.get("recommendation")
    rationale = advisor.get("rationale", "")
    if rec:
        parts.append(f"Danışman kararı: {rec}")
    if rationale:
        parts.append(f"Gerekçe: {rationale}")

    analysis = state.get("analysis") or {}
    strengths = analysis.get("strengths", [])
    weaknesses = analysis.get("weaknesses", [])
    if strengths:
        parts.append("Güçlü yönler: " + ", ".join(s["aspect"] for s in strengths[:3]))
    if weaknesses:
        parts.append("Zayıf yönler: " + ", ".join(w["aspect"] for w in weaknesses[:3]))

    wts = state.get("weighted_trust_score")
    if wts:
        parts.append(f"Güven skoru: {wts['total']}/100")

    dna = state.get("manipulation_dna")
    if dna:
        active = {k: v for k, v in dna.items() if v is not None and v > 0}
        if active:
            parts.append(
                "Manipülasyon sinyalleri: "
                + ", ".join(f"{k}={v}" for k, v in active.items())
            )

    xray = state.get("xray") or {}
    claims = xray.get("claims", [])
    if claims:
        parts.append(
            "## İddia doğrulama sonuçları\n"
            + "\n".join(
                f"- {c['claim']} → {c.get('reality', '?')} (skor={c['score']:.2f})"
                for c in claims[:8]
            )
        )

    research = state.get("research") or {}
    forum_threads = research.get("forum_threads", [])
    if forum_threads:
        parts.append(
            "## Forum tartışmaları\n"
            + "\n".join(
                f"- [{t.get('platform','forum')}] {t['title']} — {t.get('snippet','')[:200]}"
                for t in forum_threads[:8]
            )
        )

    reviewers = xray.get("reviewers", [])
    if reviewers:
        lines = []
        for r in reviewers[:6]:
            signals_text = "; ".join(
                (s["text"] if isinstance(s, dict) else str(s))
                for s in r.get("signals", [])
            )
            contrib = r.get("contribution", "")
            lines.append(
                f"- {r['channel']} (güven={r['trust_score']:.0f}, "
                f"sponsor=%{r['sponsorship_ratio']:.0f}): {signals_text}. {contrib}"
            )
        parts.append("## YouTube reviewer ifadeleri\n" + "\n".join(lines))

    data_gaps = xray.get("data_gaps", [])
    if data_gaps:
        parts.append("## Eksik veri katmanları\n" + ", ".join(data_gaps))

    return "\n\n".join(parts)


def challenger_node(state: ProductState) -> ProductState:
    try:
        _dispatch("scraper_progress", {"line": "Karşı argümanlar üretiliyor"})
    except Exception:
        pass
    product_name = state["product_name"]
    summary = _build_full_summary(state)
    advisor = state.get("advisor") or {}
    recommendation = advisor.get("recommendation", "KOSULLU")

    prompt = challenger_prompt(product_name, summary, recommendation)

    try:
        with span("challenger:llm"):
            result = generate_json(prompt, model=settings.model_lite)
    except Exception as e:
        state["error"] = f"challenger_agent: {e}"
        return state

    state["challenger"] = ChallengerOutput(
        arguments=[
            ChallengerArgument(
                scenario=a["scenario"],
                for_whom=a["for_whom"],
                reason=a["reason"],
            )
            for a in result.get("arguments", [])
        ],
        balanced_advice=result.get("balanced_advice", ""),
    )

    state["contradictions"] = [
        Contradiction(
            claim=c["claim"],
            sources=c.get("sources", []),
            more_reliable_source=c.get("more_reliable_source"),
            topic=c.get("topic"),
            severity=c.get("severity"),
            statements=[
                ConflictStatement(
                    source=s.get("source", ""),
                    source_type=s.get("source_type", "forum"),
                    value=s.get("value", ""),
                    stance=s.get("stance", "neutral"),
                    detail=s.get("detail", ""),
                    credibility=float(s.get("credibility", 50)),
                )
                for s in c.get("statements", [])
            ],
            resolution=c.get("resolution"),
        )
        for c in result.get("contradictions", [])
    ]

    return advance_phase(state)
