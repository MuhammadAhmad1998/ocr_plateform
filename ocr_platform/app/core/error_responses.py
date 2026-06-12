"""Standard API error response builders."""

from __future__ import annotations

from typing import Any

from app.core.exceptions import AppException


def build_error_body(
    *,
    code: str,
    message: str,
    request_id: str | None = None,
    details: dict[str, Any] | list[Any] | None = None,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "error": code,
        "message": message,
        "detail": message,
    }
    if request_id:
        body["request_id"] = request_id
    if details is not None:
        body["details"] = details
    return body


def build_app_exception_body(exc: AppException, request_id: str | None = None) -> dict[str, Any]:
    return build_error_body(
        code=exc.code,
        message=exc.message,
        request_id=request_id,
        details=exc.details,
    )
