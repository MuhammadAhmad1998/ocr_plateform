import json
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.advisor.models import ChatSession, Document
from app.core.config import get_settings
from app.core.storage import storage
from app.ocr_engine.adapters.base import result_to_json, run_ocr
from app.ocr_engine.models import OcrJob, UsageEvent
from app.registry.models import Engine, Tier

settings = get_settings()


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
        engine_slug = engine.slug if engine else "tesseract"

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

        usage = UsageEvent(
            user_id=job.user_id,
            engine_id=job.engine_id,
            tier_id=job.tier_id,
            pages=job.pages_processed,
            compute_seconds=elapsed,
            event_type=job.job_type,
            metadata_json={"engine_slug": engine_slug},
        )
        db.add(usage)
        db.commit()
    except Exception as e:
        job.status = "failed"
        job.error_message = str(e)
        job.completed_at = datetime.now(UTC)
        db.commit()
        raise


def create_demo_job(db: Session, user_id: uuid.UUID, session: ChatSession) -> OcrJob:
    if session.demo_run_count >= settings.DEMO_RUNS_PER_SESSION:
        raise ValueError("Demo run limit reached for this session")

    if not session.document_id:
        raise ValueError("No document uploaded for session")

    tier = None
    engine = None
    if session.selected_engine_id:
        engine = db.query(Engine).filter(Engine.id == session.selected_engine_id).first()
    if session.recommendation_tier_id:
        tier = db.query(Tier).filter(Tier.id == session.recommendation_tier_id).first()
    if not engine and tier:
        from app.registry.service import registry_service
        doc = db.query(Document).filter(Document.id == session.document_id).first()
        match = registry_service.select_engine_for_document(db, tier.slug, doc.fingerprint_json if doc else {})
        if match:
            engine = match.engine

    if not engine:
        engine = db.query(Engine).filter(Engine.slug == "trocr-base").first()

    job = OcrJob(
        user_id=user_id,
        session_id=session.id,
        document_id=session.document_id,
        tier_id=tier.id if tier else (engine.tier_id if engine else None),
        engine_id=engine.id if engine else None,
        job_type="demo",
        status="queued",
    )
    db.add(job)
    session.demo_run_count += 1
    session.phase = "DEMO_HANDOFF"
    db.commit()
    db.refresh(job)
    return job


def get_job_result(db: Session, job_id: uuid.UUID) -> dict | None:
    job = db.query(OcrJob).filter(OcrJob.id == job_id).first()
    if not job or job.status != "completed" or not job.result_s3_key:
        return None
    data = storage.download(job.result_s3_key)
    return json.loads(data)
