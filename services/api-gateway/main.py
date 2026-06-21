"""
API Gateway — main.py
Single public entry point for ResQNet. Handles auth, rate limiting, request routing.
TECHSPEC §2 — Service Boundaries.
"""

from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from auth import JWTMiddleware
from auth_routes import router as auth_router
from rate_limit import RateLimitMiddleware
from router import build_router
from config import Settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = Settings()

redis_client: aioredis.Redis | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    global redis_client
    logger.info("API Gateway starting up")
    redis_client = aioredis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )
    app.state.redis = redis_client
    yield
    logger.info("API Gateway shutting down")
    if redis_client:
        await redis_client.aclose()


app = FastAPI(
    title="ResQNet API Gateway",
    version="1.0.0",
    lifespan=lifespan,
    # Disable docs in production; enable for dev via env
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

# ── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Rate Limiting (Redis-backed sliding window) ──────────────────────────────
app.add_middleware(RateLimitMiddleware)

# ── JWT Auth (excludes /health and public endpoints) ────────────────────────
app.add_middleware(JWTMiddleware)

# Make settings available for auth middleware and other handlers.
app.state.settings = settings

# ── Auth Routes ─────────────────────────────────────────────────────────────
app.include_router(auth_router)

# ── Proxy Routes ─────────────────────────────────────────────────────────────
app.include_router(build_router(settings))


@app.get("/health", include_in_schema=False)
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "api-gateway"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception in API Gateway: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
