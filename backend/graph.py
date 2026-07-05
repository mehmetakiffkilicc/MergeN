import sqlite3
from pathlib import Path

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver

from schemas.state import ProductState
from agents.orchestrator import route
from agents.research_agent import research_node as _research_node
from agents.xray_agent import xray_node as _xray_node
from agents.analysis_agent import analysis_node as _analysis_node
from agents.advisor_agent import advisor_questions_node as _advisor_questions_node, advisor_decision_node as _advisor_decision_node
from agents.challenger_agent import challenger_node as _challenger_node
from tools.profiler import span


def _timed(name, fn):
    def wrapper(state):
        with span(name):
            return fn(state)
    wrapper.__name__ = name
    return wrapper


def orchestrator_node(state: ProductState) -> ProductState:
    if state.get("error"):
        state["current_phase"] = "done"
    return state


research_node         = _timed("node:research",          _research_node)
xray_node             = _timed("node:xray",               _xray_node)
analysis_node         = _timed("node:analysis",           _analysis_node)
advisor_questions_node = _timed("node:advisor_questions", _advisor_questions_node)
advisor_decision_node  = _timed("node:advisor_decision",  _advisor_decision_node)
challenger_node       = _timed("node:challenger",         _challenger_node)


builder = StateGraph(ProductState)

builder.add_node("orchestrator", orchestrator_node)
builder.add_node("research",          research_node)
builder.add_node("xray",              xray_node)
builder.add_node("analysis",          analysis_node)
builder.add_node("advisor_questions", advisor_questions_node)
builder.add_node("advisor_decision",  advisor_decision_node)
builder.add_node("challenger",        challenger_node)

builder.set_entry_point("orchestrator")

builder.add_conditional_edges(
    "orchestrator",
    route,
    {
        "research": "research",
        "xray": "xray",
        "analysis": "analysis",
        "advisor": "advisor_questions",
        "challenger": "challenger",
        "done": END,
    }
)

builder.add_edge("research", "orchestrator")
builder.add_edge("xray", "orchestrator")
builder.add_edge("analysis", "orchestrator")
builder.add_edge("advisor_questions", "advisor_decision")
builder.add_edge("advisor_decision", "orchestrator")
builder.add_edge("challenger", "orchestrator")

_db_path = str(Path(__file__).parent / "checkpoints.db")
_conn = sqlite3.connect(_db_path, check_same_thread=False)

graph = builder.compile(
    checkpointer=SqliteSaver(_conn),
    interrupt_before=["advisor_decision"],
)
