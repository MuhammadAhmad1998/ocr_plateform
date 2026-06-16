"""Application-wide exception hierarchy for production error handling."""

from __future__ import annotations

from typing import Any


class AppException(Exception):
    """Base exception mapped to a structured HTTP error response."""

    status_code: int = 500
    code: str = "INTERNAL_ERROR"
    retryable: bool = False

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


class RateLimitExceededError(AppException):
    status_code = 429
    code = "RATE_LIMIT_EXCEEDED"
    retryable = True


class InternalError(AppException):
    status_code = 500
    code = "INTERNAL_ERROR"


class ExternalServiceError(AppException):
    status_code = 502
    code = "EXTERNAL_SERVICE_ERROR"


class ServiceUnavailableError(AppException):
    status_code = 503
    code = "SERVICE_UNAVAILABLE"
    retryable = True


class InferenceTimeoutError(AppException):
    status_code = 504
    code = "INFERENCE_TIMEOUT"
    retryable = True


class StorageError(AppException):
    status_code = 502
    code = "STORAGE_ERROR"


class QuotaExceededError(AuthorizationError):
    code = "QUOTA_EXCEEDED"


class ValidationError(BadRequestError):
    code = "VALIDATION_ERROR"


def is_client_error(exc: BaseException) -> bool:
    """Return True when the error should not be retried by background workers."""
    return isinstance(exc, AppException) and exc.status_code < 500
