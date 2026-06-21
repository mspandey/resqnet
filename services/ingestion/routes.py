"""
Ingestion Service — routes.py
REST endpoints for report submission and media upload.
"""

from __future__ import annotations

import logging
import uuid
from typing import Annotated

import boto3
import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from config import Settings
from db import get_db
from dedup import find_or_create_incident
from models import (
    ClassificationQueueMessage,
    MediaUploadRequest,
    MediaUploadResponse,
    ReportCreate,
    ReportResponse,
    SyncStatus,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["ingestion"])
settings = Settings()


# ── Dependency: extract caller identity from gateway headers ─────────────────

def get_caller(
    x_user_id: Annotated[str | None, Header()] = None,
    x_user_role: Annotated[str | None, Header()] = None,
) -> dict[str, str | None]:
    return {"user_id": x_user_id, "role": x_user_role}


# ── POST /api/reports ─────────────────────────────────────────────────────────

@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    payload: ReportCreate,
    caller: Annotated[dict, Depends(get_caller)],
    db: Annotated[AsyncSession, Depends(get_db)],
    request: Request,
) -> ReportResponse:
    """
    Accept a new disaster report from any channel.
    Runs deduplication; creates or attaches to an existing incident.
    Enqueues classification job via Redis if new incident.
    """
    lon = payload.location.longitude
    lat = payload.location.latitude

    # Resolve district from point (simplified: call PostGIS district lookup)
    district = await _resolve_district(db, lon, lat)

    # ── Deduplication ────────────────────────────────────────────────────────
    incident_id, is_new, embedding = await find_or_create_incident(
        db=db,
        raw_text=payload.raw_text,
        raw_media_url=payload.raw_media_url,
        longitude=lon,
        latitude=lat,
        district=district,
    )

    # ── Persist report row ───────────────────────────────────────────────────
    report_id = uuid.uuid4()
    insert_sql = text("""
        INSERT INTO reports (
            id, incident_id, channel, raw_text, raw_media_url,
            location, reporter_id, sync_status, is_duplicate
        ) VALUES (
            :id, :incident_id, :channel, :raw_text, :raw_media_url,
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326),
            :reporter_id, :sync_status, :is_duplicate
        )
        RETURNING id, incident_id, channel, sync_status, submitted_at
    """)

    result = await db.execute(
        insert_sql,
        {
            "id": str(report_id),
            "incident_id": str(incident_id),
            "channel": payload.channel.value,
            "raw_text": payload.raw_text,
            "raw_media_url": payload.raw_media_url,
            "lon": lon,
            "lat": lat,
            "reporter_id": str(payload.reporter_id) if payload.reporter_id else None,
            "sync_status": payload.sync_status.value,
            "is_duplicate": not is_new,
        },
    )
    await db.commit()
    row = result.fetchone()

    # ── Enqueue classification if new incident ───────────────────────────────
    if is_new:
        redis_client: aioredis.Redis = request.app.state.redis
        queue_msg = ClassificationQueueMessage(
            report_id=report_id,
            incident_id=incident_id,
            channel=payload.channel,
            raw_text=payload.raw_text,
            raw_media_url=payload.raw_media_url,
            location=payload.location,
            district=district,
        )
        await redis_client.lpush(
            "queue:classification",
            queue_msg.model_dump_json(),
        )
        logger.info("Classification job enqueued incident_id=%s", incident_id)

    return ReportResponse(
        id=row.id,
        incident_id=row.incident_id,
        channel=payload.channel,
        location=payload.location,
        submitted_at=row.submitted_at,
        sync_status=payload.sync_status,
        is_duplicate=not is_new,
    )


# ── POST /api/reports/media-upload ───────────────────────────────────────────

@router.post("/reports/media-upload", response_model=MediaUploadResponse)
async def request_media_upload(
    payload: MediaUploadRequest,
    caller: Annotated[dict, Depends(get_caller)],
) -> MediaUploadResponse:
    """
    Generate a short-expiry presigned PUT URL for media upload.
    Client uploads directly to object storage; never through this service.
    RULES.md §4: expiry ≤ 300 seconds; no public-read ACL.
    """
    object_key = f"reports/{uuid.uuid4()}/{payload.filename}"

    if settings.object_storage_access_key:
        # Production: real S3/compatible presigned URL
        s3_kwargs: dict = {
            "region_name": settings.object_storage_region,
            "aws_access_key_id": settings.object_storage_access_key,
            "aws_secret_access_key": settings.object_storage_secret_key,
        }
        if settings.object_storage_endpoint_url:
            s3_kwargs["endpoint_url"] = settings.object_storage_endpoint_url

        s3 = boto3.client("s3", **s3_kwargs)
        upload_url = s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": settings.object_storage_bucket,
                "Key": object_key,
                "ContentType": payload.content_type,
            },
            ExpiresIn=settings.media_url_expiry_seconds,
        )
    else:
        # Dev fallback: stub URL
        upload_url = f"http://localhost:9000/{settings.object_storage_bucket}/{object_key}?stub=true"

    return MediaUploadResponse(
        upload_url=upload_url,
        object_key=object_key,
        expires_in_seconds=settings.media_url_expiry_seconds,
    )


# ── GET /api/incidents/{incident_id}/status ──────────────────────────────────

@router.get("/incidents/{incident_id}/status")
async def get_incident_status(
    incident_id: str,
    caller: Annotated[dict, Depends(get_caller)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    """
    Citizen-safe incident status endpoint.
    Returns ONLY non-PII operational fields (RULES.md §4).
    """
    sql = text("""
        SELECT id, status, severity_tier, incident_type, district, created_at
        FROM incidents
        WHERE id = :incident_id
    """)
    result = await db.execute(sql, {"incident_id": incident_id})
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Incident not found")

    return {
        "id": str(row.id),
        "status": row.status,
        "severity_tier": row.severity_tier,
        "incident_type": row.incident_type,
        "district": row.district,
        "created_at": row.created_at.isoformat(),
    }


# ── Internal: resolve district from coordinates ───────────────────────────────

async def _resolve_district(db: AsyncSession, lon: float, lat: float) -> str:
    """
    Reverse-geocode point to district using PostGIS.
    Falls back to coordinate string if no district polygon loaded.
    """
    sql = text("""
        SELECT name
        FROM districts
        WHERE ST_Contains(
            geometry,
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
        )
        LIMIT 1
    """)
    try:
        result = await db.execute(sql, {"lon": lon, "lat": lat})
        row = result.fetchone()
        if row:
            return row.name
    except Exception as exc:
        logger.warning("District lookup failed (table may not exist yet): %s", exc)

    # Fallback: encode as grid cell
    return f"{lat:.2f},{lon:.2f}"
