"""
AI Orchestration Service — worker.py
Redis queue consumer. Processes classification jobs and severity override requests.

Queue layout:
  queue:classification  → new incidents awaiting LLM classification
  queue:override        → human severity overrides (authority/rescue_team roles only)

RULES.md §3:
  - model_version column MUST be written on every UPDATE.
  - Severity override must record overriding user_id + reason.
  - Never silently drop a message; dead-letter to queue:dlq on repeated failures.
"""

from __future__ import annotations

import asyncio
import json
import logging
import sys

import redis.asyncio as aioredis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from classifier import classify_incident, score_to_tier
from config import Settings
from db import AsyncSessionLocal
from pipeline import detect_objects, predict_risk, blend_scores

logger = logging.getLogger(__name__)
settings = Settings()

MAX_RETRIES = 3
POLL_TIMEOUT = 5     # seconds — BLPOP block timeout
DLQ_KEY = "queue:dlq"


async def process_classification(msg: dict, db: AsyncSession) -> None:
    """
    Execute multi-modal classification pipeline for one incident:
      1. LLM text classification (classifier.py)
      2. YOLO visual detection (pipeline/yolo_detector.py) — only if media attached
      3. Geospatial risk scoring (pipeline/risk_predictor.py)
      4. Blend all three scores and persist
    """
    incident_id = msg["incident_id"]
    report_id = msg.get("report_id")
    raw_text = msg.get("raw_text")
    raw_media_url = msg.get("raw_media_url")
    district = msg.get("district", "unknown")
    channel = msg.get("channel", "app")
    lon = msg["location"]["longitude"]
    lat = msg["location"]["latitude"]

    # Mark incident as classifying to prevent duplicate work
    await db.execute(
        text("UPDATE incidents SET status = 'classifying' WHERE id = :id AND status = 'reported'"),
        {"id": incident_id},
    )
    await db.commit()

    # ── Run all three pipeline stages concurrently ────────────────────────────
    llm_task = asyncio.create_task(
        classify_incident(
            raw_text=raw_text,
            raw_media_url=raw_media_url,
            district=district,
            channel=channel,
            lon=lon,
            lat=lat,
        )
    )
    yolo_task = asyncio.create_task(
        detect_objects(raw_media_url or "", incident_id=incident_id)
        if raw_media_url
        else asyncio.coroutine(lambda: None)()  # no-op when no media
    )
    risk_task = asyncio.create_task(
        predict_risk(lat, lon, district, incident_id=incident_id)
    )

    result, severity_tier, model_version = await llm_task

    try:
        yolo_result = await yolo_task
        yolo_hint = yolo_result.severity_hint if yolo_result and not yolo_result.is_stub else 0.0
        yolo_model = yolo_result.model_version if yolo_result else "yolo@none"
    except Exception as exc:
        logger.warning("YOLO pipeline failed, skipping: %s", exc)
        yolo_hint = 0.0
        yolo_model = "yolo@error"

    try:
        risk_result = await risk_task
        risk_score = risk_result.score
        risk_model = risk_result.model_version
    except Exception as exc:
        logger.warning("Risk pipeline failed, skipping: %s", exc)
        risk_score = 0.5
        risk_model = "risk@error"

    # ── Blend all three signals ───────────────────────────────────────────────
    final_score = blend_scores(
        llm_score=result.severity_score_raw,
        risk_score=risk_score,
        yolo_hint=yolo_hint,
    )
    final_tier = score_to_tier(final_score)

    # Composite model_version string records all three pipeline versions
    composite_model_version = f"{model_version}|{yolo_model}|{risk_model}"

    # Persist classification (RULES.md §3: model_version MANDATORY)
    await db.execute(
        text("""
            UPDATE incidents SET
                status = 'classified',
                incident_type = :incident_type,
                severity_score_raw = :score,
                severity_tier = :tier,
                model_version = :model_version,
                classified_at = NOW()
            WHERE id = :id
        """),
        {
            "id": incident_id,
            "incident_type": result.incident_type,
            "score": final_score,
            "tier": final_tier.value,
            "model_version": composite_model_version,
        },
    )

    # Log AI model call for audit trail (RULES.md §3)
    await db.execute(
        text("""
            INSERT INTO ai_model_logs (
                incident_id, report_id, model_version, action,
                input_summary, output_summary
            ) VALUES (
                :incident_id, :report_id, :model_version, 'classify',
                :input_summary, :output_summary
            )
        """),
        {
            "incident_id": incident_id,
            "report_id": report_id,
            "model_version": composite_model_version,
            "input_summary": (raw_text or "")[:500],
            "output_summary": json.dumps({
                "incident_type": result.incident_type,
                "llm_score": result.severity_score_raw,
                "risk_score": risk_score,
                "yolo_hint": yolo_hint,
                "final_score": final_score,
                "final_tier": final_tier.value,
                "reasoning": result.reasoning,
            }),
        },
    )

    await db.commit()
    logger.info(
        "Classification persisted incident_id=%s type=%s tier=%s "
        "llm=%.2f risk=%.2f yolo=%.2f final=%.2f model=%s",
        incident_id, result.incident_type, final_tier.value,
        result.severity_score_raw, risk_score, yolo_hint, final_score,
        composite_model_version,
    )


