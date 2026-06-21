"""
AI Orchestration Service — config.py
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    database_url: str = "postgresql+asyncpg://resqnet:resqnet@postgres:5432/resqnet"
    redis_url: str = "redis://redis:6379"

    # LLM config
    llm_api_key: str = ""
    llm_base_url: str = "https://api.openai.com/v1"
    classification_model: str = "gpt-4o-mini"
    classification_temperature: float = 0.1   # Low temp for deterministic classification
    embedding_model: str = "text-embedding-3-small"
    embedding_dimensions: int = 1536
