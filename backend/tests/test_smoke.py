"""
Smoke tests — FastAPI endpoint'lerini httpx.AsyncClient ile test eder.
Gemini çağrıları mock'lanır; gerçek API çağrısı yapılmaz.
"""

import json
from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from main import app


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data


@pytest.mark.asyncio
async def test_get_thread_id(client: AsyncClient):
    resp = await client.get("/api/analyze/thread_id", params={"product_name": "Test Ürün"})
    assert resp.status_code == 200
    data = resp.json()
    assert "thread_id" in data
    assert len(data["thread_id"]) == 16


@pytest.mark.asyncio
async def test_summary_not_found(client: AsyncClient):
    resp = await client.get("/api/analyze/summary/nonexistentid")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_answer_invalid_thread(client: AsyncClient):
    payload = {"thread_id": "does_not_exist_00", "answers": {}}
    resp = await client.post("/api/analyze/answer", content=json.dumps(payload),
                             headers={"Content-Type": "application/json"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_chat_no_thread(client: AsyncClient):
    with patch("routers.chat.generate_text", return_value="mock yanıt"):
        payload = {"product_name": "Test", "message": "Merhaba", "thread_id": None}
        resp = await client.post("/api/chat/", content=json.dumps(payload),
                                 headers={"Content-Type": "application/json"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["message"] == "mock yanıt"


@pytest.mark.asyncio
async def test_chat_returns_fresh_response(client: AsyncClient):
    """Her çağrıda farklı yanıt gelir (use_cache=False doğrulaması)."""
    call_count = 0

    def fake_generate(prompt, *, use_cache=True, **kwargs):
        nonlocal call_count
        call_count += 1
        return f"yanıt-{call_count}"

    with patch("routers.chat.generate_text", side_effect=fake_generate):
        payload = {"product_name": "Test", "message": "Tekrar?", "thread_id": None}
        r1 = await client.post("/api/chat/", content=json.dumps(payload),
                               headers={"Content-Type": "application/json"})
        r2 = await client.post("/api/chat/", content=json.dumps(payload),
                               headers={"Content-Type": "application/json"})

    assert r1.json()["message"] != r2.json()["message"]
