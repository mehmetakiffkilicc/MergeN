"""
MergeN Backend — FastAPI + LangGraph pipeline.

Endpoints:
  POST /api/analyze/stream       → SSE pipeline akışı
  POST /api/analyze/answer       → Advisor interrupt cevapları
  GET  /api/analyze/summary/{id} → Browser extension özeti (< 2KB)
  GET  /api/analyze/thread_id    → Deterministik thread_id hesabı
  POST /api/chat/                → Gemini Flash sohbet

Çalıştırma:
  cd backend
  uvicorn main:app --reload --port 8765
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from tools.cache_db import init_db, purge_expired
from routers.analyze import router as analyze_router
from routers.chat import router as chat_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    logger.info("Cache DB başlatıldı.")
    yield
    await purge_expired()
    logger.info("Süresi dolmuş cache girişleri temizlendi.")


app = FastAPI(
    title="MergeN API",
    description="E-ticaret ürün manipülasyon tespiti ve karar destek sistemi.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze_router)
app.include_router(chat_router)


@app.get("/health")
async def health():
    from config import settings
    from tools.cache_db import init_db as _init_db
    import aiosqlite

    missing = []
    if not settings.gemini_api_key:
        missing.append("GEMINI_API_KEY")
    if not settings.tavily_api_key:
        missing.append("TAVILY_API_KEY")

    db_ok = True
    try:
        async with aiosqlite.connect(settings.cache_db_path) as _db:
            await _db.execute("SELECT 1")
    except Exception:
        db_ok = False

    graph_ok = True
    try:
        from graph import graph  # noqa: F401
    except Exception:
        graph_ok = False

    status = "ok" if not missing and db_ok and graph_ok else "degraded"
    result: dict = {"status": status}
    if missing:
        result["missing"] = missing
    if not db_ok:
        result["cache_db"] = "error"
    if not graph_ok:
        result["graph"] = "error"
    return result
