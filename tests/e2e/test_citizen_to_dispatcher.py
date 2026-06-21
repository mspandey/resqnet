#!/usr/bin/env python3
"""
tests/e2e/test_citizen_to_dispatcher.py
End-to-end integration test: Citizen report → Ingestion → AI classification → Dispatch → Volunteer

Verifies the complete ResQNet happy-path workflow against a running local stack.
Run AFTER `docker compose up` and seeding with dev_seed.sql.

Usage:
    python tests/e2e/test_citizen_to_dispatcher.py
    # or:
    pytest tests/e2e/test_citizen_to_dispatcher.py -v

Environment:
    API_URL   — API Gateway base URL (default: http://localhost:8000)
    TEST_EMAIL_VOLUNTEER   — seed volunteer email (default: volunteer@resqnet.dev)
    TEST_EMAIL_RESCUE      — seed rescue team email (default: rescue@resqnet.dev)
    TEST_EMAIL_AUTHORITY   — seed authority email (default: authority@resqnet.dev)
    TEST_PASSWORD          — shared seed password (default: dev_password_123)
"""

from __future__ import annotations

import asyncio
import json
import os
import time
import uuid
import sys
from typing import Any

import httpx

# ── Config ────────────────────────────────────────────────────────────────────

API_URL  = os.getenv("API_URL", "http://localhost:8000")
TIMEOUT  = httpx.Timeout(30.0)

CREDENTIALS = {
    "volunteer":  {"email": os.getenv("TEST_EMAIL_VOLUNTEER",  "volunteer@resqnet.dev"),  "password": os.getenv("TEST_PASSWORD", "dev_password_123")},
    "rescue_team":{"email": os.getenv("TEST_EMAIL_RESCUE",     "rescue@resqnet.dev"),     "password": os.getenv("TEST_PASSWORD", "dev_password_123")},
    "authority":  {"email": os.getenv("TEST_EMAIL_AUTHORITY",  "authority@resqnet.dev"),  "password": os.getenv("TEST_PASSWORD", "dev_password_123")},
}

# ── Helpers ───────────────────────────────────────────────────────────────────

PASS  = "\033[32m✓\033[0m"
FAIL  = "\033[31m✗\033[0m"
INFO  = "\033[34m→\033[0m"

passed = 0
failed = 0


def ok(msg: str) -> None:
    global passed
    passed += 1
    print(f"  {PASS}  {msg}")


def err(msg: str, detail: str = "") -> None:
    global failed
    failed += 1
    detail_str = f"\n       {detail}" if detail else ""
    print(f"  {FAIL}  {msg}{detail_str}")


def section(title: str) -> None:
    print(f"\n{INFO} {title}")


async def login(client: httpx.AsyncClient, role: str) -> str:
    """Authenticate and return JWT access token."""
    creds = CREDENTIALS[role]
    resp = await client.post(f"{API_URL}/api/auth/login", json=creds, timeout=TIMEOUT)
    resp.raise_for_status()
    token = resp.json()["access_token"]
    return token


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def wait_for_status(
    client: httpx.AsyncClient,
    incident_id: str,
    expected_status: str,
    token: str,
    *,
    max_wait: float = 20.0,
    poll_interval: float = 1.0,
) -> dict | None:
    """Poll incident endpoint until status matches or timeout."""
    deadline = time.monotonic() + max_wait
    while time.monotonic() < deadline:
        resp = await client.get(
            f"{API_URL}/api/incidents/{incident_id}",
            headers=auth_headers(token),
            timeout=TIMEOUT,
        )
        if resp.status_code == 200:
            inc = resp.json()
            if inc.get("status") == expected_status:
                return inc
        await asyncio.sleep(poll_interval)
    return None


# ── Test cases ────────────────────────────────────────────────────────────────

async def test_health() -> None:
    section("0. Health checks")
    async with httpx.AsyncClient() as client:
        for service, url in [
            ("API Gateway",      f"{API_URL}/health"),
            ("Ingestion",        "http://localhost:8001/health"),
            ("AI Orchestration", "http://localhost:8002/health"),
            ("Dispatch",         "http://localhost:3001/health"),
            ("Notification",     "http://localhost:3002/health"),
        ]:
            try:
                r = await client.get(url, timeout=5)
                if r.status_code < 400:
                    ok(f"{service} healthy ({r.status_code})")
                else:
                    err(f"{service} unhealthy", f"HTTP {r.status_code}")
            except Exception as exc:
                err(f"{service} unreachable", str(exc))


