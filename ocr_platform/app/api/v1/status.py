"""Public service status endpoint (no authentication)."""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import get_settings
from app.core.database import engine

logger = logging.getLogger(__name__)
router = APIRouter(tags=["status"])

_startup_time = time.time()


def _check_dependency(name: str, check_fn) -> bool:
    try:
        return not check_fn()
    except Exception as exc:
        logger.warning("Status check failed for %s: %s", name, exc)
        return True


@router.get("/status/")
def get_status():
    settings = get_settings()

    def _db_ok() -> bool:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True

    def _redis_ok() -> bool:
        import redis

        client = redis.from_url(settings.REDIS_URL)
        client.ping()
        return True

    degraded = {
        "database": _check_dependency("database", _db_ok),
        "redis": _check_dependency("redis", _redis_ok),
    }

    return {
        "version": "1.0.0",
        "uptime_seconds": round(time.time() - _startup_time),
        "models": {
            "vlm": settings.VLM_ENABLED,
            "paddle": settings.PADDLE_OCR_ENABLED,
            "got": settings.GOT_OCR_ENABLED,
            "qianfan": settings.QIANFAN_OCR_ENABLED,
            "infinity_parser": settings.INFINITY_PARSER_ENABLED,
        },
        "degraded": degraded,
    }
