-- 003_indexes.sql
-- Performance indexes for all geography, vector, FK, and status columns
-- Depends on: 002_core_schema.sql

-- ============================================================
-- PostGIS GiST indexes on geography(Point) columns
-- Required for proximity queries: volunteer matching, rescue dispatch distance sort (SCHEMA §5)
-- ============================================================

CREATE INDEX idx_users_location ON users USING GIST (location_last_known);
CREATE INDEX idx_reports_location ON reports USING GIST (location);
CREATE INDEX idx_incidents_location ON incidents USING GIST (location);

-- ============================================================
-- pgvector IVFFlat index for deduplication cosine similarity
-- Used by: Ingestion Service dedup.py (SCHEMA §4, TECHSPEC §6)
-- lists=100 is a reasonable starting point for MVP; tune once report volume is known
-- ============================================================

CREATE INDEX idx_incidents_description_embedding
    ON incidents
    USING ivfflat (description_embedding vector_cosine_ops)
    WITH (lists = 100);

-- ============================================================
-- B-tree indexes on status enums and FK columns
-- ============================================================

-- Incident lookups by status (dispatch queue, dashboard aggregates)
CREATE INDEX idx_incidents_status ON incidents (status);
CREATE INDEX idx_incidents_severity_tier ON incidents (severity_tier);
CREATE INDEX idx_incidents_district ON incidents (district);
CREATE INDEX idx_incidents_created_at ON incidents (created_at DESC);

-- Report lookups
CREATE INDEX idx_reports_incident_id ON reports (incident_id);
CREATE INDEX idx_reports_reporter_id ON reports (reporter_id);
CREATE INDEX idx_reports_channel ON reports (channel);
CREATE INDEX idx_reports_submitted_at ON reports (submitted_at DESC);

-- Dispatch queue ordering (primary: severity, secondary: assigned_at)
CREATE INDEX idx_dispatches_incident_id ON dispatches (incident_id);
CREATE INDEX idx_dispatches_team_id ON dispatches (team_id);
CREATE INDEX idx_dispatches_status ON dispatches (status);

-- Team availability (matching algorithm hot path)
CREATE INDEX idx_teams_current_status ON teams (current_status);
CREATE INDEX idx_teams_agency_id ON teams (agency_id);
CREATE INDEX idx_teams_home_district ON teams (home_district);

-- Volunteer matching
CREATE INDEX idx_volunteer_profiles_availability ON volunteer_profiles (availability_status);

-- Rescue team membership
CREATE INDEX idx_rescue_team_members_team_id ON rescue_team_members (team_id);

-- Resources
CREATE INDEX idx_resources_team_id ON resources (team_id);
CREATE INDEX idx_resources_status ON resources (status);

-- Users by role (auth routing)
CREATE INDEX idx_users_role ON users (role);
CREATE INDEX idx_users_auth_provider_id ON users (auth_provider_id);

-- ============================================================
-- Composite index: dedup query filter (district + created_at + embedding)
-- Used by: Ingestion Service dedup.py — filters to same district + last 6 hours before
-- running pgvector cosine similarity scan (SCHEMA §4)
-- ============================================================

CREATE INDEX idx_incidents_dedup_filter
    ON incidents (district, created_at DESC)
    WHERE status NOT IN ('resolved', 'flagged_duplicate');
