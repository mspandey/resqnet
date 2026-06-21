# TRACKER.md — ResQNet Execution Tracker

**Status:** Draft v1 (structure only — not a live board)
**Depends on:** IMPLEMENTATIONPLAN.md (sprint/task source), PRD.md (role definitions)

---

## 1. Purpose

This document defines *how* work gets tracked, not the live state of tasks. The actual board should live in a tool (GitHub Projects, Linear, Jira, or Trello — pick one early and don't fragment across two). This file is the schema for that board, kept in-repo so the tracking convention survives tool changes.

## 2. Board Structure

### Columns (status)
```
Backlog → Sprint Ready → In Progress → In Review → Blocked → Done
```
- **Blocked** is a distinct column, not a tag — a blocked task should be visually impossible to miss in standup, especially during Phase 3 where partnership delays are a known risk (IMPLEMENTATIONPLAN.md Sprint 7 caveat).

### Required Fields per Ticket
| Field | Values | Notes |
|---|---|---|
| Title | free text | Action-oriented, e.g., "Implement pgvector dedup query," not "Dedup stuff" |
| Phase | `Phase 1` / `Phase 2` / `Phase 3` | Maps to IMPLEMENTATIONPLAN.md |
| Sprint | `Sprint 1`–`Sprint 10` | |
| Role | `AI/ML` / `Backend` / `Frontend` / `IoT & Systems` / `Non-engineering` | Matches PRD §7 team structure |
| Feature Area | from PRD §5 feature table | e.g., "Resource Allocation Engine," "Offline Sync" |
| Owner | person's name | Assigned once team is staffed (PRD §7 — currently 3 of 4 roles unfilled) |
| Linked Doc | SCHEMA.md §X / TECHSPEC.md §X / DESIGN.md §X | Every ticket should trace to the spec section it implements — prevents drift between docs and code |

## 3. Sprint Cadence

- **2-week sprints**, aligned 1:1 with IMPLEMENTATIONPLAN.md's 10 sprints.
- **Sprint planning:** populate "Sprint Ready" from "Backlog" using that sprint's task list from IMPLEMENTATIONPLAN.md as the starting point — add/cut based on actual velocity, don't treat the plan as immutable.
- **Daily standup (async-friendly given likely student schedules):** each person posts what moved, what's blocking, in a shared channel — not necessarily a live call every day.
- **Sprint review:** at sprint close, compare completed tickets against that sprint's IMPLEMENTATIONPLAN.md goals; carry incomplete tickets to next sprint's Backlog, don't silently drop them.
- **Milestone demos:** Sprint 3, 6, and 10 are hard demo checkpoints (Phase boundaries) — treat these as non-negotiable dates even if scope inside the sprint flexes.

## 4. Initial Backlog Seed (Phase 1, Sprint 1)

These are ready to enter the board immediately based on IMPLEMENTATIONPLAN.md Sprint 1:

| Title | Role | Feature Area | Linked Doc |
|---|---|---|---|
| Stand up API Gateway + Ingestion Service skeleton | Backend | Core Platform | TECHSPEC.md §2 |
| Implement User/Report/Incident tables + PostGIS migration | Backend | Core Platform | SCHEMA.md §2 |
| Scaffold Next.js web app shell with role-based routing | Frontend | Core Platform | WEBFLOW.md §3–4 |
| Scaffold Flutter citizen app shell with local SQLite | Frontend | Citizen Reporting | TECHSPEC.md §4 |
| Select + benchmark hosted LLM provider for classification | AI/ML | AI Classification Engine | TECHSPEC.md §3 |
| Define sensor ingestion payload contract | IoT & Systems | IoT Integration | SCHEMA.md §2.6 |

## 5. Risk & Blocker Log (Living Section)

A running list of risks called out across the doc set — review at every sprint planning session and update status:

| Risk | Source | Status |
|---|---|---|
| 3 of 4 team roles unfilled | PRD §7 | Open |
| No confirmed NDMA/NDRF/SDRF partnership | PRD §7, IMPLEMENTATIONPLAN Sprint 7 | Open |
| Embedding dimensionality depends on final LLM provider choice | SCHEMA §6 | Open |
| pgvector similarity threshold (0.92) unvalidated against real data | SCHEMA §6 | Open |
| Pilot region/language list undefined | PRD §8 | Open |
| AI inference budget ceiling undefined | PRD §8 | Open |

Update the **Status** column to `Mitigated` / `Accepted` / `Closed` as decisions land — don't delete rows, since the history of how a risk was resolved is useful later.

## 6. Definition of Done (applies to every ticket)

A ticket is not "Done" until:
1. Code merged to main with passing CI (per RULES.md branching convention)
2. Linked spec doc section (SCHEMA/TECHSPEC/DESIGN/WEBFLOW) either matches the implementation, or has been updated if implementation diverged — **docs and code must not silently drift**
3. For AI/ML tickets specifically: model version logged per `Classification.model_version` (SCHEMA §2.8), since severity-scoring changes need to stay auditable (TECHSPEC §3, RULES.md governance)
