# SCHEMA.md — ResQNet Data Model

**Status:** Draft v1
**Depends on:** TECHSPEC.md (PostgreSQL + PostGIS + pgvector, Redis), WEBFLOW.md (entity references via routes)

---

## 1. Core Entities (Overview)

```
User ──────┬── Citizen
           ├── Volunteer (has Skills)
           ├── RescueTeamMember (belongs to Team)
           └── Authority (belongs to Agency)

Incident ───── reported_by: User
          ├── Reports[] (1-to-many: an Incident can aggregate multiple raw Reports)
          ├── classification: Classification
          ├── dispatch: Dispatch
          └── location: PostGIS Point

Report ─────── raw input (text/voice/photo/sensor), pre-classification
Resource ───── Team or Supply available for dispatch
Team ───────── group of RescueTeamMembers + assigned Resources
Agency ─────── NDRF/SDRF/NGO/State Authority org record
```

## 2. Entity Definitions

### 2.1 `User`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| role | enum (`citizen`, `volunteer`, `rescue_team`, `authority`) | One role per account in MVP (WEBFLOW §4) |
| name | text | |
| phone | text | Required — primary contact, also SMS fallback channel (TECHSPEC §4) |
| email | text, nullable | |
| preferred_language | text | ISO 639-1 code; drives UI + voice-detection default (DESIGN §3.3) |
| location_last_known | geography(Point) | Nullable; used for proximity matching |
| created_at | timestamptz | |
| auth_provider_id | text | Maps to auth service identity |

### 2.2 `VolunteerProfile` (extends User where role = volunteer)
| Field | Type | Notes |
|---|---|---|
| user_id | UUID (FK → User) | |
| skills | text[] | Self-reported, uncertified in MVP (PRD §7) |
| availability_status | enum (`available`, `on_task`, `offline`) | |

### 2.3 `RescueTeamMember` (extends User where role = rescue_team)
| Field | Type | Notes |
|---|---|---|
| user_id | UUID (FK → User) | |
| team_id | UUID (FK → Team) | |

### 2.4 `Team`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| agency_id | UUID (FK → Agency) | |
| name | text | |
| home_district | text | |
| current_status | enum (`available`, `dispatched`, `off_duty`) | |

### 2.5 `Agency`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| name | text | e.g., "NDRF Battalion 4", "Red Cross Jaipur" |
| type | enum (`government`, `ngo`, `private`) | |
| contract_tier | text, nullable | Maps to PRD/business model (Govt SaaS / NGO partnership) |

### 2.6 `Report` (raw input, pre-fusion)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| incident_id | UUID (FK → Incident), nullable | Null until fused/assigned; see §4 dedup flow |
| reporter_id | UUID (FK → User), nullable | Nullable to support anonymous SMS reports |
| channel | enum (`app`, `voice`, `sms`, `iot_sensor`) | |
| raw_text | text, nullable | |
| raw_media_url | text, nullable | Pointer to object storage (audio/photo) |
| transcript | text, nullable | Populated by faster-whisper if voice |
| detected_language | text, nullable | |
| location | geography(Point) | |
| submitted_at | timestamptz | |
| sync_status | enum (`synced`, `queued_offline`) | Citizen-app offline tracking (TECHSPEC §4) |

### 2.7 `Incident`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| status | enum (see §3 lifecycle) | |
| severity_tier | enum (`critical`, `high`, `moderate`, `low`) | AI-proposed, human-overridable (TECHSPEC §3) |
| severity_score_raw | float | Underlying model score before tiering |
| severity_overridden_by | UUID (FK → User), nullable | Set if a dispatcher manually changed the tier |
| incident_type | text | e.g., "flood", "structural_collapse", "medical" |
| location | geography(Point) | |
| district | text | Denormalized for dashboard aggregation speed |
| description_embedding | vector(1536) | pgvector column; used for dedup (TECHSPEC §6) |
| created_at | timestamptz | |
| resolved_at | timestamptz, nullable | |

