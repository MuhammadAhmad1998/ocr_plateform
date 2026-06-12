import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.advisor.models import ChatSession
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundError
from app.ocr_engine.models import OcrJob
from app.ocr_engine.schemas import DemoRunRequest, DemoRunResponse, OcrResultResponse
from app.ocr_engine.service import create_demo_job, get_job_result

try:
    from workers.celery_app import process_ocr_job_task
except ImportError:
    process_ocr_job_task = None

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/run/", response_model=DemoRunResponse, status_code=status.HTTP_202_ACCEPTED)
def run_demo(
    data: DemoRunRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = (
        db.query(ChatSession)
        .filter(ChatSession.id == uuid.UUID(data.session_id), ChatSession.user_id == user.id)
        .first()
    )
    if not session:
        raise NotFoundError("Session not found")

    job = create_demo_job(db, user.id, session)

    if process_ocr_job_task:
        try:
            process_ocr_job_task.delay(str(job.id))
        except Exception:
            from app.ocr_engine.service import process_ocr_job
            process_ocr_job(db, str(job.id))
    else:
        from app.ocr_engine.service import process_ocr_job
        process_ocr_job(db, str(job.id))

    return DemoRunResponse(job_id=str(job.id), status=job.status)


@router.get("/result/{job_id}/", response_model=OcrResultResponse)
def get_demo_result(
    job_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    job = (
        db.query(OcrJob)
        .filter(OcrJob.id == uuid.UUID(job_id), OcrJob.user_id == user.id)
        .first()
    )
    if not job:
        raise NotFoundError("Job not found")

    if job.status in ("queued", "processing"):
        return OcrResultResponse(job_id=str(job.id), status=job.status)

    if job.status == "failed":
        return OcrResultResponse(job_id=str(job.id), status="failed", error=job.error_message)

    result = get_job_result(db, job.id)
    if not result:
        return OcrResultResponse(job_id=str(job.id), status=job.status)

    return OcrResultResponse(
        job_id=str(job.id),
        status="completed",
        text=result.get("text"),
        layout=result.get("layout"),
        confidence=result.get("confidence"),
        timing_ms=result.get("timing_ms"),
    )
