from __future__ import annotations

from typing import Any


class AppException(Exception):
    status_code: int = 500
    code: str = "INTERNAL_ERROR"

    def __init__(self, message: str, *, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class BadRequestError(AppException):
    status_code = 400
    code = "BAD_REQUEST"


class AuthenticationError(AppException):
    status_code = 401
    code = "AUTHENTICATION_ERROR"


class AuthorizationError(AppException):
    status_code = 403
    code = "AUTHORIZATION_ERROR"


class NotFoundError(AppException):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(AppException):
    status_code = 409
    code = "CONFLICT"


class PayloadTooLargeError(AppException):
    status_code = 413
    code = "PAYLOAD_TOO_LARGE"


class QuotaExceededError(AppException):
    status_code = 403
    code = "QUOTA_EXCEEDED"


class ValidationError(AppException):
    status_code = 422
    code = "VALIDATION_ERROR"


class InternalError(AppException):
    status_code = 500
    code = "INTERNAL_ERROR"
