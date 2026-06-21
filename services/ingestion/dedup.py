"""
Ingestion Service — dedup.py
Vector-based report deduplication using pgvector cosine similarity.

Algorithm (SCHEMA.md §4 — Deduplication Flow):
1. Generate embedding for incoming report (raw_text + location tokens).
2. Query existing incidents within dedup window (6h) and geographic radius (5km)
   using <=> cosine distance operator (pgvector).
3. If best match distance ≤ (1 - threshold): attach report to existing incident.
4. Otherwise: create new incident record.
5. Always record dedup metadata in report row.

RULES.md §3: model_version must be logged. This module logs the embedding model
name on every embedding call (written back to the incident row in main flow).
"""

from __future__ import annotations

import logging
from uuid import UUID

import httpx
from openai import AsyncOpenAI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import Settings

logger = logging.getLogger(__name__)

settings = Settings()
_openai_client: AsyncOpenAI | None = None


def _get_openai_client() -> AsyncOpenAI:
    global _openai_client
    if _openai_client is None:
        _openai_client = AsyncOpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
        )
    return _openai_client


async def generate_embedding(text_content: str) -> list[float]:
    """
    Generate a text embedding via OpenAI-compatible API.
    Returns list[float] of length=embedding_dimensions.
    Logs model used (RULES.md §3 — model_version tracking).
    """
    if not settings.llm_api_key:
        logger.warning("LLM_API_KEY not set — returning zero vector (dev mode)")
        return [0.0] * settings.embedding_dimensions

    client = _get_openai_client()
    response = await client.embeddings.create(
        model=settings.embedding_model,
        input=text_content,
        dimensions=settings.embedding_dimensions,
    )
    logger.info("Embedding generated model=%s tokens=%d", settings.embedding_model, response.usage.total_tokens)
    return response.data[0].embedding


def _build_dedup_text(raw_text: str | None, longitude: float, latitude: float) -> str:
    """
    Construct a canonical text representation for embedding.
    Location tokens are appended to make geo-proximate reports more similar.
    Grid-snapping to 3 decimal places (~111m precision) prevents minor GPS drift
    from generating divergent embeddings.
    """
    geo_token = f"LOC {longitude:.3f} {latitude:.3f}"
    content = (raw_text or "").strip()
    return f"{content} {geo_token}".strip()


async def find_or_create_incident(
    *,
    db: AsyncSession,
    raw_text: str | None,
    raw_media_url: str | None,
    longitude: float,
    latitude: float,
    district: str,
) -> tuple[UUID, bool, list[float]]:
    """
    Core deduplication entrypoint.

    Returns:
        (incident_id, is_new, embedding)
        is_new=True  → caller should trigger classification
        is_new=False → report attached to existing incident (duplicate)
    """
    # 1. Generate embedding
    dedup_text = _build_dedup_text(raw_text, longitude, latitude)
    embedding = await generate_embedding(dedup_text)
    embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"

    # 2. Search for nearby incidents within the dedup window
    # Uses pgvector cosine distance (<=>).
    # SCHEMA §4: dedup_window_hours=6, radius=5km.
    search_sql = text("""
        SELECT
            id,
            1 - (text_embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM incidents
        WHERE
            status NOT IN ('resolved', 'flagged_duplicate')
            AND created_at >= NOW() - INTERVAL ':window hours'
            AND ST_DWithin(
                geography(location),
                geography(ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)),
                5000   -- 5 km radius
            )
        ORDER BY similarity DESC
        LIMIT 1
    """)

    # Note: :window in an INTERVAL literal requires string replacement (not bind param)
    # Rewrite to use a proper interval approach:
    search_sql = text("""
        SELECT
            id,
            1 - (text_embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM incidents
        WHERE
            status NOT IN ('resolved', 'flagged_duplicate')
            AND created_at >= NOW() - (:window_hours * INTERVAL '1 hour')
            AND ST_DWithin(
                geography(location),
                geography(ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)),
                5000
            )
        ORDER BY similarity DESC
        LIMIT 1
    """)

    result = await db.execute(
        search_sql,
        {
            "embedding": embedding_str,
            "window_hours": settings.dedup_window_hours,
            "lon": longitude,
            "lat": latitude,
        },
    )
    row = result.fetchone()

    if row and row.similarity >= settings.dedup_similarity_threshold:
        incident_id: UUID = row.id
        logger.info(
            "Dedup HIT: report attached to incident=%s similarity=%.4f",
            incident_id,
            row.similarity,
        )
        return incident_id, False, embedding

    # 3. No match — create a new incident shell (classification fills the rest)
    create_sql = text("""
        INSERT INTO incidents (
            location,
            district,
            text_embedding,
            status
        ) VALUES (
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
            :district,
            CAST(:embedding AS vector),
            'reported'
        )
        RETURNING id
    """)

    result = await db.execute(
        create_sql,
        {
            "lon": longitude,
            "lat": latitude,
            "district": district,
            "embedding": embedding_str,
        },
    )
    await db.commit()
    new_incident_id: UUID = result.scalar_one()
    logger.info("Dedup MISS: new incident created id=%s", new_incident_id)
    return new_incident_id, True, embedding
