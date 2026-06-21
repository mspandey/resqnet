"""
API Gateway — auth.py
JWT verification middleware. Extracts user_id and role from Bearer token.
Role is enforced server-side here; client-side route guards are UX convenience only (WEBFLOW §4).
"""

from __future__ import annotations

import logging
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

# Routes that do NOT require authentication
PUBLIC_PATHS: frozenset[str] = frozenset(
    [
        "/health",
        "/api/auth/login",
        "/api/auth/register",
        "/api/reports/sms",  # Twilio SMS webhook — authenticated by Twilio signature, not JWT
    ]
)


class JWTMiddleware(BaseHTTPMiddleware):
    """
    Validates JWT Bearer token on every non-public request.
    Populates request.state.user_id and request.state.role on success.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if self._is_public(request):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or malformed Authorization header"},
            )

        token = auth_header.removeprefix("Bearer ")
        settings = request.app.state.settings if hasattr(request.app.state, "settings") else None

        # Read secret from app state or fall back to env
        from config import Settings
        cfg = Settings()

        try:
            payload = jwt.decode(token, cfg.jwt_secret, algorithms=[cfg.jwt_algorithm])
        except JWTError as exc:
            logger.warning("JWT validation failed: %s", exc)
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired token"},
            )

        user_id = payload.get("sub")
        role = payload.get("role")

        if not user_id or not role:
            return JSONResponse(
                status_code=401,
                content={"detail": "Token missing required claims (sub, role)"},
            )

        # Inject into request state — downstream route handlers read from here
        request.state.user_id = user_id
        request.state.role = role

        # Forward user context to downstream services via headers
        request.scope["headers"] = list(request.scope["headers"]) + [
            (b"x-user-id", user_id.encode()),
            (b"x-user-role", role.encode()),
        ]

        return await call_next(request)

    @staticmethod
    def _is_public(request: Request) -> bool:
        return request.url.path in PUBLIC_PATHS or request.url.path.startswith("/docs")
