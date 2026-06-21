-- 002_core_schema.sql
-- All entity names match SCHEMA.md exactly (RULES.md §1: no ad hoc renamings)
-- Depends on: 001_extensions.sql

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('citizen', 'volunteer', 'rescue_team', 'authority');

CREATE TYPE availability_status AS ENUM ('available', 'on_task', 'offline');

CREATE TYPE team_status AS ENUM ('available', 'dispatched', 'off_duty');

CREATE TYPE agency_type AS ENUM ('government', 'ngo', 'private');

CREATE TYPE report_channel AS ENUM ('app', 'voice', 'sms', 'iot_sensor');

CREATE TYPE sync_status AS ENUM ('synced', 'queued_offline');

-- Incident lifecycle per SCHEMA.md §3 state machine
CREATE TYPE incident_status AS ENUM (
    'reported',
    'classifying',
    'classified',
    'dispatched',
    'en_route',
    'on_site',
    'resolved',
    'flagged_duplicate'
);

-- Severity tiers per DESIGN.md §3.1 (used identically across all 4 surfaces)
CREATE TYPE severity_tier AS ENUM ('critical', 'high', 'moderate', 'low');

CREATE TYPE dispatch_status AS ENUM (
    'queued',
    'assigned',
    'en_route',
    'on_site',
    'resolved',
    'cancelled'
);

CREATE TYPE resource_status AS ENUM ('available', 'allocated', 'depleted');

-- ============================================================
-- CORE TABLES
-- ============================================================

-- 2.5 Agency (no FK deps)
CREATE TABLE agencies (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name             TEXT NOT NULL,
    type             agency_type NOT NULL,
    contract_tier    TEXT          -- Maps to PRD/business model (Phase 3)
);

-- 2.1 User
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role                user_role NOT NULL,
    name                TEXT NOT NULL,
    phone               TEXT NOT NULL,   -- Required: SMS fallback channel (TECHSPEC §4)
    email               TEXT,            -- Nullable per SCHEMA.md
    preferred_language  TEXT NOT NULL DEFAULT 'en',  -- ISO 639-1; drives UI + voice detection (DESIGN §3.3)
    location_last_known geography(Point, 4326),      -- Nullable; used for proximity matching
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    auth_provider_id    TEXT             -- Maps to auth service identity
);

-- 2.4 Team (depends on Agency)
CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id       UUID NOT NULL REFERENCES agencies(id) ON DELETE RESTRICT,
    name            TEXT NOT NULL,
    home_district   TEXT NOT NULL,
    current_status  team_status NOT NULL DEFAULT 'available'
);

-- 2.2 VolunteerProfile (extends User where role = volunteer)
CREATE TABLE volunteer_profiles (
    user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    skills              TEXT[] NOT NULL DEFAULT '{}',  -- Self-reported, uncertified in MVP (PRD §7)
    availability_status availability_status NOT NULL DEFAULT 'offline'
);

-- 2.3 RescueTeamMember (extends User where role = rescue_team)
CREATE TABLE rescue_team_members (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE RESTRICT
);

-- 2.7 Incident
-- description_embedding vector(1536): pgvector column for dedup (TECHSPEC §6, SCHEMA §4)
-- 1536 dimensions matches OpenAI text-embedding-ada-002 / text-embedding-3-small output (SCHEMA §6 note)
-- district denormalized for dashboard query performance (SCHEMA §5)
CREATE TABLE incidents (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status                  incident_status NOT NULL DEFAULT 'reported',
    severity_tier           severity_tier,            -- Nullable until classified
    severity_score_raw      FLOAT,                    -- Underlying model score before tiering
    severity_overridden_by  UUID REFERENCES users(id), -- Set if dispatcher manually changed tier (TECHSPEC §3)
    incident_type           TEXT,                     -- e.g., "flood", "structural_collapse", "medical"
    location                geography(Point, 4326) NOT NULL,
    district                TEXT NOT NULL,            -- Denormalized for fast aggregate queries (SCHEMA §5)
    description_embedding   vector(1536),             -- pgvector; used for dedup (TECHSPEC §6)
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at             TIMESTAMPTZ
);

-- 2.6 Report (raw input, pre-fusion)
-- reporter_id nullable to support anonymous SMS reports (RULES.md §4, SCHEMA §2.6)
CREATE TABLE reports (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id      UUID REFERENCES incidents(id) ON DELETE SET NULL,  -- Null until fused (SCHEMA §4 dedup flow)
    reporter_id      UUID REFERENCES users(id) ON DELETE SET NULL,      -- Nullable: anonymous SMS
    channel          report_channel NOT NULL,
    raw_text         TEXT,
    raw_media_url    TEXT,    -- Pointer to object storage; never public URL (RULES.md §4)
    transcript       TEXT,   -- Populated by faster-whisper if voice (TECHSPEC §1)
    detected_language TEXT,
    location         geography(Point, 4326) NOT NULL,
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_status      sync_status NOT NULL DEFAULT 'synced'  -- Citizen-app offline tracking (TECHSPEC §4)
);

-- 2.8 Classification (1-to-1 with Incident, output of AI pipeline)
-- model_version is NON-NEGOTIABLE per RULES.md §3 — logged on every classification run
CREATE TABLE classifications (
    incident_id     UUID PRIMARY KEY REFERENCES incidents(id) ON DELETE CASCADE,
    model_version   TEXT NOT NULL,   -- RULES.md §3: non-negotiable, enforced at AI Orchestration level
    damage_tags     TEXT[],          -- YOLOv8 output (Phase 2); nullable until image present
    risk_forecast   JSONB,           -- Risk Prediction Module output (Phase 2)
    classified_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.9 Dispatch
CREATE TABLE dispatches (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id    UUID NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
    team_id        UUID REFERENCES teams(id) ON DELETE SET NULL,
    status         dispatch_status NOT NULL DEFAULT 'queued',
    assigned_at    TIMESTAMPTZ,
    resolved_at    TIMESTAMPTZ,
    outcome_notes  TEXT   -- Logged by rescue team on case close (WEBFLOW §3.2)
);

-- 2.10 Resource (supplies, distinct from Teams)
CREATE TABLE resources (
    id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id  UUID REFERENCES teams(id) ON DELETE SET NULL,
    type     TEXT NOT NULL,     -- e.g., "ambulance", "boat", "medical_kit"
    quantity INT NOT NULL DEFAULT 1,
    status   resource_status NOT NULL DEFAULT 'available'
);
