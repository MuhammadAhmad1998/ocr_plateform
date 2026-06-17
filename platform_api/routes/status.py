import logging
import time

from fastapi import APIRouter
from sqlalchemy import text

from platform_api.config import get_settings
from platform_api.database import engine
from platform_api.ocr_bridge import get_ocr_platform_settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["status"])
_startup = time.time()


@router.get("/status/")
def service_status():
    ocr_settings = get_ocr_platform_settings()
    degraded = {}
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        degraded["database"] = False
    except Exception as exc:
        logger.warning("DB check failed: %s", exc)
        degraded["database"] = True

    try:
        import redis

        client = redis.from_url(get_settings().REDIS_URL)
        client.ping()
        degraded["redis"] = False
    except Exception as exc:
        logger.warning("Redis check failed: %s", exc)
        degraded["redis"] = True

    return {
        "service": "ai_service_platform",
        "version": "1.0.0",
        "uptime_seconds": round(time.time() - _startup),
        "models": {
            "vlm": ocr_settings.VLM_ENABLED,
            "paddle": ocr_settings.PADDLE_OCR_ENABLED,
            "got": ocr_settings.GOT_OCR_ENABLED,
            "qianfan": ocr_settings.QIANFAN_OCR_ENABLED,
        },
        "degraded": degraded,
        "auth": "none",
    }
