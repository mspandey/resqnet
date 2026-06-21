-- 001_extensions.sql
-- Enable PostGIS for geography(Point) columns and geospatial indexing
-- Enable pgvector for incident embedding-based deduplication (TECHSPEC §6, SCHEMA §2.7)
-- Run this before any other migration.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Confirm versions for audit log
DO $$
BEGIN
    RAISE NOTICE 'PostGIS version: %', PostGIS_Version();
END $$;
