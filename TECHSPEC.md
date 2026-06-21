# TECHSPEC.md — ResQNet Technical Specification

**Status:** Draft v1
**Depends on:** PRD.md
**Source:** Extends Slides 6, 7, 8 of ResQNet_Hackathon_Round1.pptx with implementation-level decisions

---

## 1. Finalized Tech Stack

| Layer | Technology | Version (target) | Purpose |
|---|---|---|---|
| Web frontend | Next.js + React | Next.js 14+ | Volunteer & authority dashboards, command views |
| Mobile/citizen app | Flutter | Flutter 3.x | Cross-platform citizen app with offline-first storage |
| Styling | Tailwind CSS | 3.x | Consistent design system across web surfaces |
| API gateway | FastAPI | 0.110+ | Single entry point, request routing, auth middleware |
| Backend services (AI-adjacent) | FastAPI (Python) | 0.110+ | Classification orchestration, model inference calls |
| Backend services (real-time/notifications) | Node.js + Express | Node 20 LTS | WebSocket server, notification dispatch, Twilio/Firebase integration |
| Realtime transport | Socket.IO (over WebSocket) | 4.x | Live dispatch queue updates, heatmap pushes |
| AI — image | YOLOv8 (Ultralytics) | latest stable | Structural/terrain damage detection from photos & drone feeds |
| AI — speech | faster-whisper | latest stable | Multilingual voice-report transcription (chosen over base Whisper for inference latency) |
| AI — classification | Hosted LLM (see §3) | — | Incident type + severity tagging, report summarization |
| AI — risk prediction | Custom model (PyTorch) | — | Cascading risk forecast from live signals + historical disaster data |
| Primary database | PostgreSQL + PostGIS | PG 16 | Source of truth: incidents, users, resources, geospatial queries |
| Cache / queue | Redis | 7.x | Session cache, pub/sub for live updates, dispatch queue |
| Vector store | pgvector (Postgres extension) | — | Embedding-based duplicate-report detection (see §6) |
| Maps | Mapbox GL JS | latest | Live heatmap, route guidance (chosen over Leaflet for offline tile caching support — see §4) |
| Push notifications | Firebase Cloud Messaging | — | App push alerts |
| SMS/USSD fallback | Twilio | — | SMS reporting & alert fallback in low-connectivity zones |
| Containerization | Docker | — | Service packaging |
| Orchestration | Kubernetes | — | Production scaling (Phase 2+; not required for MVP) |
| Cloud provider | AWS (assumed; GCP as fallback) | — | See §7 for assumption rationale |
| CI/CD | GitHub Actions | — | Build, test, deploy pipelines |

**Deviation from pitch deck:** the deck lists plain Whisper; this spec substitutes **faster-whisper** (a CTranslate2 reimplementation) for materially lower transcription latency on the same model weights — no behavior change, pure performance assumption.

## 2. Service Boundaries

Five services, communicating over REST internally and Socket.IO for live push:

1. **API Gateway** (FastAPI) — auth, rate limiting, request routing to downstream services. Single public entry point.
2. **Ingestion Service** (FastAPI) — accepts citizen/volunteer/IoT reports (text, voice, image, sensor payloads); normalizes into a common `IncidentEvent` shape (see SCHEMA.md); pushes raw media to object storage and a processing queue.
3. **AI Orchestration Service** (FastAPI + PyTorch/Ultralytics) — consumes the processing queue; runs YOLOv8 / faster-whisper / LLM classification / risk model in sequence or parallel as applicable; writes structured results back to the Ingestion Service.
4. **Dispatch & Resource Service** (Node.js) — owns the Resource Allocation Engine (matching algorithm), maintains the live-priority dispatch queue in Redis, emits Socket.IO events to rescue-team and dashboard clients.
5. **Notification Service** (Node.js) — Firebase push + Twilio SMS/USSD; triggered by Dispatch & Resource Service events (new dispatch, status change, alert declaration).

## 3. AI Classification: Model Choice & Rationale

**Decision:** Use a **hosted LLM via a low-latency inference provider** (e.g., a Llama-3-class open-weight model served via Groq/Together, or a GPT-4o-mini-class model) rather than self-hosting in MVP.

