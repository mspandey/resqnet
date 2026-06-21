"""
Ingestion Service — main.py
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.responses import JSONResponse

from config import Settings
from routes import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Ingestion Service starting up")
    app.state.redis = aioredis.from_url(
        settings.redis_url, encoding="utf-8", decode_responses=True
    )
    yield
    logger.info("Ingestion Service shutting down")
    await app.state.redis.aclose()


app = FastAPI(
    title="ResQNet Ingestion Service",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

app.include_router(router)


@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok", "service": "ingestion"}
