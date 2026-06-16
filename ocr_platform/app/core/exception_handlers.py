"""Global FastAPI exception handlers."""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import get_settings
from app.core.error_responses import build_app_exception_body, build_error_body
from app.core.exceptions import AppException, InternalError

logger = logging.getLogger(__name__)
settings = get_settings()


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _json_response(status_code: int, body: dict) -> JSONResponse:
    return JSONResponse(status_code=status_code, content=body)


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    if exc.status_code >= 500:
        logger.exception(
            "AppException [%s] request_id=%s: %s",
            exc.code,
            _request_id(request),
            exc.message,
        )
    return _json_response(
        exc.status_code,
        build_app_exception_body(exc, _request_id(request)),
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    message = detail if isinstance(detail, str) else "Request failed"
    details = detail if isinstance(detail, (list, dict)) and not isinstance(detail, str) else None
    if details is None and not isinstance(detail, str):
        message = "Request failed"
        details = detail

    code = "VALIDATION_ERROR" if exc.status_code == 422 else "HTTP_ERROR"
    return _json_response(
        exc.status_code,
        build_error_body(
            code=code,
            message=message,
            request_id=_request_id(request),
            details=details if isinstance(details, (dict, list)) else None,
        ),
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return _json_response(
        422,
        build_error_body(
            code="VALIDATION_ERROR",
            message="Request validation failed",
            request_id=_request_id(request),
            details=exc.errors(),
        ),
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception request_id=%s", _request_id(request))
    internal = InternalError(str(exc)) if settings.DEBUG else InternalError("An unexpected error occurred")
    return _json_response(
        internal.status_code,
        build_app_exception_body(internal, _request_id(request)),
    )


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(AppException, app_exception_handler)
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
