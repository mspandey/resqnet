"""
AI Orchestration Service — pipeline/whisper_transcriber.py

Stub for OpenAI Whisper audio transcription.
Converts audio media reports (voice messages, phone recordings) to text
before passing to the LLM classifier.

Production path:
  1. Download audio from raw_media_url (S3 / GCS signed URL)
  2. POST to Whisper API (or run whisper.cpp locally for cost savings)
  3. Return transcript + detected_language

RULES.md §3: model_version must be recorded for every media processing step.
This stub returns a synthetic transcript so the rest of the pipeline functions
without a Whisper API key configured.
"""

from __future__ import annotations

import logging
import os
import time
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

WHISPER_API_URL = os.getenv("WHISPER_API_URL", "https://api.openai.com/v1/audio/transcriptions")
WHISPER_API_KEY = os.getenv("LLM_API_KEY", "")
WHISPER_MODEL   = os.getenv("WHISPER_MODEL", "whisper-1")

# Max file size that will be sent to Whisper (OpenAI limit: 25 MB)
MAX_AUDIO_BYTES = 25 * 1024 * 1024


class TranscriptionResult:
    """Result of a Whisper transcription call."""

    def __init__(self, text: str, language: str, model_version: str, duration_s: float):
        self.text = text
        self.language = language
        self.model_version = model_version
        self.duration_s = duration_s

    def __repr__(self) -> str:
        return (
            f"TranscriptionResult(language={self.language!r}, "
            f"words={len(self.text.split())}, model={self.model_version!r})"
        )


async def transcribe_audio(
    media_url: str,
    *,
    incident_id: str = "unknown",
    language_hint: str | None = None,
) -> TranscriptionResult:
    """
    Transcribe audio from a signed media URL.

    Args:
        media_url:     Publicly-readable URL to the audio file (mp3/mp4/wav/ogg/flac).
        incident_id:   For logging correlation.
        language_hint: Optional ISO-639-1 hint (e.g. 'hi' for Hindi).
                       Improves accuracy for non-English audio.

    Returns:
        TranscriptionResult with `.text`, `.language`, `.model_version`.

    Raises:
        RuntimeError if download or transcription fails.
    """
    if not WHISPER_API_KEY:
        logger.warning(
            "WHISPER: LLM_API_KEY not set — returning stub transcript "
            "(incident_id=%s, url=%s)", incident_id, media_url
        )
        return TranscriptionResult(
            text="[STUB] Audio report received but Whisper API key not configured. "
                 "Treating as text-less report.",
            language=language_hint or "en",
            model_version=f"{WHISPER_MODEL}@stub",
            duration_s=0.0,
        )

    # ── Step 1: Download audio ────────────────────────────────────────────────
    t0 = time.perf_counter()
    logger.info("WHISPER: downloading audio incident_id=%s url=%s", incident_id, media_url)

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            dl = await client.get(media_url)
            dl.raise_for_status()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Failed to download audio: {exc}") from exc

    audio_bytes = dl.content
    content_type = dl.headers.get("content-type", "audio/mpeg")

    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise RuntimeError(
            f"Audio file too large: {len(audio_bytes) / 1e6:.1f} MB "
            f"(limit {MAX_AUDIO_BYTES / 1e6:.0f} MB)"
        )

    # Infer file extension from content-type for the multipart upload
    ext_map = {
        "audio/mpeg": "mp3",
        "audio/mp4": "mp4",
        "audio/wav": "wav",
        "audio/ogg": "ogg",
        "audio/flac": "flac",
        "audio/webm": "webm",
    }
    ext = ext_map.get(content_type.split(";")[0].strip(), "mp3")
    filename = f"audio_{incident_id}.{ext}"

    # ── Step 2: POST to Whisper ───────────────────────────────────────────────
    logger.info("WHISPER: sending to API model=%s language_hint=%s", WHISPER_MODEL, language_hint)

    form_data = {"model": WHISPER_MODEL}
    if language_hint:
        form_data["language"] = language_hint

    async with httpx.AsyncClient(timeout=120, headers={"Authorization": f"Bearer {WHISPER_API_KEY}"}) as client:
        try:
            response = await client.post(
                WHISPER_API_URL,
                data=form_data,
                files={"file": (filename, audio_bytes, content_type)},
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Whisper API call failed: {exc}") from exc

    payload = response.json()
    transcript_text: str = payload.get("text", "").strip()
    detected_language: str = payload.get("language", language_hint or "en")

    elapsed = time.perf_counter() - t0
    logger.info(
        "WHISPER: transcription complete words=%d language=%s latency_ms=%.0f",
        len(transcript_text.split()),
        detected_language,
        elapsed * 1000,
    )

    # model_version format follows RULES.md §3 convention
    model_version = f"{WHISPER_MODEL}@{response.headers.get('x-request-id', 'unknown')[:8]}"

    return TranscriptionResult(
        text=transcript_text,
        language=detected_language,
        model_version=model_version,
        duration_s=elapsed,
    )
