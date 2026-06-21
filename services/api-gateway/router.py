"""
API Gateway — router.py
Reverse-proxy routes to downstream microservices.
All routes validated for auth before reaching here (auth middleware runs first).
"""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, Request, Response
from fastapi.routing import APIRoute

from config import Settings

logger = logging.getLogger(__name__)

# Mapping of route prefixes to downstream service URLs
ROUTE_MAP: list[tuple[str, str]] = [
    ("/api/reports", "ingestion_url"),
    ("/api/incidents", "ingestion_url"),
    ("/api/queue", "dispatch_resource_url"),
    ("/api/dispatch", "dispatch_resource_url"),
    ("/api/resources", "dispatch_resource_url"),
    ("/api/notifications", "notification_url"),
]


def build_router(settings: Settings) -> APIRouter:
    router = APIRouter()

    async def _proxy(request: Request, target_base: str) -> Response:
        """Generic reverse-proxy handler."""
        path = request.url.path
        query = request.url.query
        target_url = f"{target_base}{path}"
        if query:
            target_url = f"{target_url}?{query}"

        body = await request.body()

        # Forward x-user-id and x-user-role headers set by auth middleware
        headers = {
            k: v
            for k, v in request.headers.items()
            if k.lower() not in ("host", "content-length")
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.request(
                    method=request.method,
                    url=target_url,
                    headers=headers,
                    content=body,
                )
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get("content-type"),
            )
        except httpx.ConnectError:
            logger.error("Cannot connect to downstream service: %s", target_url)
            return Response(
                content=b'{"detail":"Downstream service unavailable"}',
                status_code=503,
                media_type="application/json",
            )
        except httpx.TimeoutException:
            logger.error("Timeout proxying to: %s", target_url)
            return Response(
                content=b'{"detail":"Request timed out"}',
                status_code=504,
                media_type="application/json",
            )

    # Register a catch-all route for each prefix
    for prefix, settings_key in ROUTE_MAP:
        target_base = getattr(settings, settings_key)

        # Closure to capture target_base correctly
        def make_handler(base: str):
            async def handler(request: Request) -> Response:
                return await _proxy(request, base)
            return handler

        router.add_route(
            f"{prefix}/{{path:path}}",
            make_handler(target_base),
            methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        )
        # Also handle exact prefix (no trailing path)
        router.add_route(
            prefix,
            make_handler(target_base),
            methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        )

    return router
