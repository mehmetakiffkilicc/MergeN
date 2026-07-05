from typing import Any

from pydantic import BaseModel


class AnalyzeRequest(BaseModel):
    product_name: str
    product_url: str | None = None


class ChatRequest(BaseModel):
    product_name: str
    message: str
    thread_id: str | None = None


class AdvisorAnswersRequest(BaseModel):
    thread_id: str
    answers: dict[str, str]


class PhaseEvent(BaseModel):
    """SSE stream olayı — her faz geçişinde emit edilir."""
    event: str          # "phase" | "result" | "error" | "done"
    phase: str | None = None
    data: Any = None


class SummaryResponse(BaseModel):
    """Browser extension için < 2KB hafif özet."""
    product_name: str
    recommendation: str         # AL | KOŞULLU | ALMA
    personal_score: float | None
    trust_total: float | None
    data_gaps: list[str]
    strengths: list[str]        # aspect listesi, max 3
    weaknesses: list[str]       # aspect listesi, max 3
    cached: bool = False


class ChatResponse(BaseModel):
    message: str
    thread_id: str | None = None
