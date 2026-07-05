"""
SQLite-tabanlı async cache.
Schema: key TEXT PRIMARY KEY, value TEXT (JSON), expires_at REAL (Unix timestamp).
"""

import json
import time
from pathlib import Path

import aiosqlite
from config import settings

_DB = settings.cache_db_path

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS cache (
    key       TEXT PRIMARY KEY,
    value     TEXT NOT NULL,
    expires_at REAL NOT NULL
)
"""


async def init_db() -> None:
    async with aiosqlite.connect(_DB) as db:
        await db.execute(_CREATE_TABLE)
        await db.commit()


async def get(key: str) -> dict | None:
    async with aiosqlite.connect(_DB) as db:
        async with db.execute(
            "SELECT value, expires_at FROM cache WHERE key = ?", (key,)
        ) as cursor:
            row = await cursor.fetchone()
    if row is None:
        return None
    value_json, expires_at = row
    if time.time() > expires_at:
        return None
    return json.loads(value_json)


async def set_cache(key: str, value: dict, ttl: int | None = None) -> None:
    ttl = ttl if ttl is not None else settings.cache_ttl_seconds
    expires_at = time.time() + ttl
    async with aiosqlite.connect(_DB) as db:
        await db.execute(
            "INSERT OR REPLACE INTO cache (key, value, expires_at) VALUES (?, ?, ?)",
            (key, json.dumps(value, ensure_ascii=False), expires_at),
        )
        await db.commit()


async def is_expired(key: str) -> bool:
    async with aiosqlite.connect(_DB) as db:
        async with db.execute(
            "SELECT expires_at FROM cache WHERE key = ?", (key,)
        ) as cursor:
            row = await cursor.fetchone()
    if row is None:
        return True
    return time.time() > row[0]


async def delete(key: str) -> None:
    async with aiosqlite.connect(_DB) as db:
        await db.execute("DELETE FROM cache WHERE key = ?", (key,))
        await db.commit()


async def purge_expired() -> int:
    async with aiosqlite.connect(_DB) as db:
        cursor = await db.execute(
            "DELETE FROM cache WHERE expires_at < ?", (time.time(),)
        )
        await db.commit()
        return cursor.rowcount
