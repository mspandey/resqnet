# PRD.md — ResQNet Product Requirements Document

**Status:** Draft v1 (post-Hackathon Round 1)
**Owner:** Amisha Pandey (Team Lead, AI/ML)
**Source:** Derived from ResQNet_Hackathon_Round1.pptx (15 slides)

---

## 1. Vision

Disaster response today loses lives to coordination failure, not effort failure. ResQNet is a single intelligence layer that connects citizens, volunteers, IoT sensors, rescue teams, and government authorities in real time — using AI to classify, prioritize, and route every incident the moment it's reported, instead of queuing it behind a phone line.

**One-line pitch:** AI-powered disaster intelligence for faster rescue.

## 2. Problem Statement

Disaster response coordination is fragmented and manual, which delays first response by critical minutes:

- **Manual, call-based reporting** queues incidents chronologically, not by severity
- **Fragmented multi-agency data** — police, NDRF, NGOs, and hospitals run disconnected systems
- **No real-time prioritization** — critical and low-urgency reports sit in the same queue
- **Connectivity breaks down on-site**, exactly when data matters most

Scale of the problem (2024 data cited in pitch): $368B in global disaster losses, 18,100+ lives lost worldwide, 3,200+ deaths from extreme weather in India, with extreme weather events hitting India on 93% of days that year.

Existing alternatives (manual helplines, state NDMA portals, social-media crowd reporting, standalone IoT dashboards) each fail differently — no AI severity ranking, no interoperability across states, no triage of unverified crowd reports, sensor data never fused with field reports.

## 3. Goals & Non-Goals

**Goals (Phase 1 / MVP):**
- Let citizens report emergencies via app, voice, or SMS with AI-assisted triage
- Give rescue teams an AI-prioritized dispatch queue instead of a FIFO ticket queue
- Give authorities a live command dashboard with a real-time incident heatmap
- Support degraded connectivity through offline-first capture and SMS/USSD fallback

