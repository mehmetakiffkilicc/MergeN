"""
Pipeline zamanli kosus harness'i.

Kullanım:
    cd backend
    python scripts/timed_run.py "Samsung Galaxy A55"
    python scripts/timed_run.py "Samsung Galaxy A55" --answers "günlük kullanım,evet,hayır"

Advisor interrupt'ta --answers ile virgülle ayrılmış cevaplar otomatik beslenir.
Bitince her adımın süresi tablo halinde yazdırılır.
"""

import sys
import time
import argparse
import uuid
from pathlib import Path

# backend/ dizinini sys.path'e ekle
_backend = Path(__file__).resolve().parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

from tools.profiler import reset, report, span
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
    "research":   "[1/5] Research",
    "xray":       "[2/5] Xray",
    "analysis":   "[3/5] Analysis",
    "advisor":    "[4/5] Advisor (sorular)",
    "challenger": "[5/5] Challenger",
}


def run(product_name: str, auto_answers: list[str]) -> None:
    reset()

    state = _initial_state(product_name)
    config = {"configurable": {"thread_id": f"timed:{product_name}:{uuid.uuid4().hex[:8]}"}}

    print(f"\n{'='*60}")
    print(f"  MergeN Zamanlı Koşu: {product_name}")
    print(f"{'='*60}\n")

    seen: set = set()
    last_state = state
    t_wall_start = time.perf_counter()

    for chunk in graph.stream(state, config, stream_mode="values"):
        last_state = chunk
        phase = chunk.get("current_phase")
        if phase and phase not in seen:
            seen.add(phase)
            label = _PHASE_LABELS.get(phase, phase)
            print(f"  > {label} tamamlandı")
        if chunk.get("error"):
            print(f"\n  HATA: {chunk['error']}\n")
            report()
            return

    # ── Advisor interrupt: otomatik cevap ──
    advisor = last_state.get("advisor") or {}
    questions = advisor.get("questions", [])

    answers: dict[str, str] = {}
    for i, q in enumerate(questions):
        q_text = q.get("question", "") if isinstance(q, dict) else str(q)
        if i < len(auto_answers):
            ans = auto_answers[i]
        else:
            ans = "evet"  # varsayılan
        answers[q_text] = ans
        print(f"  [auto] S{i+1}: {q_text[:60]}... -> {ans}")

    graph.update_state(config, {"user_profile": UserProfile(answers=answers)})

    print("\n  > [4/5] Advisor (karar) başladı")
    for chunk in graph.stream(None, config, stream_mode="values"):
        last_state = chunk
        if chunk.get("error"):
            print(f"\n  HATA: {chunk['error']}\n")
            break

    t_wall_total = time.perf_counter() - t_wall_start

    # ── Özet çıktı ──
    advisor_out = last_state.get("advisor") or {}
    challenger_out = last_state.get("challenger") or {}
    wts = last_state.get("weighted_trust_score")

    print()
    if wts:
        print(f"  Güven skoru : {wts['total']:.1f}/100")
    rec = advisor_out.get("recommendation", "?")
    score = advisor_out.get("personal_score")
    score_str = f"{score:.1f}" if isinstance(score, (int, float)) else "?"
    print(f"  Karar       : {rec}  (kisisel skor: {score_str}/100)")
    print(f"  Challenger  : {len(challenger_out.get('arguments', []))} senaryo, {len(last_state.get('contradictions', []))} çelişki")

    print(f"\n  Toplam duvar saati: {t_wall_total:.1f} sn")

    # ── Profiler raporu ──
    report()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MergeN zamanlı pipeline koşusu")
    parser.add_argument("product", nargs="?", default="Samsung Galaxy A55",
                        help="Analiz edilecek ürün adı")
    parser.add_argument("--answers", default="günlük kullanım,evet,hayır",
                        help="Advisor sorularına virgülle ayrılmış otomatik cevaplar")
    args = parser.parse_args()

    auto_answers = [a.strip() for a in args.answers.split(",")]
    run(args.product, auto_answers)
