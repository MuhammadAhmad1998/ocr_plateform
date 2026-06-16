"""Outbound webhook delivery for OCR job lifecycle events."""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import uuid

import httpx
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.ocr_engine.models import OcrJob
from app.webhooks.models import WebhookDelivery

logger = logging.getLogger(__name__)
settings = get_settings()

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


def sign_payload(payload_bytes: bytes) -> str:
    digest = hmac.new(settings.SECRET_KEY.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def verify_signature(payload_bytes: bytes, signature: str, secret: str | None = None) -> bool:
    key = (secret or settings.SECRET_KEY).encode()
    expected = hmac.new(key, payload_bytes, hashlib.sha256).hexdigest()
    provided = signature.removeprefix("sha256=").strip()
    return hmac.compare_digest(expected, provided)


def enqueue_job_webhook(db: Session, job: OcrJob) -> WebhookDelivery | None:
    if not job.webhook_url:
        return None

    payload = build_job_payload(job)
    delivery = WebhookDelivery(
        job_id=job.id,
        url=job.webhook_url,
        payload=payload,
        status="pending",
    )
    db.add(delivery)
    db.commit()
    db.refresh(delivery)

    try:
        from workers.celery_app import deliver_webhook_task

        deliver_webhook_task.delay(str(delivery.id))
    except Exception:
        deliver_webhook(db, str(delivery.id))

    return delivery


def deliver_webhook(db: Session, delivery_id: str) -> bool:
    delivery = db.query(WebhookDelivery).filter(WebhookDelivery.id == uuid.UUID(delivery_id)).first()
    if not delivery or delivery.status == "delivered":
        return delivery is not None and delivery.status == "delivered"

    payload_bytes = json.dumps(delivery.payload, separators=(",", ":")).encode()
    headers = {
        "Content-Type": "application/json",
        SIGNATURE_HEADER: sign_payload(payload_bytes),
    }

    delivery.attempts += 1
    try:
        response = httpx.post(delivery.url, content=payload_bytes, headers=headers, timeout=10.0)
        response.raise_for_status()
        delivery.status = "delivered"
        delivery.last_error = None
        db.commit()
        return True
    except Exception as exc:
        delivery.last_error = str(exc)
        if delivery.attempts >= MAX_WEBHOOK_ATTEMPTS:
            delivery.status = "failed"
        db.commit()
        logger.warning(
            "Webhook delivery %s attempt %s failed: %s",
            delivery_id,
            delivery.attempts,
            exc,
        )
        return False
