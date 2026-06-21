-- dev_seed.sql
-- Representative seed data for local development
-- Provides: 2 agencies, 3 teams, 5 users (one per role + extras), 10 incidents across severity tiers
-- Run AFTER all migrations.

-- ============================================================
-- AGENCIES
-- ============================================================

INSERT INTO agencies (id, name, type, contract_tier) VALUES
    ('aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', 'NDRF Battalion 4 Delhi', 'government', 'govt_standard'),
    ('aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', 'Red Cross Jaipur Chapter', 'ngo', 'ngo_partner');

-- ============================================================
-- TEAMS
-- ============================================================

INSERT INTO teams (id, agency_id, name, home_district, current_status) VALUES
    ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', 'Alpha Squad', 'Central Delhi', 'available'),
    ('bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb', 'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', 'Bravo Squad', 'South Delhi', 'available'),
    ('bbbbbbbb-0003-0003-0003-bbbbbbbbbbbb', 'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', 'Red Cross Team A', 'Jaipur North', 'off_duty');

-- ============================================================
-- USERS (one per role + two extras for realism)
-- All seeded local users use password: dev_password_123
-- auth_provider_id = 'dev-{n}' for local JWT bypass
-- ============================================================

INSERT INTO users (id, role, name, phone, email, preferred_language, location_last_known, auth_provider_id, password_hash) VALUES
    -- Citizen
    ('cccccccc-0001-0001-0001-cccccccccccc', 'citizen', 'Priya Sharma', '+919876543210', 'priya@example.com', 'hi',
     ST_GeogFromText('POINT(77.2090 28.6139)'), 'dev-1', '$2b$12$9wnMJnxumjAWhTjgWRgfrOyTBIcIxA91tZlhCUWXftcOMd6DtoJ/e'),
    -- Volunteer
    ('cccccccc-0002-0002-0002-cccccccccccc', 'volunteer', 'Rahul Verma', '+919876543211', 'rahul@example.com', 'en',
     ST_GeogFromText('POINT(77.2060 28.6100)'), 'dev-2', '$2b$12$9wnMJnxumjAWhTjgWRgfrOyTBIcIxA91tZlhCUWXftcOMd6DtoJ/e'),
    -- Rescue Team Member
    ('cccccccc-0003-0003-0003-cccccccccccc', 'rescue_team', 'Sgt. Anjali Kumar', '+919876543212', 'anjali@ndrf.gov.in', 'en',
     ST_GeogFromText('POINT(77.2200 28.6200)'), 'dev-3', '$2b$12$9wnMJnxumjAWhTjgWRgfrOyTBIcIxA91tZlhCUWXftcOMd6DtoJ/e'),
    -- Authority
    ('cccccccc-0004-0004-0004-cccccccccccc', 'authority', 'Collector Mehta', '+911800001234', 'collector@delhi.gov.in', 'en',
     ST_GeogFromText('POINT(77.2100 28.6300)'), 'dev-4', '$2b$12$9wnMJnxumjAWhTjgWRgfrOyTBIcIxA91tZlhCUWXftcOMd6DtoJ/e'),
    -- Second citizen for duplicate-report testing
    ('cccccccc-0005-0005-0005-cccccccccccc', 'citizen', 'Ravi Patel', '+919876543213', NULL, 'gu',
     ST_GeogFromText('POINT(77.2085 28.6130)'), 'dev-5', '$2b$12$9wnMJnxumjAWhTjgWRgfrOyTBIcIxA91tZlhCUWXftcOMd6DtoJ/e'),
    -- Admin
    ('cccccccc-0006-0006-0006-cccccccccccc', 'admin', 'Platform Admin', '+911800001215', 'admin@resqnet.dev', 'en',
     ST_GeogFromText('POINT(77.2100 28.6100)'), 'dev-admin', '$2b$12$9wnMJnxumjAWhTjgWRgfrOyTBIcIxA91tZlhCUWXftcOMd6DtoJ/e');

-- ============================================================
-- VOLUNTEER PROFILES
-- ============================================================

INSERT INTO volunteer_profiles (user_id, skills, availability_status) VALUES
    ('cccccccc-0002-0002-0002-cccccccccccc', ARRAY['first_aid', 'swimming', 'driving'], 'available');

-- ============================================================
-- RESCUE TEAM MEMBERS
-- ============================================================

