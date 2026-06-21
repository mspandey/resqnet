-- 004_auth_and_admin.sql
-- Add auth support and admin / management tables to satisfy the expanded ResQNet route and portal requirements.
-- Depends on: 001_extensions.sql, 002_core_schema.sql, 003_indexes.sql

-- Add password support for existing users.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Extend user roles with admin.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typname = 'user_role' AND e.enumlabel = 'admin'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'admin';
    END IF;
END$$;

-- Add authority and admin extension tables.
CREATE TABLE IF NOT EXISTS authorities (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    department TEXT,
    managed_districts TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS admins (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sos_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
    location geography(Point, 4326) NOT NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending'
);

CREATE TABLE IF NOT EXISTS assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,
    volunteer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status dispatch_status NOT NULL DEFAULT 'assigned'
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    object_type TEXT NOT NULL,
    object_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional indexes for new tables.
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_incident_id ON notifications (incident_id);
CREATE INDEX IF NOT EXISTS idx_sos_requests_user_id ON sos_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_sos_requests_incident_id ON sos_requests (incident_id);
CREATE INDEX IF NOT EXISTS idx_assignments_volunteer_id ON assignments (volunteer_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
