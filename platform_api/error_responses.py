from __future__ import annotations

from typing import Any

from platform_api.exceptions import AppException


def build_error_body(
    *,
    code: str,
    message: str,
    request_id: str | None = None,
    details: dict[str, Any] | list | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "error": code,
        "message": message,
        "detail": message,
        "request_id": request_id,
        "details": details,
    }
    return body


def build_app_exception_body(exc: AppException, request_id: str | None) -> dict[str, Any]:
    return build_error_body(
        code=exc.code,
        message=exc.message,
        request_id=request_id,
        details=exc.details,
    )
