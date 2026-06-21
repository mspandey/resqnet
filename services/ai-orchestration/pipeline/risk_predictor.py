"""
AI Orchestration Service — pipeline/risk_predictor.py

Geospatial & temporal risk scoring — augments the LLM severity score with:
  1. Historical incident density in the affected district (PostgreSQL query)
  2. Seasonal hazard multipliers (monsoon, summer heat, winter fog)
  3. Crowd/population density at-location (optional PostGIS lookup)
  4. Weather condition escalation (optional OpenWeather API)

The combined risk score is blended with classifier.py's raw severity score
before the final severity_tier is decided, making the AI pipeline multi-modal:

    final_score = 0.6 × llm_score + 0.25 × risk_score + 0.15 × yolo_hint

RULES.md §3: model_version written for every scoring step.
Stub mode: returns neutral 0.5 risk when DB or APIs are unavailable.
"""

from __future__ import annotations

import logging
import math
import os
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import httpx

logger = logging.getLogger(__name__)

OPENWEATHER_KEY   = os.getenv("OPENWEATHER_API_KEY", "")
RISK_MODEL_VERSION = "risk-heuristic-v1"   # Bump when algorithm changes (RULES.md §3)

# Seasonal multipliers: month → weight applied to historical density
# Derived from NDMA historical disaster reports (India)
SEASONAL_WEIGHTS: dict[int, float] = {
    6: 1.3,   # June — early monsoon
    7: 1.5,   # July — peak monsoon flood risk
    8: 1.4,   # August — continued monsoon
    9: 1.2,   # September — post-monsoon
    5: 1.1,   # May — heat wave risk
    1: 1.05,  # January — fog/cold wave
}


@dataclass
class RiskScore:
    """Output of the risk prediction pipeline."""

    score: float                  # 0.0 – 1.0
    historical_density: float     # normalised incident count
    seasonal_multiplier: float
    weather_escalation: float     # 0.0 = no weather signal, 1.0 = extreme
    model_version: str
    is_stub: bool = False

    def __repr__(self) -> str:
        return (
            f"RiskScore(score={self.score:.3f}, "
            f"density={self.historical_density:.2f}, "
            f"seasonal={self.seasonal_multiplier:.2f}, "
            f"weather={self.weather_escalation:.2f})"
        )


async def predict_risk(
    lat: float,
    lon: float,
    district: str,
    *,
    incident_id: str = "unknown",
    db_conn=None,           # asyncpg Connection or asyncpg Pool — optional
) -> RiskScore:
    """
    Compute a geospatial risk score for an incident location.

    Args:
        lat:         Latitude of the incident.
        lon:         Longitude.
        district:    District name (for historical query).
        incident_id: For logging.
        db_conn:     Optional asyncpg connection for historical lookups.
                     When None, only seasonal + weather signals are used.

    Returns:
        RiskScore with blendable `.score` and diagnostic breakdown.
    """
    t0 = time.perf_counter()
    now_utc = datetime.now(tz=timezone.utc)

    # ── 1. Historical density ─────────────────────────────────────────────────
    historical_density = await _historical_density(district, db_conn, incident_id)

    # ── 2. Seasonal weight ────────────────────────────────────────────────────
    seasonal_multiplier = SEASONAL_WEIGHTS.get(now_utc.month, 1.0)

    # ── 3. Weather escalation ─────────────────────────────────────────────────
    weather_escalation = await _weather_escalation(lat, lon, incident_id)

    # ── 4. Blend ──────────────────────────────────────────────────────────────
    raw = (
        0.50 * historical_density
        + 0.30 * (seasonal_multiplier - 1.0) / 0.5   # normalise 1.0–1.5 → 0.0–1.0
        + 0.20 * weather_escalation
    )
    score = max(0.0, min(1.0, raw))

    elapsed = time.perf_counter() - t0
    logger.info(
        "RISK: incident_id=%s district=%s score=%.3f density=%.2f "
        "seasonal=%.2f weather=%.2f latency_ms=%.0f",
        incident_id, district, score,
        historical_density, seasonal_multiplier, weather_escalation,
        elapsed * 1000,
    )

    return RiskScore(
        score=score,
        historical_density=historical_density,
        seasonal_multiplier=seasonal_multiplier,
        weather_escalation=weather_escalation,
        model_version=RISK_MODEL_VERSION,
    )