INSERT INTO rescue_team_members (user_id, team_id) VALUES
    ('cccccccc-0003-0003-0003-cccccccccccc', 'bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb');

-- ============================================================
-- INCIDENTS (10 across all severity tiers and statuses)
-- Embeddings set to NULL in seed (populated by AI Orchestration at runtime)
-- ============================================================

INSERT INTO incidents (id, status, severity_tier, severity_score_raw, incident_type, location, district, created_at) VALUES
    -- Critical
    ('dddddddd-0001-0001-0001-dddddddddddd', 'dispatched',  'critical', 0.95, 'structural_collapse',
     ST_GeogFromText('POINT(77.2090 28.6139)'), 'Central Delhi', NOW() - INTERVAL '30 minutes'),
    ('dddddddd-0002-0002-0002-dddddddddddd', 'classified',  'critical', 0.91, 'flood',
     ST_GeogFromText('POINT(77.1800 28.6500)'), 'North Delhi',   NOW() - INTERVAL '10 minutes'),
    -- High
    ('dddddddd-0003-0003-0003-dddddddddddd', 'classified',  'high',     0.74, 'fire',
     ST_GeogFromText('POINT(77.2300 28.5900)'), 'South Delhi',   NOW() - INTERVAL '15 minutes'),
    ('dddddddd-0004-0004-0004-dddddddddddd', 'en_route',    'high',     0.70, 'medical',
     ST_GeogFromText('POINT(77.2400 28.6000)'), 'South Delhi',   NOW() - INTERVAL '45 minutes'),
    -- Moderate
    ('dddddddd-0005-0005-0005-dddddddddddd', 'reported',    'moderate', 0.51, 'road_accident',
     ST_GeogFromText('POINT(77.2500 28.6100)'), 'East Delhi',    NOW() - INTERVAL '5 minutes'),
    ('dddddddd-0006-0006-0006-dddddddddddd', 'classifying', NULL,       NULL, NULL,
     ST_GeogFromText('POINT(77.2600 28.6200)'), 'East Delhi',    NOW() - INTERVAL '2 minutes'),
    -- Low / Informational
    ('dddddddd-0007-0007-0007-dddddddddddd', 'classified',  'low',      0.22, 'infrastructure_damage',
     ST_GeogFromText('POINT(77.2700 28.6300)'), 'West Delhi',    NOW() - INTERVAL '60 minutes'),
    -- On site
    ('dddddddd-0008-0008-0008-dddddddddddd', 'on_site',     'critical', 0.93, 'chemical_hazard',
     ST_GeogFromText('POINT(77.2150 28.6400)'), 'Central Delhi', NOW() - INTERVAL '90 minutes'),
    -- Resolved
    ('dddddddd-0009-0009-0009-dddddddddddd', 'resolved',    'high',     0.68, 'fire',
     ST_GeogFromText('POINT(77.1900 28.6000)'), 'North Delhi',   NOW() - INTERVAL '4 hours'),
    -- Flagged duplicate
    ('dddddddd-0010-0010-0010-dddddddddddd', 'flagged_duplicate', 'moderate', 0.50, 'road_accident',
     ST_GeogFromText('POINT(77.2505 28.6095)'), 'East Delhi',    NOW() - INTERVAL '4 minutes');

-- ============================================================
-- REPORTS (link to incidents above)
-- ============================================================

INSERT INTO reports (incident_id, reporter_id, channel, raw_text, location, submitted_at, sync_status) VALUES
    ('dddddddd-0001-0001-0001-dddddddddddd', 'cccccccc-0001-0001-0001-cccccccccccc', 'app',
     'Building collapsed near Connaught Place, people trapped under rubble, need immediate help',
     ST_GeogFromText('POINT(77.2090 28.6139)'), NOW() - INTERVAL '30 minutes', 'synced'),

    ('dddddddd-0002-0002-0002-dddddddddddd', 'cccccccc-0005-0005-0005-cccccccccccc', 'sms',
     'Flash flood in Yamuna bank area, water level rising fast, families stranded',
     ST_GeogFromText('POINT(77.1800 28.6500)'), NOW() - INTERVAL '10 minutes', 'synced'),

    -- Anonymous SMS report (reporter_id NULL per SCHEMA §2.6, RULES.md §4)
    ('dddddddd-0003-0003-0003-dddddddddddd', NULL, 'sms',
     'Fire at residential building, 3 floors, smoke visible',
     ST_GeogFromText('POINT(77.2300 28.5900)'), NOW() - INTERVAL '15 minutes', 'synced'),

    -- Duplicate report attached to existing incident (not its own incident)
    ('dddddddd-0001-0001-0001-dddddddddddd', 'cccccccc-0002-0002-0002-cccccccccccc', 'app',
     'Connaught Place building collapse, I can see people stuck on 2nd floor',
     ST_GeogFromText('POINT(77.2092 28.6140)'), NOW() - INTERVAL '28 minutes', 'synced');

