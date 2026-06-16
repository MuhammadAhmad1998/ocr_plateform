"""V2 OCR job endpoints — envelope responses with prefixed job_ ids."""

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.advisor.models import Document
from app.api.v2.schemas import OcrJobCreateV2, V2Envelope
from app.api.v2.utils import envelope, parse_doc_id, parse_job_id, to_job_id
from app.core.database import get_db
from app.core.dependencies import get_current_user_or_api_key, require_api_key_scope
from app.core.exceptions import NotFoundError, QuotaExceededError
from app.core.idempotency import (
    check_idempotency,
    hash_request_body,
    normalize_idempotency_key,
    save_idempotency,
)
from app.ocr_engine.models import OcrJob
from app.ocr_engine.service import get_job_result, process_ocr_job
from app.registry.models import Tier
from app.registry.service import registry_service

router = APIRouter(prefix="/ocr/jobs", tags=["V2"])

OCR_JOBS_ENDPOINT = "POST /api/v2/ocr/jobs/"


def _quota_headers(user: User) -> dict[str, str]:
    sub = user.subscription
    if not sub:
        return {}
    return {
        "X-Quota-Used": str(sub.quota_used),
        "X-Quota-Limit": str(sub.quota_limit),
    }


def _job_data(job: OcrJob, db: Session) -> dict:
    result = None
    if job.status == "completed":
        result = get_job_result(db, job.id)
    return {
        "status": job.status,
        "job_type": job.job_type,
        "pages_processed": job.pages_processed,
        "result": result,
        "error_message": job.error_message,
    }


def _job_envelope(job: OcrJob, db: Session, *, request_id: str | None = None) -> dict:
    created_at = job.created_at.isoformat() if job.created_at else None
    return envelope(
        object_type="ocr_job",
        id=to_job_id(job.id),
        created_at=created_at,
        request_id=request_id,
        data=_job_data(job, db),
    )


@router.post("/", response_model=V2Envelope, status_code=status.HTTP_202_ACCEPTED)
def submit_ocr_job(
    data: OcrJobCreateV2,
    request: Request,
    user: User = Depends(get_current_user_or_api_key),
    db: Session = Depends(get_db),
):
    request_id = getattr(request.state, "request_id", None)
    idempotency_key = normalize_idempotency_key(request.headers.get("Idempotency-Key"))
    request_body = data.model_dump(exclude_none=True)
    request_hash = hash_request_body(request_body)

    if idempotency_key:
        replay = check_idempotency(
            db,
            user_id=user.id,
            endpoint=OCR_JOBS_ENDPOINT,
            key=idempotency_key,
            request_hash=request_hash,
        )
        if replay:
            body, status_code = replay
            return JSONResponse(
                content=body,
                status_code=status_code,
                headers=_quota_headers(user),
            )

    require_api_key_scope(request, "ocr:write")

    doc_uuid = parse_doc_id(data.document_id)
    doc = (
        db.query(Document)
        .filter(Document.id == doc_uuid, Document.user_id == user.id)
        .first()
    )
    if not doc:
        raise NotFoundError("Document not found")

    sub = user.subscription
    if sub and sub.quota_used >= sub.quota_limit:
        raise QuotaExceededError("Quota exceeded")

    tier_slug = data.tier_slug or "basic"
    if not data.tier_slug and sub and sub.tier_id:
        tier_obj = db.query(Tier).filter(Tier.id == sub.tier_id).first()
        if tier_obj:
            tier_slug = tier_obj.slug
    tier = registry_service.get_tier_by_slug(db, tier_slug)
    match = registry_service.select_engine_for_document(db, tier_slug, doc.fingerprint_json)

    job = OcrJob(
        user_id=user.id,
        document_id=doc.id,
        tier_id=tier.id if tier else None,
        engine_id=match.engine.id if match else None,
        job_type="production",
        status="queued",
        webhook_url=data.webhook_url,
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        from workers.celery_app import process_ocr_job_task

        process_ocr_job_task.delay(str(job.id))
    except Exception:
        process_ocr_job(db, str(job.id))
        db.refresh(job)

    if sub:
        sub.quota_used += doc.page_count or 1
        db.commit()

    response_body = _job_envelope(job, db, request_id=request_id)
    if idempotency_key:
        save_idempotency(
            db,
            user_id=user.id,
            endpoint=OCR_JOBS_ENDPOINT,
            key=idempotency_key,
            request_hash=request_hash,
            response_body=response_body,
            status_code=status.HTTP_202_ACCEPTED,
        )
    return JSONResponse(
        content=response_body,
        status_code=status.HTTP_202_ACCEPTED,
        headers=_quota_headers(user),
    )


@router.get("/{job_id}/", response_model=V2Envelope)
def get_ocr_job(
    job_id: str,
    request: Request,
    user: User = Depends(get_current_user_or_api_key),
    db: Session = Depends(get_db),
):
    job_uuid = parse_job_id(job_id)
    job = (
        db.query(OcrJob)
        .filter(OcrJob.id == job_uuid, OcrJob.user_id == user.id)
        .first()
    )
    if not job:
        raise NotFoundError("Job not found")
    require_api_key_scope(request, "ocr:read")
    request_id = getattr(request.state, "request_id", None)
    return _job_envelope(job, db, request_id=request_id)
