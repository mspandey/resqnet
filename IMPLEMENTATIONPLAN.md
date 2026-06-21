# IMPLEMENTATIONPLAN.md — ResQNet Build Plan

**Status:** Draft v1
**Depends on:** PRD.md (feature priority), TECHSPEC.md (stack/services), SCHEMA.md (data model)
**Base roadmap:** Slide 13 of ResQNet_Hackathon_Round1.pptx (MVP Weeks 1–6, AI Optimization Weeks 7–12, Govt. Integration Weeks 13–20)

---

## Assumptions for This Plan

- Team is 4 people by role: **AI/ML Lead** (confirmed: Amisha Pandey), **Backend Engineer**, **Frontend Engineer**, **IoT & Systems Engineer** (3 unfilled — PRD §7). Tasks below are assigned by role; reassign to names once hiring/team-forming completes.
- 2-week sprints, 10 sprints total across 20 weeks, matching the deck's phase boundary weeks exactly (Phase 1 ends Sprint 3, Phase 2 ends Sprint 6, Phase 3 ends Sprint 10).
- Each sprint assumes all 4 roles are active; if roles remain unfilled past Sprint 1, this plan's Backend/Frontend/IoT-tagged tasks will slip proportionally — flag this risk explicitly rather than silently re-padding the timeline.

---

## Phase 1 — MVP (Weeks 1–6 / Sprints 1–3)

### Sprint 1 (Weeks 1–2): Foundations
- [Backend] Stand up API Gateway + Ingestion Service skeleton (FastAPI), deploy to staging
- [Backend] Implement `User`, `Report`, `Incident` tables per SCHEMA.md §2; run initial PostGIS migration
- [Frontend] Scaffold Next.js web app shell with role-based routing per WEBFLOW.md §3–4
- [Frontend] Scaffold Flutter citizen app shell with local SQLite storage wired (no sync yet)
- [AI/ML] Select and integration-test hosted LLM provider for classification (TECHSPEC §3); benchmark latency against <30s target
- [IoT] Define sensor ingestion contract (payload shape) even though no real sensors are connected yet — unblocks later `Report.channel = iot_sensor` work

### Sprint 2 (Weeks 3–4): Core Reporting Loop
- [Backend] Implement Ingestion Service: text report intake → `Report` row → enqueue for classification
- [Backend] Implement AI Orchestration Service v1: LLM classification only (no YOLOv8/Whisper yet) → writes `Classification` + sets `Incident.severity_tier`
- [Frontend] Citizen app: Report Composer (text mode only) + submit flow (WEBFLOW §2)
- [Frontend] Web: basic Rescue Team dispatch queue view (FIFO-improved, sorted by `severity_tier`) per PRD MVP scope
- [AI/ML] Implement severity-tier mapping (raw score → `critical`/`high`/`moderate`/`low`) with manual-override field wired end-to-end (TECHSPEC §3 guardrail)

### Sprint 3 (Weeks 5–6): MVP Hardening + Demo-Readiness
- [Backend] Implement citizen-facing live status tracker endpoint (Incident lifecycle states, SCHEMA §3)
- [Frontend] Citizen app: Status Tracker screen (stepper UI, DESIGN §2.1)
- [Frontend] Web: wire dispatch queue to real-time updates via Socket.IO (TECHSPEC §5) — fallback polling included
- [AI/ML] Add manual-override UI hook + audit field (`severity_overridden_by`)
- [All] **Phase 1 Milestone Demo:** citizen submits text report → AI classifies → appears in rescue dispatch queue → dispatcher can override severity → citizen sees status update live

---

## Phase 2 — AI Optimization (Weeks 7–12 / Sprints 4–6)

### Sprint 4 (Weeks 7–8): Multi-Modal Input
- [AI/ML] Integrate YOLOv8 for photo damage detection; wire into AI Orchestration Service
- [AI/ML] Integrate faster-whisper for voice transcription (TECHSPEC §1 deviation from base Whisper)
- [Frontend] Citizen app: add Voice and Photo report modes to Report Composer (DESIGN §2.1)
- [Backend] Extend `Report` schema usage for `raw_media_url`, `transcript`, `detected_language`