-- ============================================================
-- CLASSIFICATIONS (for already-classified incidents)
-- model_version logged per RULES.md §3 (non-negotiable)
-- ============================================================

INSERT INTO classifications (incident_id, model_version, damage_tags, classified_at) VALUES
    ('dddddddd-0001-0001-0001-dddddddddddd', 'gpt-4o-mini:2024-07-18:resqnet-v1.0', ARRAY['structural_damage', 'entrapment'], NOW() - INTERVAL '27 minutes'),
    ('dddddddd-0002-0002-0002-dddddddddddd', 'gpt-4o-mini:2024-07-18:resqnet-v1.0', NULL, NOW() - INTERVAL '7 minutes'),
    ('dddddddd-0003-0003-0003-dddddddddddd', 'gpt-4o-mini:2024-07-18:resqnet-v1.0', ARRAY['fire', 'smoke'], NOW() - INTERVAL '12 minutes'),
    ('dddddddd-0004-0004-0004-dddddddddddd', 'gpt-4o-mini:2024-07-18:resqnet-v1.0', NULL, NOW() - INTERVAL '42 minutes'),
    ('dddddddd-0007-0007-0007-dddddddddddd', 'gpt-4o-mini:2024-07-18:resqnet-v1.0', NULL, NOW() - INTERVAL '57 minutes'),
    ('dddddddd-0008-0008-0008-dddddddddddd', 'gpt-4o-mini:2024-07-18:resqnet-v1.0', ARRAY['chemical', 'hazmat'], NOW() - INTERVAL '87 minutes'),
    ('dddddddd-0009-0009-0009-dddddddddddd', 'gpt-4o-mini:2024-07-18:resqnet-v1.0', ARRAY['fire', 'smoke'], NOW() - INTERVAL '4 hours' + INTERVAL '3 minutes'),
    ('dddddddd-0010-0010-0010-dddddddddddd', 'gpt-4o-mini:2024-07-18:resqnet-v1.0', NULL, NOW() - INTERVAL '3 minutes' + INTERVAL '30 seconds');

-- ============================================================
-- DISPATCHES
-- ============================================================

INSERT INTO dispatches (incident_id, team_id, status, assigned_at, resolved_at, outcome_notes) VALUES
    ('dddddddd-0001-0001-0001-dddddddddddd', 'bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'assigned',
     NOW() - INTERVAL '25 minutes', NULL, NULL),

    ('dddddddd-0004-0004-0004-dddddddddddd', 'bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb', 'en_route',
     NOW() - INTERVAL '40 minutes', NULL, NULL),

    ('dddddddd-0008-0008-0008-dddddddddddd', 'bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'on_site',
     NOW() - INTERVAL '85 minutes', NULL, NULL),

    ('dddddddd-0009-0009-0009-dddddddddddd', 'bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb', 'resolved',
     NOW() - INTERVAL '3 hours' - INTERVAL '45 minutes', NOW() - INTERVAL '3 hours',
     'Fire contained. 4 residents evacuated, 1 minor injury treated on site. Building secured.');

-- ============================================================
-- RESOURCES
-- ============================================================

INSERT INTO resources (team_id, type, quantity, status) VALUES
    ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'ambulance', 2, 'available'),
    ('bbbbbbbb-0001-0001-0001-bbbbbbbbbbbb', 'hydraulic_rescue_tool', 1, 'allocated'),
    ('bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb', 'ambulance', 1, 'allocated'),
    ('bbbbbbbb-0002-0002-0002-bbbbbbbbbbbb', 'boat', 1, 'available'),
    ('bbbbbbbb-0003-0003-0003-bbbbbbbbbbbb', 'medical_kit', 10, 'available'),
    ('bbbbbbbb-0003-0003-0003-bbbbbbbbbbbb', 'first_aid_pack', 25, 'available');
