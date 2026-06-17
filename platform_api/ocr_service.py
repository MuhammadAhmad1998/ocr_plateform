from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from platform_api.models import Document, Engine, OcrJob
from platform_api.ocr_bridge import result_to_json, run_ocr, storage
from platform_api.webhooks import deliver_job_webhook


def process_ocr_job(db: Session, job_id: str) -> None:
    job = db.query(OcrJob).filter(OcrJob.id == uuid.UUID(job_id)).first()
    if not job:
        return

    job.status = "processing"
    db.commit()

    try:
        document = db.query(Document).filter(Document.id == job.document_id).first()
        engine = db.query(Engine).filter(Engine.id == job.engine_id).first() if job.engine_id else None
        content = storage.download(document.s3_key)
        adapter_type = engine.adapter_type if engine else "tesseract"
        start = datetime.now(UTC)
        result = run_ocr(content, document.content_type, adapter_type, document.filename)
        elapsed = (datetime.now(UTC) - start).total_seconds()
        result_key = storage.upload(
            result_to_json(result),
            "results",
            f"{job.id}.json",
            "application/json",
        )
        job.status = "completed"
        job.result_s3_key = result_key
        job.pages_processed = document.page_count or 1
        job.compute_seconds = elapsed
        job.completed_at = datetime.now(UTC)
        db.commit()
        deliver_job_webhook(db, job)
    except Exception as exc:
        job.status = "failed"
        job.error_message = str(exc)
        job.completed_at = datetime.now(UTC)
        db.commit()
        deliver_job_webhook(db, job)
        raise


def get_job_result(db: Session, job_id: uuid.UUID) -> dict | None:
    job = db.query(OcrJob).filter(OcrJob.id == job_id).first()
    if not job or not job.result_s3_key:
        return None
    raw = storage.download(job.result_s3_key)
    return json.loads(raw)