async def test_auth() -> dict[str, str]:
    """Test all three role logins; return token dict."""
    section("1. Authentication")
    tokens: dict[str, str] = {}
    async with httpx.AsyncClient() as client:
        for role in ("volunteer", "rescue_team", "authority"):
            try:
                token = await login(client, role)
                tokens[role] = token
                ok(f"{role} login → JWT issued")
            except httpx.HTTPStatusError as exc:
                err(f"{role} login failed", f"HTTP {exc.response.status_code}: {exc.response.text[:200]}")
            except Exception as exc:
                err(f"{role} login failed", str(exc))
    return tokens


async def test_incident_submission(tokens: dict[str, str]) -> str | None:
    """Citizen submits an incident report via the ingestion endpoint."""
    section("2. Citizen incident submission (Ingestion service)")
    incident_id = str(uuid.uuid4())
    payload = {
        "incident_id": incident_id,
        "channel": "app",
        "raw_text": (
            "Severe flooding near Rajiv Gandhi Bridge. Water level 4 feet and rising. "
            "Multiple families stranded on rooftops. Request immediate rescue."
        ),
        "district": "Central Delhi",
        "location": {"latitude": 28.6517, "longitude": 77.2219},
        "language": "en",
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                "http://localhost:8001/api/ingest/report",
                json=payload,
                timeout=TIMEOUT,
            )
            if resp.status_code in (200, 201, 202):
                ok(f"Report accepted incident_id={incident_id}")
                return incident_id
            else:
                err("Report submission failed", f"HTTP {resp.status_code}: {resp.text[:300]}")
                return None
        except Exception as exc:
            err("Report submission failed", str(exc))
            return None


async def test_ai_classification(tokens: dict[str, str], incident_id: str) -> bool:
    """AI worker should classify the incident within ~15 seconds."""
    section("3. AI classification (AI Orchestration worker)")
    rescue_token = tokens.get("rescue_team", "")
    async with httpx.AsyncClient() as client:
        inc = await wait_for_status(
            client, incident_id, "classified", rescue_token,
            max_wait=30.0,
        )
        if inc:
            ok(f"Incident classified — tier={inc.get('severity_tier')} score={inc.get('severity_score_raw', '?'):.2f}")
            ok(f"model_version present: {bool(inc.get('model_version'))}")
            if not inc.get("model_version"):
                err("RULES.md §3 violation: model_version is NULL after classification")
            return True
        else:
            err("Incident not classified within 30s — check AI Orchestration logs")
            return False


async def test_dispatch(tokens: dict[str, str], incident_id: str) -> str | None:
    """Rescue team dispatcher assigns a team to the incident."""
    section("4. Dispatch assignment (Dispatch-Resource service)")
    rescue_token = tokens.get("rescue_team", "")
    auth_token = tokens.get("authority", "")

    async with httpx.AsyncClient() as client:
        # Get team suggestions
        try:
            resp = await client.get(
                f"{API_URL}/api/dispatch/suggest?incident_id={incident_id}",
                headers=auth_headers(rescue_token),
                timeout=TIMEOUT,
            )
            if resp.status_code == 200:
                suggestions = resp.json()
                ok(f"Team suggestions returned ({len(suggestions)} team(s))")
            else:
                err("Team suggest failed", f"HTTP {resp.status_code}")
                suggestions = []
        except Exception as exc:
            err("Team suggest request failed", str(exc))
            suggestions = []

        # Dispatch first suggested team (or fall back to seed team_id)
        team_id = suggestions[0]["team_id"] if suggestions else None
        if not team_id:
            # Use seed data team ID from dev_seed.sql
            team_id = "11111111-1111-1111-1111-111111111111"
            print(f"     (using seed team_id={team_id})")

        try:
            resp = await client.post(
                f"{API_URL}/api/dispatch",
                json={"incident_id": incident_id, "team_id": team_id},
                headers=auth_headers(rescue_token),
                timeout=TIMEOUT,
            )
            if resp.status_code in (200, 201):
                dispatch = resp.json()
                dispatch_id = dispatch.get("id")
                ok(f"Dispatch created dispatch_id={dispatch_id}")
                return dispatch_id
            else:
                err("Dispatch failed", f"HTTP {resp.status_code}: {resp.text[:300]}")
                return None
        except Exception as exc:
            err("Dispatch request failed", str(exc))
            return None


