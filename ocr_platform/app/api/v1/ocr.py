import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Body, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.accounts.models import ApiKey, User
from app.advisor.models import Document
from app.billing.service import generate_api_key
from app.core.database import get_db
from app.core.dependencies import (
    DEFAULT_API_KEY_SCOPES,
    VALID_API_KEY_SCOPES,
    get_current_user,
    get_current_user_or_api_key,
    require_api_key_scope,
)
from app.core.exceptions import NotFoundError, QuotaExceededError, ValidationError
from app.core.idempotency import (
    check_idempotency,
    hash_request_body,
    normalize_idempotency_key,
    save_idempotency,
)
from app.ocr_engine.models import OcrJob, UsageEvent
from app.ocr_engine.schemas import OcrJobCreate, OcrJobResponse
from app.ocr_engine.service import get_job_result, process_ocr_job
from app.registry.models import Tier
from app.registry.service import registry_service

router = APIRouter(tags=["ocr", "dashboard"])

OCR_JOBS_ENDPOINT = "POST /api/v1/ocr/jobs/"


@router.post("/ocr/jobs/", response_model=OcrJobResponse, status_code=status.HTTP_202_ACCEPTED)
def submit_ocr_job(
    data: OcrJobCreate,
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

    doc = (
        db.query(Document)
        .filter(Document.id == uuid.UUID(data.document_id), Document.user_id == user.id)
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

    response = _job_response(job, db, request_id=request_id)
    if idempotency_key:
        save_idempotency(
            db,
            user_id=user.id,
            endpoint=OCR_JOBS_ENDPOINT,
            key=idempotency_key,
            request_hash=request_hash,
            response_body=response.model_dump(),
            status_code=status.HTTP_202_ACCEPTED,
        )
    return JSONResponse(
        content=response.model_dump(),
        status_code=status.HTTP_202_ACCEPTED,
        headers=_quota_headers(user),
    )


@router.get("/ocr/jobs/{job_id}/", response_model=OcrJobResponse)
def get_ocr_job(
    job_id: str,
    request: Request,
    user: User = Depends(get_current_user_or_api_key),
    db: Session = Depends(get_db),
):
    job = (
        db.query(OcrJob)
        .filter(OcrJob.id == uuid.UUID(job_id), OcrJob.user_id == user.id)
        .first()
    )
    if not job:
        raise NotFoundError("Job not found")
    require_api_key_scope(request, "ocr:read")
    request_id = getattr(request.state, "request_id", None)
    return _job_response(job, db, request_id=request_id)


@router.get("/dashboard/usage/")
def get_usage(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = user.subscription
    tier_slug = tier_name = None
    if sub and sub.tier_id:
        tier = db.query(Tier).filter(Tier.id == sub.tier_id).first()
        if tier:
            tier_slug = tier.slug
            tier_name = tier.public_name

    month_start = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    jobs_count = (
        db.query(func.count(OcrJob.id))
        .filter(OcrJob.user_id == user.id, OcrJob.created_at >= month_start)
        .scalar()
    )

    return {
        "quota_used": sub.quota_used if sub else 0,
        "quota_limit": sub.quota_limit if sub else 50,
        "tier_slug": tier_slug,
        "tier_name": tier_name,
        "jobs_this_month": jobs_count or 0,
    }


@router.get("/dashboard/jobs/")
def job_history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    jobs = (
        db.query(OcrJob)
        .filter(OcrJob.user_id == user.id)
        .order_by(OcrJob.created_at.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": str(j.id),
            "status": j.status,
            "job_type": j.job_type,
            "pages_processed": j.pages_processed,
            "created_at": j.created_at.isoformat(),
            "completed_at": j.completed_at.isoformat() if j.completed_at else None,
        }
        for j in jobs
    ]


@router.get("/dashboard/api-keys/")
def list_api_keys(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    keys = db.query(ApiKey).filter(ApiKey.user_id == user.id).all()
    return [
        {
            "id": str(k.id),
            "name": k.name,
            "key_prefix": k.key_prefix,
            "scopes": k.scopes or list(DEFAULT_API_KEY_SCOPES),
            "is_active": k.is_active,
            "created_at": k.created_at.isoformat(),
        }
        for k in keys
    ]


def _normalize_api_key_scopes(scopes: list[str] | None) -> list[str]:
    if scopes is None:
        return list(DEFAULT_API_KEY_SCOPES)
    invalid = set(scopes) - VALID_API_KEY_SCOPES
    if invalid:
        raise ValidationError(f"Invalid scopes: {', '.join(sorted(invalid))}")
    return scopes


@router.post("/dashboard/api-keys/", status_code=status.HTTP_201_CREATED)
def create_api_key(
    name: str = "Default",
    scopes: list[str] | None = Body(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    normalized_scopes = _normalize_api_key_scopes(scopes)
    raw, key_hash, prefix = generate_api_key()
    api_key = ApiKey(
        user_id=user.id,
        key_hash=key_hash,
        key_prefix=prefix,
        name=name,
        scopes=normalized_scopes,
    )
    db.add(api_key)
    db.commit()
    return {
        "id": str(api_key.id),
        "name": api_key.name,
        "key_prefix": prefix,
        "key": raw,
        "scopes": normalized_scopes,
        "is_active": True,
        "created_at": api_key.created_at.isoformat(),
    }


@router.post("/dashboard/api-keys/{key_id}/revoke/")
def revoke_api_key(
    key_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    api_key = (
        db.query(ApiKey)
        .filter(ApiKey.id == uuid.UUID(key_id), ApiKey.user_id == user.id)
        .first()
    )
    if not api_key:
        raise NotFoundError("API key not found")
    api_key.is_active = False
    db.commit()
    return {
        "id": str(api_key.id),
        "is_active": False,
    }


def _quota_headers(user: User) -> dict[str, str]:
    sub = user.subscription
    if not sub:
        return {}
    return {
        "X-Quota-Used": str(sub.quota_used),
        "X-Quota-Limit": str(sub.quota_limit),
    }


def _job_response(job: OcrJob, db: Session, *, request_id: str | None = None) -> OcrJobResponse:
    result = None
    if job.status == "completed":
        result = get_job_result(db, job.id)
    return OcrJobResponse(
        id=str(job.id),
        status=job.status,
        job_type=job.job_type,
        pages_processed=job.pages_processed,
        result=result,
        error_message=job.error_message,
        request_id=request_id,
        created_at=job.created_at.isoformat() if job.created_at else None,
    )