### Sprint 5 (Weeks 9–10): Heatmap + Resource Matching
- [Backend] Implement Dispatch & Resource Service: nearest-team matching algorithm (PostGIS distance queries)
- [Frontend] Web: Volunteer heatmap view with severity-color pins (DESIGN §2.2, §3.1)
- [Frontend] Web: Authority command dashboard v1 — district aggregate counts (DESIGN §2.4)
- [Backend] Implement pgvector duplicate-detection flow (SCHEMA §4) — initial similarity threshold 0.92, flagged for tuning

### Sprint 6 (Weeks 11–12): Risk Prediction + Offline Sync
- [AI/ML] Build/integrate Risk Prediction Module v1 (cascading risk from live + historical signals)
- [Frontend] Citizen app: implement background sync service for offline-queued reports (TECHSPEC §4)
- [Frontend] Web: connectivity-state indicators across citizen + rescue surfaces (DESIGN §3.2)
- [IoT] Connect first real sensor type (whichever is available/cheapest to pilot — e.g., a basic water-level sensor) as a proof of concept for the `iot_sensor` channel
- [All] **Phase 2 Milestone Demo:** full multi-modal pipeline (text/voice/photo) → damage detection + risk forecast → volunteer heatmap → offline citizen report syncs successfully after reconnection

---

## Phase 3 — Government Integration (Weeks 13–20 / Sprints 7–10)

> **Caveat carried from PRD §7/§8:** this phase assumes a real NDMA/state/NDRF partnership exists or is actively being pursued. If no such partnership exists by Sprint 6, Sprints 7–10 should be **re-scoped toward a single-pilot-partner integration** (e.g., one NGO or one district control room) rather than blocking on a national-level API that may not materialize in this timeframe. This is a non-technical, partnership-dependent risk, not an engineering one.

### Sprint 7 (Weeks 13–14): SMS Fallback + Integration Discovery
- [Backend] Implement Twilio SMS reporting channel (text-only classification path, TECHSPEC §4)
- [Backend] Implement SMS-based status notifications (Notification Service)
- [Non-engineering] Confirm pilot partner (state SDMA, NDRF unit, or NGO) and obtain any available API documentation — **this gates the rest of Phase 3**

### Sprint 8 (Weeks 15–16): Multi-Agency Dashboard
- [Backend] Implement `Agency`/`Team` association and agency-scoped data views
- [Frontend] Web: multi-agency command dashboard — cross-agency visibility for Authority role (PRD Phase 3 feature)
- [Backend] Build integration adapter layer for whatever partner API format is confirmed in Sprint 7 (shape unknown until partner confirmed — treat as a pluggable adapter, not a hard-coded integration)

### Sprint 9 (Weeks 17–18): Pilot Hardening
- [All] Load-test the system at expected pilot-district volume
- [Backend] Add audit logging for severity overrides and dispatch decisions (supports RULES.md governance requirements)
- [Frontend] Web: Authority analytics view (PRD §4.4, post-incident policy review)
- [AI/ML] Tune pgvector dedup threshold and severity-tier boundaries using accumulated real report data from Phases 1–2

### Sprint 10 (Weeks 19–20): Pilot Deployment & Evaluation
- [All] Deploy to pilot district/control room environment
- [All] Run pilot for remainder of sprint; collect metrics against PRD §6 targets (~40%/~35%/~50% projected improvements)
- [All] Retrospective + writeup of actual vs. projected outcomes; feed learnings into RULES.md and a Phase 4 backlog (national scale-out, per Slide 12's Growth Path)

---

## Cross-Phase Tracking Note

Each sprint's tasks should be entered into TRACKER.md as individual tickets at sprint start, tagged by phase, role, and the feature area from PRD.md §5 — this plan is the source roadmap; TRACKER.md is the live execution surface.