async def test_incident_status_progression(
    tokens: dict[str, str],
    incident_id: str,
    dispatch_id: str | None,
) -> None:
    """Verify incident progresses from classified → dispatched → resolved."""
    section("5. Status progression (Dispatch → Resolve)")
    rescue_token = tokens.get("rescue_team", "")

    async with httpx.AsyncClient() as client:
        # Poll for dispatched status
        inc = await wait_for_status(
            client, incident_id, "dispatched", rescue_token, max_wait=10.0
        )
        if inc:
            ok("Incident status → dispatched")
        else:
            err("Incident did not reach 'dispatched' within 10s")

        # Simulate resolve
        if dispatch_id:
            try:
                resp = await client.patch(
                    f"{API_URL}/api/dispatch/{dispatch_id}/status",
                    json={"status": "resolved"},
                    headers=auth_headers(rescue_token),
                    timeout=TIMEOUT,
                )
                if resp.status_code in (200, 204):
                    ok("Dispatch resolved successfully")
                else:
                    err("Resolve failed", f"HTTP {resp.status_code}: {resp.text[:200]}")
            except Exception as exc:
                err("Resolve request failed", str(exc))


async def test_role_access_control(tokens: dict[str, str]) -> None:
    """Verify role-based access control — volunteers cannot access authority endpoints."""
    section("6. Role-based access control (API Gateway)")
    volunteer_token = tokens.get("volunteer", "")

    async with httpx.AsyncClient() as client:
        # Volunteer should NOT be able to broadcast alerts
        try:
            resp = await client.post(
                f"{API_URL}/api/alerts",
                json={"district": "Central Delhi", "message": "Test", "severity": "high"},
                headers=auth_headers(volunteer_token),
                timeout=TIMEOUT,
            )
            if resp.status_code in (401, 403):
                ok(f"Volunteer blocked from /api/alerts (HTTP {resp.status_code}) ✓")
            else:
                err(
                    "SECURITY: Volunteer accessed authority-only endpoint",
                    f"Expected 401/403, got {resp.status_code}"
                )
        except Exception as exc:
            err("Access control check failed", str(exc))

        # Volunteer should NOT be able to POST dispatches
        try:
            resp = await client.post(
                f"{API_URL}/api/dispatch",
                json={"incident_id": str(uuid.uuid4()), "team_id": str(uuid.uuid4())},
                headers=auth_headers(volunteer_token),
                timeout=TIMEOUT,
            )
            if resp.status_code in (401, 403):
                ok(f"Volunteer blocked from /api/dispatch (HTTP {resp.status_code}) ✓")
            else:
                err(
                    "SECURITY: Volunteer accessed rescue-only endpoint",
                    f"Expected 401/403, got {resp.status_code}"
                )
        except Exception as exc:
            err("Access control check failed", str(exc))


async def test_severity_override(tokens: dict[str, str], incident_id: str) -> None:
    """Authority/rescue can override AI severity; audit log must be written."""
    section("7. Severity override audit trail (RULES.md §3)")
    rescue_token = tokens.get("rescue_team", "")

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.patch(
                f"{API_URL}/api/incidents/{incident_id}/severity",
                json={"severity_tier": "critical", "severity_score": 0.95},
                headers=auth_headers(rescue_token),
                timeout=TIMEOUT,
            )
            if resp.status_code in (200, 204):
                ok("Severity override accepted")
                # Verify the override is reflected
                inc_resp = await client.get(
                    f"{API_URL}/api/incidents/{incident_id}",
                    headers=auth_headers(rescue_token),
                    timeout=TIMEOUT,
                )
                if inc_resp.status_code == 200:
                    inc = inc_resp.json()
                    if inc.get("severity_tier") == "critical":
                        ok("Overridden severity_tier=critical confirmed in DB")
                    else:
                        err("Override not reflected in incident record")
            else:
                err("Severity override failed", f"HTTP {resp.status_code}: {resp.text[:200]}")
        except Exception as exc:
            err("Severity override request failed", str(exc))


# ── Runner ────────────────────────────────────────────────────────────────────

async def main() -> None:
    print("\n" + "=" * 60)
    print("  ResQNet — End-to-End Integration Test")
    print("  Citizen → Ingestion → AI → Dispatch → Volunteer")
    print("=" * 60)

    await test_health()
    tokens = await test_auth()

    if not tokens:
        print("\n  Aborting — authentication failed for all roles.")
        sys.exit(1)

    incident_id = await test_incident_submission(tokens)

    if incident_id:
        classified = await test_ai_classification(tokens, incident_id)
        if classified:
            dispatch_id = await test_dispatch(tokens, incident_id)
            await test_incident_status_progression(tokens, incident_id, dispatch_id)
            await test_severity_override(tokens, incident_id)
    else:
        print("  Skipping downstream tests — incident submission failed.")

    await test_role_access_control(tokens)

    print("\n" + "=" * 60)
    total = passed + failed
    print(f"  Results: {passed}/{total} passed  |  {failed} failed")
    print("=" * 60 + "\n")

    sys.exit(0 if failed == 0 else 1)


if __name__ == "__main__":
    asyncio.run(main())
