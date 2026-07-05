"""
Pipeline uçtan uca interaktif test scripti.
Kullanım: python cli.py "Sony WH-1000XM5"
"""

import sys

from graph import graph
from schemas.state import ProductState, UserProfile


def _initial_state(product_name: str) -> ProductState:
    return ProductState(
        product_name=product_name,
        product_url=None,
        current_phase="research",
        error=None,
        research=None,
        xray=None,
        analysis=None,
        advisor=None,
        challenger=None,
        user_profile=None,
        manipulation_dna=None,
        weighted_trust_score=None,
        image_verification=None,
        video_analysis=[],
        contradictions=[],
    )


_PHASE_LABELS = {
    "research":   "[1/5] Research — veri toplanıyor...",
    "xray":       "[2/5] Xray — manipülasyon taraması...",
    "analysis":   "[3/5] Analysis — ürün portresi çiziliyor...",
    "advisor":    "[4/5] Advisor — kişiselleştirme soruları...",
    "challenger": "[5/5] Challenger — karar sorgulanıyor...",
}


def _print_phase_result(state: ProductState, seen: set) -> None:
    phase = state.get("current_phase")
    if phase in seen or phase is None:
        return
    seen.add(phase)

    if phase == "xray":
        wts = state.get("weighted_trust_score")
        if wts:
            print(f"  Güven skoru: {wts['total']:.1f}/100  "
                  f"(forum={wts['forum_signal']:.0f}, youtube={wts['youtube_signal']:.0f})")
        xray = state.get("xray") or {}
        gaps = xray.get("data_gaps", [])
        if gaps:
            print(f"  Veri açığı: {', '.join(gaps)} — scrapper bekleniyor")

    elif phase == "analysis":
        analysis = state.get("analysis", {})
        strengths = analysis.get("strengths", []) if analysis else []
        weaknesses = analysis.get("weaknesses", []) if analysis else []
        if strengths:
            print("  Güçlü: " + " | ".join(s["aspect"] for s in strengths[:3]))
        if weaknesses:
            print("  Zayıf: " + " | ".join(w["aspect"] for w in weaknesses[:3]))

    elif phase == "research":
        research = state.get("research")
        if research:
            print(f"  YouTube: {len(research['youtube_videos'])} video")
            print(f"  Forum:   {len(research['forum_threads'])} thread")


def run(product_name: str) -> None:
    state = _initial_state(product_name)
    config = {"configurable": {"thread_id": product_name}}
    print(f"\n=== MergeN Pipeline: {product_name} ===\n")

    seen_phases: set = set()
    last_state: ProductState = state

    for chunk in graph.stream(state, config, stream_mode="values"):
        last_state = chunk
        phase = chunk.get("current_phase")
        if phase and phase not in seen_phases:
            label = _PHASE_LABELS.get(phase)
            if label:
                print(label)
        _print_phase_result(chunk, seen_phases)

        if chunk.get("error"):
            print(f"\nHATA: {chunk['error']}")
            return

    advisor = last_state.get("advisor") or {}
    questions = advisor.get("questions", [])

    if not questions:
        print("  Soru üretilemedi, pipeline duruyor.")
        return

    print()
    answers: dict[str, str] = {}
    for i, q in enumerate(questions, 1):
        q_text = q.get("question", "") if isinstance(q, dict) else str(q)
        q_options = q.get("options", []) if isinstance(q, dict) else []
        print(f"  Soru {i}: {q_text}")
        if q_options:
            for opt in q_options:
                print(f"    - {opt}")
        answer = input(f"  Cevap {i}: ").strip()
        answers[q_text] = answer
        print()

    graph.update_state(config, {"user_profile": UserProfile(answers=answers)})

    print(_PHASE_LABELS["advisor"])
    for chunk in graph.stream(None, config, stream_mode="values"):
        last_state = chunk
        if chunk.get("error"):
            print(f"\nHATA: {chunk['error']}")
            return

    advisor = last_state.get("advisor") or {}
    score = advisor.get("personal_score")
    score_str = f"{score:.1f}" if isinstance(score, (int, float)) else "?"
    rec = advisor.get("recommendation", "?")
    print(f"  Karar : {rec}  (skor: {score_str}/100)")
    print(f"  Neden : {advisor.get('rationale', '')}")

    print("\n[5/5] Challenger — karar sorgulanıyor...")
    challenger = last_state.get("challenger") or {}

    print("\n--- İtiraz Senaryoları ---")
    for i, arg in enumerate(challenger.get("arguments", []), 1):
        print(f"\n  {i}. {arg['for_whom']}")
        print(f"     Senaryo : {arg['scenario']}")
        print(f"     Sorun   : {arg['reason']}")

    contradictions = last_state.get("contradictions", [])
    if contradictions:
        print(f"\n--- Çelişkiler ({len(contradictions)}) ---")
        for c in contradictions:
            print(f"  • {c['claim']}")
            print(f"    Güvenilir kaynak: {c.get('more_reliable_source', '-')}")

    print("\n=== Nihai Tavsiye ===")
    print(challenger.get("balanced_advice", ""))
    print()


if __name__ == "__main__":
    product = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else input("Ürün adı girin: ").strip()
    run(product)
