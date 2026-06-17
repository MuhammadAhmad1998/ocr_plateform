from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from platform_api.error_responses import build_app_exception_body, build_error_body
from platform_api.exceptions import AppException, InternalError

logger = logging.getLogger(__name__)


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def register_exception_handlers(app: FastAPI) -> None:
    from platform_api.ocr_bridge import ensure_ocr_engine_path

    ensure_ocr_engine_path()
    from app.core.error_responses import build_app_exception_body as ocr_build_body
    from app.core.exceptions import AppException as OcrEngineAppException

    @app.exception_handler(OcrEngineAppException)
    async def ocr_engine_exception_handler(
        request: Request, exc: OcrEngineAppException
    ) -> JSONResponse:
        if exc.status_code >= 500:
            logger.exception("OcrEngineAppException [%s]: %s", exc.code, exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content=ocr_build_body(exc, _request_id(request)),
        )

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        if exc.status_code >= 500:
            logger.exception("AppException [%s]: %s", exc.code, exc.message)
        return JSONResponse(
            status_code=exc.status_code,
            content=build_app_exception_body(exc, _request_id(request)),
        )

    @app.exception_handler(HTTPException)
    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: Exception) -> JSONResponse:
        if isinstance(exc, RequestValidationError):
            return JSONResponse(
                status_code=422,
                content=build_error_body(
                    code="VALIDATION_ERROR",
                    message="Request validation failed",
                    request_id=_request_id(request),
                    details=exc.errors(),
                ),
            )
        assert isinstance(exc, HTTPException)
        detail = exc.detail
        message = detail if isinstance(detail, str) else "Request failed"
        return JSONResponse(
            status_code=exc.status_code,
            content=build_error_body(
                code="HTTP_ERROR",
                message=message,
                request_id=_request_id(request),
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error")
        internal = InternalError("Internal server error")
        return JSONResponse(
            status_code=500,
            content=build_app_exception_body(internal, _request_id(request)),
        )