### 2.8 `Classification` (1-to-1 with Incident, output of AI pipeline)
| Field | Type | Notes |
|---|---|---|
| incident_id | UUID (FK → Incident) | |
| model_version | text | For auditability/change-control (RULES.md) |
| damage_tags | text[], nullable | YOLOv8 output, if image present |
| risk_forecast | jsonb, nullable | Risk Prediction Module output |
| classified_at | timestamptz | |

### 2.9 `Dispatch`
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| incident_id | UUID (FK → Incident) | |
| team_id | UUID (FK → Team), nullable | |
| status | enum (`queued`, `assigned`, `en_route`, `on_site`, `resolved`, `cancelled`) | |
| assigned_at | timestamptz, nullable | |
| resolved_at | timestamptz, nullable | |
| outcome_notes | text, nullable | Logged by rescue team on close (WEBFLOW §3.2) |

### 2.10 `Resource` (supplies, distinct from Teams)
| Field | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| team_id | UUID (FK → Team), nullable | |
| type | text | e.g., "ambulance", "boat", "medical_kit" |
| quantity | int | |
| status | enum (`available`, `allocated`, `depleted`) | |

## 3. Incident Lifecycle (State Machine)

```
 reported → classifying → classified → dispatched → en_route → on_site → resolved
                                  │
                                  └──→ flagged_duplicate (terminal, merged into existing Incident)
```

| State | Trigger to enter | Trigger to exit |
|---|---|---|
| `reported` | Report received, Incident created or matched to existing | AI pipeline picks up from queue |
| `classifying` | AI Orchestration Service begins processing | Classification + severity result written |
| `classified` | Classification complete | Dispatch & Resource Service assigns a Team |
| `dispatched` | Team assigned | Team marks en route |
| `en_route` | Team accepts/starts travel | Team arrives on site |
| `on_site` | Team logs arrival | Team logs outcome |
| `resolved` | Outcome logged, case closed | — (terminal) |
| `flagged_duplicate` | pgvector similarity match above threshold during `reported` | — (terminal; cross-referenced to the canonical Incident) |

This formalizes the lifecycle gap identified in the original PPT analysis — the deck only implied stages narratively ("report → classify → score → dispatch → action").

## 4. Deduplication Flow (Implements TECHSPEC §6)

1. New `Report` arrives → text/description embedded (1536-dim vector, matching the LLM provider's embedding model).
2. Query `Incident.description_embedding` via pgvector cosine similarity, filtered to incidents within the same `district` and last 6 hours.
3. If similarity > threshold (initial proposed value: 0.92 — to be tuned against real report data, not yet validated): new `Report` is attached to the existing `Incident` (incrementing a `report_count`), not created as a new one.
4. Else: new `Incident` created, status `reported`.

## 5. Geospatial Indexing Notes

- All `geography(Point)` columns indexed with PostGIS GiST indexes for proximity queries (volunteer matching, rescue dispatch distance sort).
- `district` is denormalized onto `Incident` directly (rather than computed via spatial join on every dashboard query) specifically to keep the Authority dashboard's aggregate queries (PRD §6 metrics, DESIGN §2.4) fast at scale — this is a deliberate read-optimization, revisit if write-side district lookup becomes a bottleneck.

## 6. Open Schema Questions

- Embedding dimensionality (1536) assumes an OpenAI-ada-class embedding model; must be revised if the chosen LLM provider (TECHSPEC §3) uses a different embedding size.
- Similarity threshold (0.92) is a placeholder — needs tuning once real report volume exists.
- No schema yet for IoT sensor metadata beyond treating sensor triggers as a `Report.channel = iot_sensor` — if sensor types diversify (water level, seismic, thermal), a dedicated `SensorReading` entity may be needed; deferred until sensor integration scope is defined (PRD §8 open question).
