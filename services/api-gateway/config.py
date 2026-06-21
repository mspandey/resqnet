"""
API Gateway — config.py
Typed settings via pydantic-settings (reads from environment / .env file).
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    # Downstream service base URLs
    ingestion_url: str = "http://ingestion:8001"
    ai_orchestration_url: str = "http://ai-orchestration:8002"
    dispatch_resource_url: str = "http://dispatch-resource:3001"
    notification_url: str = "http://notification:3002"

    # Redis (rate limiting + session cache)
    redis_url: str = "redis://redis:6379"

    # Database
    database_url: str = "postgresql+asyncpg://resqnet:resqnet@postgres:5432/resqnet"
    allow_admin_registration: bool = False

    # JWT
    jwt_secret: str = "changeme"
    jwt_algorithm: str = "HS256"

    # CORS — comma-separated list
    allowed_origins_str: str = "http://localhost:3000,http://web:3000"

    @property
    def allowed_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins_str.split(",")]

    # Rate limits
    rate_limit_requests_per_minute: int = 60
    rate_limit_burst: int = 20
