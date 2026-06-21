"""
API Gateway — rate_limit.py
Redis-backed sliding-window rate limiter.
Per-IP for anonymous routes; per-user for authenticated routes.
"""

from __future__ import annotations

import logging
import time
from typing import Callable

import redis.asyncio as aioredis
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

RATE_LIMIT_RPM = 60       # requests per minute (authenticated users)
RATE_LIMIT_RPM_ANON = 20  # stricter for anonymous/IP-only
WINDOW_SECONDS = 60


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window rate limiter using Redis sorted sets."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip health check
        if request.url.path == "/health":
            return await call_next(request)

        redis: aioredis.Redis | None = getattr(request.app.state, "redis", None)
        if redis is None:
            # Redis unavailable — allow request (fail open for availability, TECHSPEC §9)
            logger.warning("Rate limiter: Redis unavailable, allowing request")
            return await call_next(request)

        # Identify by user_id if authenticated, else by IP
        user_id: str | None = getattr(request.state, "user_id", None)
        key_suffix = user_id if user_id else (request.client.host if request.client else "unknown")
        key = f"ratelimit:{key_suffix}"
        limit = RATE_LIMIT_RPM if user_id else RATE_LIMIT_RPM_ANON

        now = time.time()
        window_start = now - WINDOW_SECONDS

        async with redis.pipeline(transaction=True) as pipe:
            pipe.zremrangebyscore(key, "-inf", window_start)
            pipe.zadd(key, {str(now): now})
            pipe.zcard(key)
            pipe.expire(key, WINDOW_SECONDS + 1)
            results = await pipe.execute()

        request_count: int = results[2]

        if request_count > limit:
            logger.warning("Rate limit exceeded for key=%s count=%d", key_suffix, request_count)
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please slow down."},
                headers={"Retry-After": str(WINDOW_SECONDS)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, limit - request_count))
        return response