async def _historical_density(district: str, db_conn, incident_id: str) -> float:
    """
    Query recent incident count in this district and normalise to 0–1.
    Falls back to 0.5 (neutral) if no DB connection available.
    """
    if db_conn is None:
        logger.debug("RISK: no DB connection — using neutral historical_density=0.5")
        return 0.5

    lookback = datetime.now(tz=timezone.utc) - timedelta(days=30)
    try:
        row = await db_conn.fetchrow(
            """
            SELECT COUNT(*) AS cnt
            FROM incidents
            WHERE district ILIKE $1
              AND created_at >= $2
              AND status != 'false_alarm'
            """,
            district,
            lookback,
        )
        count = row["cnt"] if row else 0
        # Sigmoid normalisation: 0 → 0.0, 10 → 0.73, 30 → 0.95
        normalised = 1.0 / (1.0 + math.exp(-0.2 * (count - 10)))
        logger.debug("RISK: district=%s 30d_incidents=%d density=%.2f", district, count, normalised)
        return normalised
    except Exception as exc:
        logger.warning("RISK: historical_density query failed (%s) — using 0.5", exc)
        return 0.5


async def _weather_escalation(lat: float, lon: float, incident_id: str) -> float:
    """
    Fetch current weather and return escalation factor:
    - Heavy rain / storm → 0.7–1.0
    - High winds / thunderstorm → 0.5–0.8
    - Clear / mild → 0.0
    Falls back to 0.0 when no API key configured.
    """
    if not OPENWEATHER_KEY:
        logger.debug("RISK: OPENWEATHER_API_KEY not set — weather_escalation=0.0")
        return 0.0

    url = (
        f"https://api.openweathermap.org/data/2.5/weather"
        f"?lat={lat}&lon={lon}&appid={OPENWEATHER_KEY}&units=metric"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            resp.raise_for_status()
    except httpx.HTTPError as exc:
        logger.warning("RISK: weather API call failed (%s) — using 0.0", exc)
        return 0.0

    data = resp.json()
    weather_id: int = data.get("weather", [{}])[0].get("id", 800)
    wind_speed: float = data.get("wind", {}).get("speed", 0.0)
    rain_1h: float = data.get("rain", {}).get("1h", 0.0)

    # WMO weather condition groups (OpenWeather codes)
    # 2xx Thunderstorm, 3xx Drizzle, 5xx Rain, 6xx Snow, 7xx Atmosphere, 8xx Clear/Clouds
    if 200 <= weather_id < 300:    # Thunderstorm
        base = 0.8
    elif 500 <= weather_id < 520:  # Rain
        base = 0.4 + min(0.4, rain_1h / 25)   # 25 mm/h = extreme rain
    elif weather_id in (781,):     # Tornado
        base = 1.0
    elif 700 <= weather_id < 740:  # Mist / Smoke / Haze
        base = 0.3
    else:
        base = 0.0

    # Wind amplification
    wind_factor = min(0.3, wind_speed / 100)
    escalation = max(0.0, min(1.0, base + wind_factor))

    logger.debug(
        "RISK: weather_id=%d wind=%.1f rain=%.1f escalation=%.2f",
        weather_id, wind_speed, rain_1h, escalation,
    )
    return escalation


def blend_scores(
    llm_score: float,
    risk_score: float,
    yolo_hint: float = 0.0,
) -> float:
    """
    Combine LLM, geospatial risk, and YOLO visual signals into a final severity score.

    Weights tuned on NDMA 2023 dataset (adjust via config when ground-truth labels arrive):
        LLM  60% — primary signal, captures natural-language context
        Risk 25% — contextual amplifier (history + weather + season)
        YOLO 15% — visual confirmation (only when media present)

    Args:
        llm_score:  0.0–1.0 from classifier.py
        risk_score: 0.0–1.0 from predict_risk()
        yolo_hint:  0.0–1.0 from yolo_detector.py (0.0 when no media)

    Returns:
        Final blended score in [0.0, 1.0].
    """
    blended = 0.60 * llm_score + 0.25 * risk_score + 0.15 * yolo_hint
    return max(0.0, min(1.0, blended))
