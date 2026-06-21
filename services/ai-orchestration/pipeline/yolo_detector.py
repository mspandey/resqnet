"""
AI Orchestration Service — pipeline/yolo_detector.py

Stub for YOLO-based image/video object detection.
Extracts visual severity signals from media attachments:
  - Smoke / fire detection
  - Structural damage estimation (collapsed buildings, debris)
  - Crowd density (for mass-casualty triage)
  - Flood depth estimation (via reference objects)

Production path:
  1. Download image/video frame(s) from raw_media_url
  2. Run YOLO inference (ultralytics or ONNX runtime)
  3. Return DetectionResult with detected classes, confidence, and severity hint

RULES.md §3: model_version must be recorded for every media processing step.
Stub mode: returns a low-confidence default when no model weights configured.
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass, field

import httpx

logger = logging.getLogger(__name__)

YOLO_MODEL_PATH   = os.getenv("YOLO_MODEL_PATH", "")       # Path to .pt or .onnx weights
YOLO_MODEL_NAME   = os.getenv("YOLO_MODEL_NAME", "yolov8n-disaster")
YOLO_CONFIDENCE   = float(os.getenv("YOLO_CONFIDENCE_THRESHOLD", "0.40"))
YOLO_SERVE_URL    = os.getenv("YOLO_SERVE_URL", "")         # Optional: Triton / TorchServe endpoint

# YOLO class labels relevant to disaster response
DISASTER_CLASSES = {
    "smoke":              0.9,   # severity weight → adds to severity score
    "fire":               1.0,
    "flood_water":        0.8,
    "collapsed_building": 1.0,
    "debris":             0.7,
    "crowd_large":        0.6,
    "vehicle_overturned": 0.5,
    "injured_person":     0.85,
}


@dataclass
class DetectionResult:
    """Result of YOLO inference on a media file."""

    detected_classes: list[dict]   = field(default_factory=list)
    severity_hint: float           = 0.0    # 0.0–1.0; blended with LLM score in classifier
    model_version: str             = ""
    is_stub: bool                  = False

    @property
    def top_classes(self) -> list[str]:
        return [d["class"] for d in self.detected_classes if d["confidence"] >= YOLO_CONFIDENCE]

    def __repr__(self) -> str:
        return (
            f"DetectionResult(classes={self.top_classes}, "
            f"severity_hint={self.severity_hint:.2f}, model={self.model_version!r})"
        )


async def detect_objects(
    media_url: str,
    *,
    incident_id: str = "unknown",
) -> DetectionResult:
    """
    Run YOLO object detection on an image or video thumbnail.

    Args:
        media_url:   Publicly-readable URL to the image (jpg/png/webp) or video (mp4).
        incident_id: For logging correlation.

    Returns:
        DetectionResult with `.detected_classes`, `.severity_hint`, `.model_version`.

    Raises:
        RuntimeError if download or inference fails.
    """
    # ── Stub: no model weights configured ────────────────────────────────────
    if not YOLO_MODEL_PATH and not YOLO_SERVE_URL:
        logger.warning(
            "YOLO: no model configured (set YOLO_MODEL_PATH or YOLO_SERVE_URL) "
            "— returning stub (incident_id=%s)", incident_id
        )
        return DetectionResult(
            detected_classes=[
                {"class": "unknown", "confidence": 0.0, "bbox": None}
            ],
            severity_hint=0.0,
            model_version=f"{YOLO_MODEL_NAME}@stub",
            is_stub=True,
        )

    # ── Step 1: Download image ────────────────────────────────────────────────
    t0 = time.perf_counter()
    logger.info("YOLO: downloading media incident_id=%s url=%s", incident_id, media_url)

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            dl = await client.get(media_url)
            dl.raise_for_status()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Failed to download media: {exc}") from exc

    image_bytes = dl.content

    # ── Step 2a: Remote inference (TorchServe / Triton) ──────────────────────
    if YOLO_SERVE_URL:
        return await _remote_inference(image_bytes, t0, incident_id)

    # ── Step 2b: Local inference (ultralytics) ────────────────────────────────
    return _local_inference(image_bytes, t0, incident_id)


async def _remote_inference(image_bytes: bytes, t0: float, incident_id: str) -> DetectionResult:
    """POST to a TorchServe / Triton endpoint."""
    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.post(
                f"{YOLO_SERVE_URL}/predictions/{YOLO_MODEL_NAME}",
                content=image_bytes,
                headers={"Content-Type": "application/octet-stream"},
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"YOLO remote inference failed: {exc}") from exc

    payload = resp.json()
    return _parse_inference_result(payload, t0, incident_id, source="remote")


def _local_inference(image_bytes: bytes, t0: float, incident_id: str) -> DetectionResult:
    """Run ultralytics YOLO locally (requires GPU/CPU torch install)."""
    try:
        from ultralytics import YOLO  # type: ignore[import-not-found]
        import tempfile, pathlib

        model = YOLO(YOLO_MODEL_PATH)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            tmp.write(image_bytes)
            tmp_path = pathlib.Path(tmp.name)

        results = model.predict(str(tmp_path), conf=YOLO_CONFIDENCE, verbose=False)
        tmp_path.unlink(missing_ok=True)

        detections = []
        for r in results:
            for box in r.boxes:
                cls_name = model.names[int(box.cls[0])]
                detections.append({
                    "class": cls_name,
                    "confidence": float(box.conf[0]),
                    "bbox": box.xyxy[0].tolist(),
                })

        payload = {"detections": detections}
        return _parse_inference_result(payload, t0, incident_id, source="local")

    except ImportError:
        logger.error(
            "YOLO: 'ultralytics' not installed. "
            "Add 'ultralytics' to requirements.txt or configure YOLO_SERVE_URL."
        )
        raise RuntimeError("YOLO local inference unavailable — ultralytics not installed")


def _parse_inference_result(
    payload: dict,
    t0: float,
    incident_id: str,
    source: str,
) -> DetectionResult:
    """Common result parser for both local and remote inference."""
    elapsed = time.perf_counter() - t0
    detections: list[dict] = payload.get("detections", [])

    # Compute blended severity hint from detected disaster-class weights
    severity_hint = 0.0
    for det in detections:
        cls = det.get("class", "")
        conf = det.get("confidence", 0.0)
        weight = DISASTER_CLASSES.get(cls, 0.0)
        severity_hint = max(severity_hint, weight * conf)

    top = [d["class"] for d in detections if d.get("confidence", 0) >= YOLO_CONFIDENCE]
    logger.info(
        "YOLO: inference complete incident_id=%s source=%s classes=%s "
        "severity_hint=%.2f latency_ms=%.0f",
        incident_id, source, top, severity_hint, elapsed * 1000,
    )

    model_version = f"{YOLO_MODEL_NAME}@{source}"
    return DetectionResult(
        detected_classes=detections,
        severity_hint=severity_hint,
        model_version=model_version,
        is_stub=False,
    )