**Rationale:**
- Self-hosting requires GPU infrastructure the team doesn't yet have provisioned; hosted inference removes that blocker for MVP timelines (Weeks 1–6).
- Disaster classification is bursty (spikes during actual events) — pay-per-token hosted inference avoids paying for idle GPU capacity.
- Re-evaluate self-hosting at Phase 3 (government integration) if data-residency requirements from NDMA/state authorities mandate on-premise or in-country inference.

**Severity scoring is AI-assisted, not autonomous** (per PRD §7): the LLM proposes a severity tier; a human dispatcher can override before final dispatch in MVP. This is a deliberate guardrail against AI misclassification in a safety-critical workflow — not a feature reduction.

## 4. Offline-First Resolution

**The conflict:** the original architecture (PostgreSQL, Redis, multi-model AI inference) is inherently cloud-dependent, but the pitch claims "offline-first" support. This spec resolves it as follows:

- **Offline-first applies to the citizen app only**, not the backend or AI layer. The Flutter app uses local on-device storage (SQLite via `sqflite` or Hive) to capture a report — text, photo, or recorded voice memo — when connectivity is unavailable.
- A **background sync service** in the app retries upload on a connectivity-change listener; once synced, the report enters the normal AI pipeline server-side. There is no offline AI inference on-device in MVP.
- **SMS/USSD is the true degraded-mode channel**, not "offline app usage." When data connectivity is absent entirely (not just app-server connectivity), Twilio-routed SMS becomes the reporting path. SMS reports skip image/voice AI processing (text-only) and go through a lighter-weight classification path (keyword + LLM-on-text-only).
- **Mapbox** was chosen over Leaflet specifically because Mapbox supports offline tile caching for the rescue-team app, so route guidance remains available without a live connection once a tile package is pre-downloaded for a region.

This means "offline-first" is implemented as **capture-now-sync-later + SMS fallback**, not true offline AI processing — this should be stated plainly to stakeholders and judges to avoid overclaiming.

## 5. Real-Time Communication Design

- Dispatch queue updates, heatmap density changes, and status updates are pushed via **Socket.IO** rooms scoped by role and geography (e.g., a rescue team subscribes to its district's dispatch room).
- Fallback: clients poll a REST endpoint every 15s if the WebSocket connection drops, to avoid silent staleness during connectivity hiccups.
- Redis pub/sub is the backplane between the Dispatch & Resource Service and any horizontally scaled Socket.IO instances (needed once Kubernetes scaling is introduced in Phase 2+).

## 6. Vector Store Usage (Clarifying an Architecture Gap)

The original deck lists "vector store for embeddings" with no stated purpose. This spec defines its use: **duplicate/near-duplicate incident report detection.** When a new report arrives, its text/description embedding is compared via `pgvector` cosine similarity against recent open incidents in the same geographic cell; high-similarity matches are flagged as likely duplicates and merged or cross-referenced rather than dispatched twice. This directly addresses the "no duplicate/spam handling" gap identified in the original PPT analysis.

## 7. Cloud Provider Decision

**Decision: AWS**, with GCP noted as an acceptable alternative if the team has existing credits (common in hackathon/student contexts — e.g., AWS Activate or GCP for Students).

**Rationale:** AWS has the most mature managed-Kubernetes (EKS) and managed-Postgres (RDS, with PostGIS support) combination for this stack, plus broad availability of student/startup credit programs. This is an assumption, not a confirmed decision — revisit if the team already holds GCP credits.

## 8. Third-Party Dependency Fallback Behavior

| Dependency | Failure mode handling |
|---|---|
| LLM provider (classification) | Circuit-breaker to a secondary provider; if both fail, route to manual triage queue rather than blocking report intake |
| Mapbox | Falls back to Leaflet + OpenStreetMap tiles if Mapbox quota/outage occurs (both share a similar JS API surface, easing fallback) |
| Twilio | SMS failures logged and retried with exponential backoff; critical alerts also attempt Firebase push as a secondary channel |
| Firebase | If push fails, fall back to SMS for time-sensitive alerts (inverse of above — the two channels back each other up) |

## 9. Non-Functional Requirements

- **Latency target:** report → AI classification result in <30 seconds (per PRD success metrics)
- **Availability target:** 99.5% for MVP (not 99.9%+ — government-grade SLAs are a Phase 3 concern after pilot validation)
- **Data retention:** incident data retained per policy defined in RULES.md (sensitive location/personal data handling)
- **Scalability:** MVP sized for single-city pilot load; Kubernetes horizontal scaling deferred until Phase 2 traffic patterns are known