**Non-Goals (explicitly out of scope for MVP):**
- Direct integration with NDMA/NDRF production systems (Phase 3 — see Growth Path)
- Drone hardware/flight operations (platform consumes drone *feeds*, doesn't operate drones)
- Insurance claims, compensation, or financial disbursement workflows
- Predictive disaster modeling beyond cascading-risk scoring from live + historical signals
- Full multi-agency identity federation (SSO across NDRF/SDRF/NGO systems) — MVP uses platform-native auth

## 4. Personas & User Stories

### 4.1 Citizen
*Reports emergencies, tracks rescue status.*

- As a citizen, I can report an emergency via app, voice call, or SMS so that I'm not blocked by app access or connectivity.
- As a citizen, I receive an AI-verified acknowledgement and safety tips immediately after reporting, so I know my report was received and what to do while waiting.
- As a citizen, I can track rescue status live on a map, so I know help is coming and roughly when.

### 4.2 Volunteer
*Views and accepts nearby verified incidents.*

- As a volunteer, I can view nearby verified incidents on a heatmap, so I can see where help is needed near me.
- As a volunteer, I can accept tasks matched to my skills and location, so I'm assigned work I'm actually able to help with.
- As a volunteer, I can update status and flag resource needs, so coordinators know what's happening on the ground.

### 4.3 Rescue Team
*Executes AI-prioritized dispatch.*

- As a rescue team member, I receive an AI-prioritized dispatch queue, so I act on the most critical case first, not the oldest ticket.
- As a rescue team member, I get optimized route guidance, so I reach the incident as fast as possible.
- As a rescue team member, I can log the outcome and close the case, so the system has an accurate record and frees me for the next dispatch.

### 4.4 Government Authority
*Monitors, allocates, and reviews policy impact.*

- As an authority, I can monitor a district/state command dashboard, so I have a real-time view of the disaster situation.
- As an authority, I can allocate resources and declare alerts, so I can act on what the dashboard shows me.
- As an authority, I can review analytics after the fact, so I can guide future policy and resourcing decisions.

## 5. Features (Prioritized)

### MVP (Weeks 1–6, per pitch roadmap)
| Feature | Description | Persona(s) |
|---|---|---|
| Citizen reporting app | Text-based incident reporting (app + web) | Citizen |
| AI classification engine v1 | LLM-based type + severity tagging | All (backend) |
| Basic dispatch dashboard | FIFO-improved queue view for rescue teams | Rescue Team |
| Incident status tracking | Citizen-facing live status view | Citizen |

### Phase 2 — AI Optimization (Weeks 7–12)
| Feature | Description | Persona(s) |
|---|---|---|
| Image damage detection | YOLOv8 on photos/drone feeds | Rescue Team, Authority |
| Voice-based reporting | Whisper transcription, multilingual | Citizen |
| Live disaster heatmap | Real-time geospatial incident density | Volunteer, Authority |
| Risk prediction module | Cascading risk forecast from live + historical data | Authority |
| Resource allocation engine | Nearest-team/supply matching | Rescue Team, Volunteer |

### Phase 3 — Government Integration (Weeks 13–20)
| Feature | Description | Persona(s) |
|---|---|---|
| NDMA/State API integration | Data exchange with state disaster authorities | Authority |
| Multi-agency command dashboard | Cross-agency (NDRF/SDRF/NGO) shared view | Authority |
| Pilot deployment & evaluation | Live pilot in one metro/district | All |

### Cross-cutting (spans all phases)
- Offline-first capture with background sync (citizen app)
- SMS/USSD fallback channel for blackout-hit zones
- Push notifications (Firebase) + SMS fallback (Twilio)
- Route optimization for rescue navigation

## 6. Success Metrics

Pitch deck cites these as **projected targets for Phase 1 pilot**, modeled on comparable AI-dispatch case studies — not yet validated:
- ~40% faster first response (report-to-dispatch gap)
- ~35% higher rescue efficiency (optimized routing/prioritization)
- ~50% better resource utilization (fewer idle/duplicate deployments)

**Recommended MVP-stage metrics** (since the above require a live pilot to measure):
- Median time from report submission to AI classification (target: <30s)
- Median time from classification to dispatch assignment (target: <2min)
- % of reports successfully classified without manual override
- % of voice reports successfully transcribed (by language)
- Offline-to-sync success rate (% of offline-captured reports that sync without loss)

## 7. Assumptions

- The 4-person team (1 confirmed — Amisha Pandey, AI/ML lead; 3 roles currently unfilled: Backend, Frontend, IoT & Systems) will be staffed before implementation begins. Until then, IMPLEMENTATIONPLAN.md and TRACKER.md assign work by **role**, not by name.
- No real NDMA/NDRF partnership or API access exists yet — Phase 3 integration is aspirational and will require a separate discovery/partnership track outside engineering control.
- AI models (YOLOv8, Whisper, LLM) will use pretrained/fine-tuned checkpoints, not be trained from scratch.
- "Offline-first" means the **citizen reporting app** caches reports locally and syncs when connectivity returns — it does not mean the backend, AI inference, or dashboards run offline. This distinction is made explicit because the original architecture (PostgreSQL, Redis, AI inference) is cloud-dependent and would otherwise contradict the offline-first claim.
- LLM choice for classification: **hosted, low-latency model** (e.g., a GPT-4o-mini-class or Llama-3-class model via a fast inference provider) is assumed for MVP, prioritizing cost and response-time over self-hosting. This is revisited in TECHSPEC.md.
- Volunteer "skill" data is self-reported at signup (e.g., medical, swimming, driving, first-aid) — no certification verification in MVP.
- Severity scoring is **AI-assisted, not AI-autonomous** — a human dispatcher can override the AI's severity tier in MVP, given the safety-critical nature of mis-triage.

## 8. Open Questions

- Who fills Backend, Frontend, and IoT/Systems roles, and by when?
- Does the team have any existing relationship with state SDMAs, NDRF, or relief NGOs to pursue for the Phase 3 pilot, or does this start from zero?
- What languages must voice reporting support at MVP — is there a target state/region for the pilot that defines this?
- Is there a budget ceiling for AI inference (LLM + YOLOv8 + Whisper) costs at MVP scale?
- Will the platform need to handle reports involving minors or other vulnerable-population data with special handling, given disaster contexts?

## 9. Out of Scope for This PRD

UI/visual design (→ DESIGN.md), data schema (→ SCHEMA.md), infrastructure/tech decisions (→ TECHSPEC.md), screen-level navigation (→ WEBFLOW.md), sprint breakdown (→ IMPLEMENTATIONPLAN.md, TRACKER.md), engineering conventions (→ RULES.md).
