"""
Ingestion Service — models.py
Pydantic models matching SCHEMA.md §2 exactly (RULES.md §1).
Entity names match the schema: Report, Incident, VolunteerProfile, etc.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


# ── Enums (mirror SQL enums in 002_core_schema.sql) ─────────────────────────

class UserRole(str, Enum):
    citizen = "citizen"
    volunteer = "volunteer"
    rescue_team = "rescue_team"
    authority = "authority"


class ReportChannel(str, Enum):
    app = "app"
    voice = "voice"
    sms = "sms"
    iot_sensor = "iot_sensor"


class SyncStatus(str, Enum):
    synced = "synced"
    queued_offline = "queued_offline"


class IncidentStatus(str, Enum):
    reported = "reported"
    classifying = "classifying"
    classified = "classified"
    dispatched = "dispatched"
    en_route = "en_route"
    on_site = "on_site"
    resolved = "resolved"
    flagged_duplicate = "flagged_duplicate"


class SeverityTier(str, Enum):
    critical = "critical"
    high = "high"
    moderate = "moderate"
    low = "low"


# ── Geolocation ──────────────────────────────────────────────────────────────

class GeoPoint(BaseModel):
    """WGS-84 coordinate pair (longitude, latitude — GeoJSON order)."""
    longitude: float = Field(..., ge=-180, le=180)
    latitude: float = Field(..., ge=-90, le=90)


# ── Report models ────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    """
    Inbound payload for POST /reports.
    Supports all channels: app, voice, sms, iot_sensor.
    reporter_id nullable to support anonymous SMS reports (RULES.md §4, SCHEMA §2.6).
    """
    channel: ReportChannel
    raw_text: Optional[str] = None
    raw_media_url: Optional[str] = None   # Pre-uploaded to object storage by client
    location: GeoPoint
    reporter_id: Optional[UUID] = None    # Nullable: anonymous SMS
    sync_status: SyncStatus = SyncStatus.synced

    @model_validator(mode="after")
    def require_content(self) -> "ReportCreate":
        if not self.raw_text and not self.raw_media_url:
            raise ValueError("Report must have raw_text or raw_media_url (or both)")
        return self


class ReportResponse(BaseModel):
    id: UUID
    incident_id: Optional[UUID]   # None if still being deduplicated
    channel: ReportChannel
    location: GeoPoint
    submitted_at: datetime
    sync_status: SyncStatus
    is_duplicate: bool = False    # True if attached to existing incident via dedup

    model_config = {"from_attributes": True}


# ── Incident models ──────────────────────────────────────────────────────────

class IncidentStatusResponse(BaseModel):
    """
    Citizen-facing live status response.
    Contains ONLY operational fields — no citizen PII exposed (RULES.md §4).
    """
    id: UUID
    status: IncidentStatus
    severity_tier: Optional[SeverityTier]
    incident_type: Optional[str]
    district: str
    created_at: datetime

    model_config = {"from_attributes": True}


class IncidentDetailResponse(BaseModel):
    """
    Extended incident detail — role-scoped.
    PII fields (reporter phone) are excluded from this model;
    rescue-team-only PII is gated at the route handler level.
    """
    id: UUID
    status: IncidentStatus
    severity_tier: Optional[SeverityTier]
    severity_score_raw: Optional[float]
    severity_overridden_by: Optional[UUID]   # Shows override happened; no PII of overrider
    incident_type: Optional[str]
    location: GeoPoint
    district: str
    created_at: datetime
    resolved_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ── Media upload ─────────────────────────────────────────────────────────────

class MediaUploadRequest(BaseModel):
    filename: str
    content_type: str = Field(..., pattern=r"^(image|audio)/")  # Restrict to media types


class MediaUploadResponse(BaseModel):
    upload_url: str   # Short-expiry presigned PUT URL (RULES.md §4 — never a public URL)
    object_key: str
    expires_in_seconds: int = 300


# ── Internal queue message ───────────────────────────────────────────────────

class ClassificationQueueMessage(BaseModel):
    """Payload enqueued to Redis for AI Orchestration Service consumption."""
    report_id: UUID
    incident_id: UUID
    channel: ReportChannel
    raw_text: Optional[str]
    raw_media_url: Optional[str]
    location: GeoPoint
    district: str
