"""
Ingestion Service — config.py
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str = "postgresql+asyncpg://resqnet:resqnet@postgres:5432/resqnet"
    redis_url: str = "redis://redis:6379"

    # Object storage (S3-compatible)
    object_storage_bucket: str = "resqnet-media"
    object_storage_region: str = "us-east-1"
    object_storage_access_key: str = ""
    object_storage_secret_key: str = ""
    object_storage_endpoint_url: str = ""    # Leave empty for AWS S3; set for MinIO/compatible

    # Signed URL expiry (RULES.md §4 — short expiry only)
    media_url_expiry_seconds: int = 300

    # AI Orchestration Service URL (for embedding calls during dedup)
    ai_orchestration_url: str = "http://ai-orchestration:8002"

    # Deduplication threshold (SCHEMA §4, tunable)
    dedup_similarity_threshold: float = 0.92
    dedup_window_hours: int = 6

    # OpenAI / LLM (used for embedding generation in dedup flow)
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