async def process_severity_override(msg: dict, db: AsyncSession) -> None:
    """
    Apply a human severity override.
    RULES.md §3: Records who overrode, new tier, reason. Never auto-applied.
    Caller must be authority or rescue_team role (validated by API gateway before enqueueing).
    """
    incident_id = msg["incident_id"]
    overriding_user_id = msg["user_id"]
    new_tier = msg["new_severity_tier"]
    reason = msg.get("reason", "No reason provided")

    await db.execute(
        text("""
            UPDATE incidents SET
                severity_tier = :new_tier,
                severity_overridden_by = :user_id,
                severity_override_reason = :reason,
                severity_overridden_at = NOW()
            WHERE id = :id
        """),
        {
            "id": incident_id,
            "new_tier": new_tier,
            "user_id": overriding_user_id,
            "reason": reason,
        },
    )
    await db.commit()
    logger.info(
        "Severity override applied incident_id=%s new_tier=%s by user=%s",
        incident_id, new_tier, overriding_user_id,
    )


async def run_worker(redis_client: aioredis.Redis) -> None:
    """
    Main event loop: BLPOP from both queues with retry + dead-letter logic.
    """
    logger.info("AI Orchestration worker started. Polling queues...")

    queues = ["queue:classification", "queue:override"]

    while True:
        try:
            result = await redis_client.blpop(queues, timeout=POLL_TIMEOUT)
        except asyncio.CancelledError:
            logger.info("Worker cancelled")
            break
        except Exception as exc:
            logger.error("Redis BLPOP error: %s — retrying in 5s", exc)
            await asyncio.sleep(5)
            continue

        if result is None:
            # Timeout — normal, keep looping
            continue

        queue_name, raw_msg = result
        retries = 0

        while retries < MAX_RETRIES:
            try:
                msg = json.loads(raw_msg)
                async with AsyncSessionLocal() as db:
                    if queue_name == "queue:classification":
                        await process_classification(msg, db)
                    elif queue_name == "queue:override":
                        await process_severity_override(msg, db)
                break
            except Exception as exc:
                retries += 1
                logger.warning(
                    "Worker error (attempt %d/%d) queue=%s error=%s",
                    retries, MAX_RETRIES, queue_name, exc,
                )
                if retries >= MAX_RETRIES:
                    # Dead-letter
                    logger.error("Moving message to DLQ after %d failures: %s", MAX_RETRIES, raw_msg)
                    await redis_client.lpush(DLQ_KEY, raw_msg)
                else:
                    await asyncio.sleep(2 ** retries)  # Exponential backoff


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    async def _main():
        r = aioredis.from_url(settings.redis_url, encoding="utf-8", decode_responses=True)
        try:
            await run_worker(r)
        finally:
            await r.aclose()

    asyncio.run(_main())
