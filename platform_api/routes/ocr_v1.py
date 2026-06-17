import uuid

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from platform_api.accounts import get_default_account
from platform_api.database import get_db
from platform_api.exceptions import NotFoundError
from platform_api.models import Account, Document, OcrJob
from platform_api.ocr_service import get_job_result, process_ocr_job
from platform_api.registry import registry
from platform_api.schemas import OcrJobCreate, OcrJobResponse

router = APIRouter(tags=["ocr"])


def _job_response(job: OcrJob, db: Session, *, request_id: str | None = None) -> OcrJobResponse:
    result = get_job_result(db, job.id) if job.status == "completed" else None
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


@router.post("/ocr/jobs/", response_model=OcrJobResponse, status_code=status.HTTP_202_ACCEPTED)
def submit_ocr_job(
    data: OcrJobCreate,
    request: Request,
    account: Account = Depends(get_default_account),
    db: Session = Depends(get_db),
):
    request_id = getattr(request.state, "request_id", None)

    doc = (
        db.query(Document)
        .filter(Document.id == uuid.UUID(data.document_id), Document.account_id == account.id)
        .first()
    )
    if not doc:
        raise NotFoundError("Document not found")

    tier_slug = data.tier_slug or "basic"
    tier = registry.get_tier_by_slug(db, tier_slug)
    match = registry.select_engine_for_document(db, tier_slug, doc.fingerprint_json)

    job = OcrJob(
        account_id=account.id,
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
        from workers.celery_app import process_ocr_job_task  # type: ignore

        process_ocr_job_task.delay(str(job.id))
    except Exception:
        process_ocr_job(db, str(job.id))
        db.refresh(job)

    response = _job_response(job, db, request_id=request_id)
    return JSONResponse(content=response.model_dump(), status_code=status.HTTP_202_ACCEPTED)


@router.get("/ocr/jobs/{job_id}/", response_model=OcrJobResponse)
def get_ocr_job(
    job_id: str,
    request: Request,
    account: Account = Depends(get_default_account),
    db: Session = Depends(get_db),
):
    job = (
        db.query(OcrJob)
        .filter(OcrJob.id == uuid.UUID(job_id), OcrJob.account_id == account.id)
        .first()
    )
    if not job:
        raise NotFoundError("Job not found")
    return _job_response(job, db, request_id=getattr(request.state, "request_id", None))
