# RULES.md — ResQNet Engineering & Governance Rules

**Status:** Draft v1
**Depends on:** All prior docs — this is the enforcement layer across PRD, TECHSPEC, SCHEMA, IMPLEMENTATIONPLAN, TRACKER

---

## 1. Coding Standards

- **Backend (Python/FastAPI):** PEP 8, type hints required on all function signatures, `ruff` for linting, `pytest` for tests. Minimum 70% coverage on Dispatch & Resource Service and AI Orchestration Service specifically — these are the safety-critical paths.
- **Backend (Node.js):** ESLint + Prettier, enforced via pre-commit hook. TypeScript preferred over plain JS for the Notification Service and Dispatch service given their event-driven complexity.
- **Frontend (Next.js/React):** ESLint + Prettier, component-level tests for any screen handling severity display or override actions (DESIGN §1, principle 3).
- **Frontend (Flutter):** standard Dart formatting (`dart format`), widget tests for the offline-sync queue UI specifically — this is the component most likely to silently fail in a way users won't notice (TECHSPEC §4 risk).
- **Naming convention:** entity names in code must match SCHEMA.md exactly (e.g., `Incident`, `Dispatch`, not ad hoc renamings) — prevents the doc-vs-code drift flagged in TRACKER.md §6.

## 2. Branching & PR Conventions

- **Branch naming:** `{role}/{ticket-id}-{short-description}` e.g., `backend/T-042-ingestion-service-skeleton`
- **Main branch is protected** — no direct commits; all changes via PR.
- **PR requirements:**
  - Linked TRACKER.md ticket ID in the PR description
  - Linked spec doc section per TRACKER.md §2 "Linked Doc" field
  - At least one reviewer approval before merge (even on a 4-person team — no self-merges)
  - CI must pass (lint + tests) before merge eligibility
- **Commit messages:** imperative mood, reference ticket ID — e.g., `Add pgvector dedup query (T-051)`

## 3. AI Model Versioning & Update Policy

Given the safety-critical nature of severity scoring (TECHSPEC §3), model changes are governed, not casual:

- Every classification run must log `model_version` (SCHEMA §2.8) — this is non-negotiable, enforced at the AI Orchestration Service level, not left to convention.
- **Changing the LLM provider, model version, or prompt template used for classification requires:**
  1. A side-by-side evaluation against a held-out set of historical reports (once enough exist) comparing old vs. new severity outputs
  2. Sign-off from the AI/ML lead before deployment to production
  3. A TRACKER.md ticket explicitly tagged `model-change` for auditability
- **YOLOv8 and faster-whisper model updates** follow the same logging requirement but may skip the side-by-side eval for minor version bumps (e.g., a bugfix release) — required only for changes that could plausibly shift damage-detection or transcription accuracy.
- **Severity-tier boundary changes** (the mapping from raw score → critical/high/moderate/low) are treated as a *policy* change, not a code change — requires the same sign-off as a model change, since it directly changes dispatch prioritization in the field.

## 4. Data Handling & Privacy Rules

This system handles **location and personal data of disaster victims**, including potentially minors and other vulnerable populations (PRD §8 open question) — treated with corresponding seriousness regardless of final legal/compliance research, which is explicitly **not yet done** and flagged as a pre-pilot blocker:

- **No public exposure of citizen PII.** Volunteer and Authority dashboards show incident location and severity; they do **not** show a citizen's name, phone number, or other PII unless that specific role has a legitimate operational need (e.g., a rescue team needs a callback number once dispatched — visible only at that stage, to that role).
- **Voice and photo media** are stored in access-controlled object storage, never made public-URL-accessible — signed URLs with short expiry only.
- **Anonymous SMS reports** (SCHEMA §2.6, `reporter_id` nullable) are explicitly supported precisely so reporting is not blocked by privacy concerns at the point of crisis — but anonymity must be preserved end-to-end (no inference back to a phone number exposed in any dashboard).
- **Data retention:** incident records retained for a to-be-defined period for analytics (PRD §4.4 policy review use case) — exact retention period is an **open compliance question**, pending legal review before pilot. Default to the shortest retention that still supports the analytics use case until that review happens, not the longest.
- **Minors:** if a report involves a minor (self-reported or inferable), apply the same data-minimization rules as adult citizens at minimum, with no additional data collection beyond what's operationally necessary for rescue — this is a placeholder pending actual legal guidance specific to child-safety data handling in disaster-response contexts, not a substitute for it.
- **Government data-sharing (Phase 3):** any data shared with NDMA/NDRF/state systems must go through the integration adapter layer (IMPLEMENTATIONPLAN Sprint 8), not ad hoc exports — keeps a single auditable point of external data flow.

## 5. Severity-Scoring Change Control (Cross-Reference)

This duplicates §3 deliberately because it's the single highest-stakes rule in this document: **no change to how severity is computed reaches production without sign-off and an audit trail.** A misconfigured severity model doesn't just produce a bad UX — it can mean a rescue team is dispatched to the wrong incident first. Treat this rule as load-bearing, not bureaucratic overhead.

## 6. Internationalization Process Rule

Per DESIGN.md §3.3: all UI strings must be externalized (i18n keys, not hardcoded text) from the first commit of any UI component — not retrofitted later. This is enforced via PR review checklist (§2), not tooling, in MVP; consider an automated lint rule (e.g., flagging hardcoded JSX string literals) once the team has bandwidth.

## 7. Incident Response (for the Platform Itself)

Separate from disaster incidents the platform manages — this is about outages of ResQNet itself:
- Any production outage affecting report intake or dispatch is a **P0** — all hands, regardless of sprint commitments, since the platform's entire value proposition is availability during real disasters.
- Post-incident writeup required for any P0, added to TRACKER.md's risk log (TRACKER §5) if it reveals a systemic gap, not just a one-off bug.

## 8. Documentation Maintenance Rule

Every doc in this set (PRD, TECHSPEC, DESIGN, WEBFLOW, SCHEMA, IMPLEMENTATIONPLAN, TRACKER, RULES) is a living document. When an implementation decision diverges from what's written here, **update the doc in the same PR**, not in a follow-up "docs cleanup" pass that tends to never happen. This rule exists because TRACKER.md §6's Definition of Done already requires it — this section just states the principle plainly once, in one place.
