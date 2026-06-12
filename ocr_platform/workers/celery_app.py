from celery import Celery

from app.core.config import get_settings
from app.core.exceptions import is_client_error

settings = get_settings()

celery_app = Celery(
    "ocr_platform",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
)


@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def process_ocr_job_task(self, job_id: str) -> dict:
    from app.core.database import SessionLocal
    from app.ocr_engine.service import process_ocr_job

    db = SessionLocal()
    try:
        process_ocr_job(db, job_id)
        return {"job_id": job_id, "status": "completed"}
    except Exception as exc:
        db.rollback()
        if is_client_error(exc):
            message = exc.message if hasattr(exc, "message") else str(exc)
            return {"job_id": job_id, "status": "failed", "error": message}
        raise self.retry(exc=exc) from exc
    finally:
        db.close()
