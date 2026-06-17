"""Outbound webhook delivery for OCR job lifecycle events."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging

import httpx
from sqlalchemy.orm import Session

from platform_api.models import OcrJob

logger = logging.getLogger(__name__)

SIGNATURE_HEADER = "X-OCR-Signature"
MAX_WEBHOOK_ATTEMPTS = 3


def build_job_payload(job: OcrJob) -> dict:
    event = "job.completed" if job.status == "completed" else "job.failed"
    return {
        "event": event,
        "job_id": str(job.id),
        "status": job.status,
        "job_type": job.job_type,
        "pages_processed": job.pages_processed,
        "error_message": job.error_message,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


def _signing_secret() -> str:
    return "dev-webhook-secret"


def sign_payload(payload_bytes: bytes) -> str:
    digest = hmac.new(_signing_secret().encode(), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def deliver_job_webhook(db: Session, job: OcrJob) -> bool:
    if not job.webhook_url:
        return False

    payload = build_job_payload(job)
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode()
    headers = {
        "Content-Type": "application/json",
        SIGNATURE_HEADER: sign_payload(payload_bytes),
    }

    for attempt in range(1, MAX_WEBHOOK_ATTEMPTS + 1):
        try:
            response = httpx.post(job.webhook_url, content=payload_bytes, headers=headers, timeout=10.0)
            response.raise_for_status()
            return True
        except Exception as exc:
            logger.warning(
                "Webhook delivery for job %s attempt %s failed: %s",
                job.id,
                attempt,
                exc,
            )
    return False
