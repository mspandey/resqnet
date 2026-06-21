# DESIGN.md — ResQNet UX & Design Direction

**Status:** Draft v1
**Depends on:** PRD.md (personas, features), TECHSPEC.md (offline-sync model)

---

## 1. Design Principles

1. **Clarity under stress.** Citizens and rescue teams use this app during the worst moments of their day. No feature should require more than 3 taps to reach in a crisis flow (report an emergency, accept a dispatch).
2. **Degrade gracefully, never silently.** If the app is offline, the UI must say so and confirm what *will* happen (queued, will sync) — never imply success it can't guarantee yet.
3. **Severity should be visible, not just computed.** AI severity scoring is a backend decision; the UI must surface it (color, label, position in queue) so humans can sanity-check and override it.
4. **One visual language, four surfaces.** Citizen app, volunteer view, rescue dispatch view, and authority dashboard are different surfaces of one system — shared color/severity coding across all four so a "red" incident means the same thing everywhere.

## 2. Persona UX Flows

### 2.1 Citizen — Report & Track
```
[Open App] → [Report Type: Text / Voice / Photo] → [Auto-location capture]
   → [Submit] → [Sync Status Indicator: Sent / Queued Offline]
   → [AI Acknowledgement + Safety Tips screen]
   → [Live Status Tracker: Reported → Verified → Dispatched → En Route → Resolved]
```
- **Key screen — Report Composer:** large tap targets for the three input modes (text/voice/photo); voice mode shows a live waveform during recording for confidence the mic is working.
- **Key screen — Sync Status Indicator:** persistent banner, not a toast — must remain visible until confirmed synced, since this is the trust-critical moment for offline-first claims (see TECHSPEC §4).
- **Key screen — Status Tracker:** a vertical stepper (not a percentage bar) — disaster status isn't linear/predictable, so discrete named stages set more honest expectations than a progress bar implying a known ETA.

### 2.2 Volunteer — Discover & Act
```
[Open App] → [Heatmap of nearby verified incidents] → [Filter by skill match]
   → [Incident Detail: severity, distance, required skill] → [Accept Task]
   → [Status Update screen] → [Flag Resource Need] → [Mark Complete]
```
- **Key screen — Heatmap:** incidents are pins colored by severity tier (not just density blobs) — a volunteer should be able to tell "is the nearest one severe?" at a glance, not just "is there a cluster here?"
- **Key screen — Incident Detail:** shows *why* this task matched the volunteer ("Matched: First Aid, 1.2km away") — transparency in matching builds trust in the algorithm.

### 2.3 Rescue Team — Dispatch & Resolve
```
[Login] → [AI-Prioritized Dispatch Queue] → [Accept Top Incident]
   → [Route Guidance (offline-capable map)] → [Arrive: Update Status]
   → [Log Outcome] → [Close Case] → [Return to Queue]
```
- **Key screen — Dispatch Queue:** ordered list, severity-coded, with a visible "AI Score" + manual override control (per TECHSPEC §3's human-in-the-loop requirement) — the override must be one tap, not buried in a menu, since dispatchers need to act fast if the AI gets it wrong.
- **Key screen — Route Guidance:** must work with pre-cached Mapbox tiles (TECHSPEC §4); show a "tiles cached for offline use" indicator before a team heads into a known-low-connectivity zone.

### 2.4 Government Authority — Monitor & Decide
```
[Login] → [Command Dashboard: district/state heatmap + queue summary]
   → [Drill into District] → [Allocate Resources / Declare Alert]
   → [Analytics View: post-incident review]
```
- **Key screen — Command Dashboard:** information hierarchy is district-level aggregate first (counts by severity, resource utilization %), with drill-down to individual incidents — authorities need the macro view by default, not a flooded incident-by-incident feed.
- **Key screen — Analytics View:** built for the policy-review use case named in PRD — trends over time, response-time distributions, resource utilization by region — not just a raw incident log.

## 3. Shared Visual Language

### 3.1 Severity Color Coding (used identically across all 4 surfaces)
| Tier | Color | Usage |
|---|---|---|
| Critical | Red | Immediate life-threat |
| High | Orange | Urgent, not immediately life-threatening |
| Moderate | Yellow | Needs response, not time-critical |
| Low / Informational | Blue-gray | Logged, monitored, no immediate action |

### 3.2 Connectivity State Indicators
A small persistent status chip (not a modal) appears across citizen and rescue-team apps:
- **Online** — green dot
- **Syncing** — amber dot with spinner
- **Offline — Queued** — gray dot with count of pending items
- **SMS Fallback Active** — distinct icon, since this changes what the user can do (text-only reporting)

### 3.3 Multilingual UI
- Per PRD open question, exact language list is pending pilot-region confirmation. Design system should treat all UI strings as externalized (i18n-ready) from day one rather than retrofitted — this is a process rule that belongs in RULES.md as well.
- Voice reporting UI should show detected language back to the user ("Detected: Hindi") so they can correct misdetection before submitting, since transcription accuracy affects downstream classification.

## 4. Accessibility Considerations

- Severity must never rely on color alone (colorblind users) — pair every color tier with a text label and an icon shape (e.g., critical = red + triangle, low = blue-gray + circle).
- Voice reporting doubles as an accessibility feature for low-literacy or visually impaired citizens — should be promoted as a primary input mode, not a secondary one, in the Report Composer.
- Touch targets in the Rescue Team app should assume use with gloves or in poor lighting (disaster-site conditions) — minimum 48x48dp targets, higher contrast than typical mobile UI defaults.

## 5. Open Design Questions

- No wireframes or mockups exist yet — this document defines flow and hierarchy, not pixel-level layout. Recommend a follow-up Figma pass before frontend implementation begins.
- Exact brand visual identity (logo, typeface, illustration style) is undefined beyond the hackathon deck's dark command-center aesthetic — decide whether the product UI inherits that dark theme or uses a lighter operational theme for daily dashboard use (dark themes suit a "war room" feel but may fatigue users in 8-hour dashboard shifts).
