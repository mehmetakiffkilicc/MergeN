"""
/api/chat — Gemini Flash ile ürün state'i bağlamında sohbet.
"""

import asyncio
import logging

from fastapi import APIRouter

from tools.gemini import generate_text
from schemas.api import ChatRequest, ChatResponse
from tools.cache_db import get as cache_get
from config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


def _build_context(state: dict) -> str:
    advisor = state.get("advisor") or {}
    wts = state.get("weighted_trust_score") or {}
    analysis = state.get("analysis") or {}
    xray = state.get("xray") or {}
    challenger = state.get("challenger") or {}

    strengths = ", ".join(s["aspect"] for s in analysis.get("strengths", [])[:3])
    weaknesses = ", ".join(w["aspect"] for w in analysis.get("weaknesses", [])[:3])
    gaps = ", ".join(xray.get("data_gaps", [])) or "yok"

    return f"""Ürün: {state.get('product_name', '?')}
Karar: {advisor.get('recommendation', '?')}
Skor: {advisor.get('personal_score', '?')}
Güven skoru: {wts.get('total', '?')}/100 (forum={wts.get('forum_signal', '?')}, youtube={wts.get('youtube_signal', '?')})
Güçlü: {strengths or 'yok'}
Zayıf: {weaknesses or 'yok'}
Veri açığı: {gaps}
Nihai tavsiye: {challenger.get('balanced_advice', '?')}"""


@router.post("/", response_model=ChatResponse)
async def chat(req: ChatRequest):
    thread_id = req.thread_id
    context = ""

    if thread_id:
        cached = await cache_get(f"result:{thread_id}")
        if cached:
            context = _build_context(cached)

    system = (
        "Sen MergeN'in analiz asistanısın. Türk e-ticaret ürün analizleri konusunda "
        "kullanıcıya yardım edersin. Kısa, net, Türkçe cevaplar ver."
    )
    if context:
        system += f"\n\n## Analiz Bağlamı\n{context}"

    prompt = f"{system}\n\nKullanıcı: {req.message}\nAsistan:"

    try:
        reply = await asyncio.to_thread(generate_text, prompt, model=settings.model_pro, use_cache=False)
    except Exception as exc:
        logger.warning("Gemini chat hatası: %s", exc)
        reply = None
    if not reply:
        reply = "Şu anda cevap üretemiyorum, lütfen tekrar deneyin."

    logger.info("Chat yanıtı üretildi: thread_id=%s", thread_id)
    return ChatResponse(message=reply, thread_id=thread_id)
