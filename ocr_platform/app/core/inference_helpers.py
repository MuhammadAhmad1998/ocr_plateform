"""Shared helpers for ML service readiness and inference error mapping."""

from __future__ import annotations

import logging
from collections.abc import Callable

from app.core.config import get_settings
from app.core.exceptions import (
    AppException,
    BadRequestError,
    InferenceTimeoutError,
    InternalError,
    ServiceUnavailableError,
)
from app.core.uploads import validate_pdf_page_count

logger = logging.getLogger(__name__)
settings = get_settings()


def ensure_service_enabled(enabled: bool, service_name: str) -> None:
    if not enabled:
        raise ServiceUnavailableError(f"{service_name} service is disabled")


def ensure_model_loaded(load_fn: Callable[[], None]) -> None:
    try:
        load_fn()
    except RuntimeError as exc:
        raise ServiceUnavailableError(str(exc)) from exc


def ensure_model_service_ready(*, enabled: bool, service_name: str, load_fn: Callable[[], None]) -> None:
    ensure_service_enabled(enabled, service_name)
    ensure_model_loaded(load_fn)


def validate_pdf_images(images: list, *, max_pages: int) -> None:
    validate_pdf_page_count(len(images), max_pages)


def map_inference_error(exc: Exception, *, operation: str) -> AppException:
    if isinstance(exc, AppException):
        return exc
    if isinstance(exc, ValueError):
        return BadRequestError(str(exc))
    if isinstance(exc, RuntimeError):
        return ServiceUnavailableError(str(exc))
    if isinstance(exc, TimeoutError):
        return InferenceTimeoutError(f"{operation} timed out")
    logger.exception("%s failed", operation)
    if settings.DEBUG:
        return InternalError(f"{operation} failed: {exc}")
    return InternalError(f"{operation} failed")
