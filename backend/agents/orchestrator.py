from schemas.state import ProductState, Phase


PHASE_ORDER: list[Phase] = [
    "research",
    "xray",
    "analysis",
    "advisor",
    "challenger",
]


def route(state: ProductState) -> str:
    if state.get("error"):
        return "done"
    current = state.get("current_phase")
    if current in PHASE_ORDER:
        return current
    return "done"


def advance_phase(state: ProductState) -> ProductState:
    current = state.get("current_phase")
    if current in PHASE_ORDER:
        idx = PHASE_ORDER.index(current)
        if idx + 1 < len(PHASE_ORDER):
            state["current_phase"] = PHASE_ORDER[idx + 1]
        else:
            state["current_phase"] = "done"
    return state
