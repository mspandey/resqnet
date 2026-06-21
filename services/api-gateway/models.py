"""
API Gateway — models.py
Role-scoped Pydantic response models.
RULES.md §2: No PII must leak to unauthorized roles.
All response models are explicitly scoped by role; any field that could expose PII
(phone, email, auth_provider_id) is EXCLUDED from public / low-privilege models.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ── Shared enums / literals ──────────────────────────────────────────────────

class SeverityTier(str):
    CRITICAL = "critical"
    HIGH = "high"
    MODERATE = "moderate"
    LOW = "low"


class IncidentStatus(str):
    REPORTED = "reported"
    CLASSIFYING = "classifying"
    CLASSIFIED = "classified"
    DISPATCHED = "dispatched"
    EN_ROUTE = "en_route"
    ON_SITE = "on_site"
    RESOLVED = "resolved"
    FLAGGED_DUPLICATE = "flagged_duplicate"


# ── Location ──────────────────────────────────────────────────────────────────

class LocationOut(BaseModel):
    latitude: float
    longitude: float


# ── Incident — public view (citizen / volunteer) ─────────────────────────────
# RULES.md §2: No severity_score_raw, no severity_overridden_by exposed here.

class IncidentPublicOut(BaseModel):
    id: UUID
    status: str
    severity_tier: Optional[str] = None
    incident_type: Optional[str] = None
    district: str
    location: LocationOut
    created_at: datetime

    class Config:
        from_attributes = True


# ── Incident — command view (rescue_team / authority) ────────────────────────
# Adds raw score and override metadata for operational decision-making.

class IncidentCommandOut(IncidentPublicOut):
    severity_score_raw: Optional[float] = None
    severity_overridden_by: Optional[UUID] = None
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Report — submission (all authenticated users) ────────────────────────────

class ReportIn(BaseModel):
    channel: str = Field(..., pattern="^(app|voice|sms|iot_sensor)$")
    raw_text: Optional[str] = None
    location: LocationOut
    # reporter_id injected by auth middleware — never accepted from client body


class ReportOut(BaseModel):
    id: UUID
    incident_id: Optional[UUID] = None
    channel: str
    submitted_at: datetime
    is_duplicate: bool = False

    class Config:
        from_attributes = True


# ── User — public view (non-sensitive) ───────────────────────────────────────
# RULES.md §2: phone, email, auth_provider_id EXCLUDED from this model.

class UserPublicOut(BaseModel):
    id: UUID
    role: str
    name: str
    preferred_language: str

    class Config:
        from_attributes = True


# ── User — authority view (internal) ─────────────────────────────────────────
# Only served to x-user-role: authority. Phone exposed for SMS coordination.

class UserAuthorityOut(UserPublicOut):
    phone: str
    email: Optional[str] = None

    class Config:
        from_attributes = True


# ── Team ─────────────────────────────────────────────────────────────────────

class TeamOut(BaseModel):
    id: UUID
    name: str
    home_district: str
    current_status: str
    agency_id: UUID

    class Config:
        from_attributes = True


# ── Dispatch ─────────────────────────────────────────────────────────────────

class DispatchOut(BaseModel):
    id: UUID
    incident_id: UUID
    team_id: Optional[UUID] = None
    status: str
    assigned_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    outcome_notes: Optional[str] = None

    class Config:
        from_attributes = True


# ── Classification ────────────────────────────────────────────────────────────

class ClassificationOut(BaseModel):
    incident_id: UUID
    model_version: str   # RULES.md §3: non-negotiable, always returned
    damage_tags: Optional[list[str]] = None
    risk_forecast: Optional[dict] = None
    classified_at: datetime

    class Config:
        from_attributes = True


# ── Severity override request ─────────────────────────────────────────────────

class SeverityOverrideIn(BaseModel):
    """
    Severity override request body.
    RULES.md §3: Human overrides must record user attribution (user_id injected
    from x-user-id header by the auth middleware, not from request body).
    """
    new_severity_tier: str = Field(..., pattern="^(critical|high|moderate|low)$")
    reason: str = Field(..., min_length=5, description="Required justification for the override")


# ── Error response ────────────────────────────────────────────────────────────

class ErrorOut(BaseModel):
    detail: str
