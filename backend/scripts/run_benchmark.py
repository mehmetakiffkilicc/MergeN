import sys
from pathlib import Path

# backend/ dizinini sys.path'e ekle
_backend = Path(__file__).resolve().parent.parent
if str(_backend) not in sys.path:
    sys.path.insert(0, str(_backend))

import time
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

def run_benchmark(product_name: str):
    print(f"=== BENCHMARK BAŞLIYOR: {product_name} ===")
    start_time = time.time()
    phase_start_time = start_time
    
    state = _initial_state(product_name)
    config = {"configurable": {"thread_id": f"bench_{product_name.replace(' ', '_')}"}}
    
    seen_phases = set()
    last_state = state
    
    for chunk in graph.stream(state, config, stream_mode="values"):
        last_state = chunk
        phase = chunk.get("current_phase")
        if phase and phase not in seen_phases:
            if seen_phases:
                elapsed = time.time() - phase_start_time
                print(f"[BENCHMARK] Aşama tamamlandı. Geçen süre: {elapsed:.2f} saniye")
            print(f"\n[BENCHMARK] Yeni Aşama: {phase.upper()}...")
            seen_phases.add(phase)
            phase_start_time = time.time()
            
        if chunk.get("error"):
            print(f"\n[BENCHMARK HATA]: {chunk['error']}")
            return

    # Advisor aşaması soru sorduysa otomatik cevapla
    advisor = last_state.get("advisor") or {}
    questions = advisor.get("questions", [])
    if questions:
        print(f"[BENCHMARK] Advisor {len(questions)} soru sordu. Otomatik yanıtlanıyor...")
        answers = {}
        for q in questions:
            q_text = q.get("question", "") if isinstance(q, dict) else str(q)
            answers[q_text] = "Evet"
            
        graph.update_state(config, {"user_profile": UserProfile(answers=answers)})
        phase_start_time = time.time()
        print("\n[BENCHMARK] Yeni Aşama: ADVISOR_DECISION & CHALLENGER...")
        
        for chunk in graph.stream(None, config, stream_mode="values"):
            last_state = chunk
            if chunk.get("error"):
                print(f"\n[BENCHMARK HATA]: {chunk['error']}")
                return

    total_elapsed = time.time() - start_time
    print(f"\n=== BENCHMARK TAMAMLANDI ===")
    print(f"Toplam Geçen Süre: {total_elapsed:.2f} saniye")
    
    advisor = last_state.get("advisor") or {}
    print(f"Karar: {advisor.get('recommendation', '?')} (Skor: {advisor.get('personal_score', '?')}/100)")

if __name__ == "__main__":
    product = "Dyson V15 Detect Absolute"
    run_benchmark(product)
