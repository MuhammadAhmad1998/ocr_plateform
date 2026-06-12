import pytest
from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError
from starlette.requests import Request

from app.core.error_responses import build_app_exception_body, build_error_body
from app.core.exception_handlers import (
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.core.exceptions import (
    AppException,
    AuthenticationError,
    BadRequestError,
    ConflictError,
    ExternalServiceError,
    InferenceTimeoutError,
    InternalError,
    NotFoundError,
    PayloadTooLargeError,
    QuotaExceededError,
    RateLimitExceededError,
    ServiceUnavailableError,
    StorageError,
    ValidationError,
    is_client_error,
)


def _request() -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/test",
        "headers": [],
        "query_string": b"",
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
        "scheme": "http",
        "root_path": "",
    }
    request = Request(scope)
    request.state.request_id = "test-request-id"
    return request


@pytest.mark.parametrize(
    "exc,status,code",
    [
        (BadRequestError("bad"), 400, "BAD_REQUEST"),
        (AuthenticationError("auth"), 401, "AUTHENTICATION_ERROR"),
        (QuotaExceededError("quota"), 403, "QUOTA_EXCEEDED"),
        (NotFoundError("missing"), 404, "NOT_FOUND"),
        (ConflictError("conflict"), 409, "CONFLICT"),
        (PayloadTooLargeError("big"), 413, "PAYLOAD_TOO_LARGE"),
        (RateLimitExceededError("slow"), 429, "RATE_LIMIT_EXCEEDED"),
        (InternalError("boom"), 500, "INTERNAL_ERROR"),
        (ExternalServiceError("stripe"), 502, "EXTERNAL_SERVICE_ERROR"),
        (StorageError("s3"), 502, "STORAGE_ERROR"),
        (ServiceUnavailableError("down"), 503, "SERVICE_UNAVAILABLE"),
        (InferenceTimeoutError("slow"), 504, "INFERENCE_TIMEOUT"),
        (ValidationError("invalid"), 400, "VALIDATION_ERROR"),
    ],
)
def test_exception_status_and_code(exc: AppException, status: int, code: str):
    assert exc.status_code == status
    assert exc.code == code


def test_build_error_body_includes_request_id():
    body = build_error_body(code="NOT_FOUND", message="Missing", request_id="abc123")
    assert body["error"] == "NOT_FOUND"
    assert body["message"] == "Missing"
    assert body["detail"] == "Missing"
    assert body["request_id"] == "abc123"


def test_build_app_exception_body():
    body = build_app_exception_body(NotFoundError("Document not found"), "req-1")
    assert body["error"] == "NOT_FOUND"
    assert body["message"] == "Document not found"


@pytest.mark.asyncio
async def test_app_exception_handler():
    response = await app_exception_handler(_request(), NotFoundError("Job not found"))
    assert response.status_code == 404
    assert response.body
    payload = response.body.decode()
    assert "NOT_FOUND" in payload
    assert "Job not found" in payload
    assert "test-request-id" in payload


@pytest.mark.asyncio
async def test_http_exception_handler_normalizes_response():
    response = await http_exception_handler(_request(), HTTPException(status_code=418, detail="teapot"))
    assert response.status_code == 418
    payload = response.body.decode()
    assert "HTTP_ERROR" in payload
    assert "teapot" in payload


@pytest.mark.asyncio
async def test_validation_exception_handler():
    from pydantic import BaseModel, ValidationError as PydanticValidationError

    class Broken(BaseModel):
        email: str

    with pytest.raises(PydanticValidationError) as caught:
        Broken.model_validate({})

    response = await validation_exception_handler(
        _request(),
        RequestValidationError(caught.value.errors()),
    )
    assert response.status_code == 422
    payload = response.body.decode()
    assert "VALIDATION_ERROR" in payload


@pytest.mark.asyncio
async def test_unhandled_exception_handler_hides_details_when_not_debug(monkeypatch):
    monkeypatch.setenv("DEBUG", "false")
    get_settings = __import__("app.core.config", fromlist=["get_settings"]).get_settings
    get_settings.cache_clear()

    from app.core import exception_handlers

    monkeypatch.setattr(exception_handlers.settings, "DEBUG", False)

    response = await unhandled_exception_handler(_request(), RuntimeError("secret internals"))
    assert response.status_code == 500
    payload = response.body.decode()
    assert "secret internals" not in payload
    assert "unexpected error" in payload.lower()


def test_is_client_error():
    assert is_client_error(NotFoundError("x")) is True
    assert is_client_error(InternalError("x")) is False
    assert is_client_error(RuntimeError("x")) is False
