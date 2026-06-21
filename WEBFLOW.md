# WEBFLOW.md — ResQNet Navigation & Routing Map

**Status:** Draft v1
**Depends on:** DESIGN.md (UX flows), TECHSPEC.md (frontend stack: Next.js web, Flutter mobile)

---

## 1. Surface Overview

ResQNet ships as **two frontend codebases** sharing one backend:
1. **Citizen App** — Flutter (iOS/Android), citizen-only
2. **Web Platform** — Next.js, serving three role-gated experiences: Volunteer, Rescue Team, Government Authority

This split exists because citizens need offline-first mobile capture (TECHSPEC §4), while the other three personas operate in connected, desk/field-dashboard contexts better served by a responsive web app.

## 2. Citizen App — Screen Map (Flutter)

```
/splash
/onboarding (first-launch only)
/auth/login
/auth/register
/home
  ├─ /report/new
  │    ├─ /report/new/text
  │    ├─ /report/new/voice
  │    └─ /report/new/photo
  ├─ /report/:id/status         (live tracker)
  ├─ /reports/history            (past reports by this user)
  ├─ /safety-tips                (static content, available offline)
  └─ /profile
       ├─ /profile/settings
       └─ /profile/language       (UI + voice-detection language preference)
```
- **Public routes:** `/splash`, `/onboarding`, `/auth/*`, `/safety-tips` (safety tips cached for offline access — no login required, since anyone may need this content during a crisis even pre-registration)
- **Auth-gated routes:** everything under `/home` requires a citizen session
- **Offline-available routes:** `/report/new/*` (queues locally per TECHSPEC §4), `/safety-tips` — all other routes require connectivity to fetch live data

## 3. Web Platform — Shared Shell

```
/login
/select-role        (only shown if a user account has multiple roles — rare, but possible for NGO staff who are also volunteers)
/{role}/...          (role determined post-login, sets the base route below)
```

### 3.1 Volunteer Routes (`/volunteer/...`)
```
/volunteer/heatmap                (default landing)
/volunteer/incidents/:id
/volunteer/tasks/active
/volunteer/tasks/history
/volunteer/profile/skills          (self-reported skill set, per PRD §7 assumption)
```

### 3.2 Rescue Team Routes (`/rescue/...`)
```
/rescue/queue                     (default landing — AI-prioritized dispatch queue)
/rescue/incidents/:id
/rescue/incidents/:id/route        (offline-capable Mapbox route view)
/rescue/incidents/:id/resolve       (outcome logging + close case)
/rescue/history
```

### 3.3 Government Authority Routes (`/authority/...`)
```
/authority/dashboard               (default landing — district/state aggregate view)
/authority/district/:districtId
/authority/incidents/:id
/authority/resources                (allocation view)
/authority/alerts/new               (declare alert)
/authority/analytics                (post-incident policy review)
```

## 4. Auth & Route Gating

| Route prefix | Auth required | Role required |
|---|---|---|
| `/auth/*`, `/login` | No | — |
| `/safety-tips` | No (citizen app only) | — |
| `/home/*` (citizen app) | Yes | Citizen |
| `/volunteer/*` | Yes | Volunteer |
| `/rescue/*` | Yes | Rescue Team |
| `/authority/*` | Yes | Authority |

- Role is assigned at registration and enforced server-side at the API Gateway (TECHSPEC §2) — client-side route guards are a UX convenience, not the security boundary.
- No cross-role route access in MVP (e.g., a Volunteer cannot view `/rescue/queue`) — multi-role accounts (§3 `/select-role`) are an edge case deferred past MVP unless an early pilot partner specifically needs it (e.g., NGO staff who also volunteer).

## 5. Cross-Surface Linking

- Incident IDs are the shared key across surfaces: `/volunteer/incidents/:id`, `/rescue/incidents/:id`, and `/authority/incidents/:id` all resolve the same underlying `Incident` record (SCHEMA.md) but render role-appropriate views and actions — a volunteer sees "Accept Task," a rescue team sees "Resolve," an authority sees "Reassign/Escalate."
- Deep links from notifications (Firebase push / SMS) route directly to the relevant incident detail screen for the recipient's role, skipping the dashboard landing — this matters for response-time targets in PRD §6.

## 6. Open Questions Carried Forward

- Whether NGO staff need a genuine multi-role account (§3 `/select-role` flow) should be confirmed with an actual pilot partner before building it — currently speculative.
- No wireframes exist yet (per DESIGN.md §5) — this routing map should be validated against real screens once Figma work begins, since screen consolidation may change route granularity.
