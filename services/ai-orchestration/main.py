"""
AI Orchestration Service — main.py
Starts the HTTP health endpoint + background worker coroutine.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI

from config import Settings
from worker import run_worker

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = Settings()

_worker_task: asyncio.Task | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _worker_task
    redis_client = aioredis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
    app.state.redis = redis_client
    _worker_task = asyncio.create_task(run_worker(redis_client))
    logger.info("AI Orchestration Service started — worker running")
    yield
    if _worker_task:
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass
    await redis_client.aclose()
    logger.info("AI Orchestration Service stopped")


app = FastAPI(
    title="ResQNet AI Orchestration Service",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)


@app.get("/health", include_in_schema=False)
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "ai-orchestration"}
