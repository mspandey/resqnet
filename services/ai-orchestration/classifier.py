"""
AI Orchestration Service — classifier.py
LLM-based incident classification and severity scoring.

RULES.md §3 (Critical — Non-Negotiable):
  - model_version MUST be stored with every classification result.
  - Severity override requires human actor + reason (enforced at DB insert, not bypassed here).
  - ALL LLM calls log: model name, temperature, tokens used.

Classification pipeline:
  1. Build structured prompt from raw report text + geolocation context.
  2. Call LLM with JSON output mode.
  3. Parse and validate response.
  4. Update incidents table: incident_type, severity_score_raw, severity_tier, model_version.
  5. Publish severity notification if tier = critical/high.
"""

from __future__ import annotations

import json
import logging
import time
from enum import Enum

from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from config import Settings

logger = logging.getLogger(__name__)
settings = Settings()

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=settings.llm_api_key,
            base_url=settings.llm_base_url,
        )
    return _client


# ── Severity tiers (match SQL enum) ──────────────────────────────────────────

class SeverityTier(str, Enum):
    critical = "critical"
    high = "high"
    moderate = "moderate"
    low = "low"


SEVERITY_SCORE_RANGES: dict[SeverityTier, tuple[float, float]] = {
    SeverityTier.critical: (0.85, 1.0),
    SeverityTier.high: (0.65, 0.85),
    SeverityTier.moderate: (0.35, 0.65),
    SeverityTier.low: (0.0, 0.35),
}


def score_to_tier(score: float) -> SeverityTier:
    for tier, (lo, hi) in SEVERITY_SCORE_RANGES.items():
        if lo <= score <= hi:
            return tier
    return SeverityTier.low


# ── LLM response schema ───────────────────────────────────────────────────────

class ClassificationResult(BaseModel):
    incident_type: str = Field(
        ...,
        description="Canonical incident category. E.g. 'flood', 'earthquake', 'building_collapse', 'wildfire', 'medical_emergency'",
    )
    severity_score_raw: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Continuous severity score 0.0 (minimal) to 1.0 (catastrophic)",
    )
    reasoning: str = Field(
        ...,
        description="One-sentence justification for the severity score",
    )
    language_detected: str = Field(
        default="en",
        description="ISO-639-1 language code detected in report text",
    )


# ── Prompt builder ────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are ResQNet's disaster classification AI. Analyze the incoming disaster report and output structured JSON.

Severity scale:
- 0.85-1.0 CRITICAL: Immediate threat to many lives, large-scale infrastructure collapse, mass casualty event.
- 0.65-0.85 HIGH: Significant threat, multiple injuries, major property damage, spreading hazard.
- 0.35-0.65 MODERATE: Localized impact, injuries possible, manageable with local resources.
- 0.00-0.35 LOW: Minor incident, no immediate threat to life, informational.

Always output valid JSON matching this schema exactly:
{
  "incident_type": "<string>",
  "severity_score_raw": <float 0.0-1.0>,
  "reasoning": "<one sentence>",
  "language_detected": "<iso-639-1>"
}"""


def _build_user_message(
    raw_text: str | None,
    district: str,
    channel: str,
    lon: float,
    lat: float,
) -> str:
    parts = [
        f"Channel: {channel}",
        f"Location: {district} ({lat:.4f}, {lon:.4f})",
    ]
    if raw_text:
        parts.append(f"Report text: {raw_text}")
    else:
        parts.append("Report text: (media-only report — no text provided)")
    return "\n".join(parts)


# ── Main classify function ────────────────────────────────────────────────────

async def classify_incident(
    raw_text: str | None,
    raw_media_url: str | None,
    district: str,
    channel: str,
    lon: float,
    lat: float,
) -> tuple[ClassificationResult, SeverityTier, str]:
    """
    Classify a disaster report.

    Returns:
        (result, severity_tier, model_version)
        model_version is the exact model identifier used (RULES.md §3).
    """
    model = settings.classification_model
    temperature = settings.classification_temperature

    if not settings.llm_api_key:
        # Dev stub — return plausible defaults without calling API
        logger.warning("LLM_API_KEY not set — returning stub classification")
        stub = ClassificationResult(
            incident_type="unknown",
            severity_score_raw=0.5,
            reasoning="Stub classification (no API key configured)",
            language_detected="en",
        )
        return stub, SeverityTier.moderate, f"{model}@stub"

    client = _get_client()
    user_message = _build_user_message(raw_text, district, channel, lon, lat)

    t0 = time.perf_counter()
    try:
        response = await client.chat.completions.create(
            model=model,
            temperature=temperature,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            max_tokens=256,
        )
    except Exception as exc:
        logger.error("LLM classification call failed: %s", exc)
        raise

    elapsed = time.perf_counter() - t0
    usage = response.usage

    logger.info(
        "LLM classify model=%s tokens_prompt=%d tokens_completion=%d latency_ms=%.0f",
        model,
        usage.prompt_tokens if usage else 0,
        usage.completion_tokens if usage else 0,
        elapsed * 1000,
    )

    raw_json = response.choices[0].message.content or "{}"
    try:
        parsed = json.loads(raw_json)
        result = ClassificationResult(**parsed)
    except Exception as exc:
        logger.error("Failed to parse LLM classification response: %s — raw=%s", exc, raw_json)
        result = ClassificationResult(
            incident_type="parse_error",
            severity_score_raw=0.5,
            reasoning=f"Parse error: {exc}",
            language_detected="en",
        )

    severity_tier = score_to_tier(result.severity_score_raw)

    # model_version format: "<model_name>@<response_id_prefix>" (RULES.md §3)
    model_version = f"{model}@{response.id[:8] if response.id else 'unknown'}"

    logger.info(
        "Classification complete type=%s score=%.3f tier=%s model_version=%s",
        result.incident_type,
        result.severity_score_raw,
        severity_tier.value,
        model_version,
    )

    return result, severity_tier, model_version
