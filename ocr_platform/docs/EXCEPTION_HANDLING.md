# Exception Handling & Error Response Specification

Backend reference for the Unified OCR Platform API error system.  
All API errors return a **consistent JSON body** with machine-readable `error` codes and human-readable `message` text.

---

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Standard Error Response Schema](#standard-error-response-schema)
4. [Request Tracing](#request-tracing)
5. [Exception Class Reference](#exception-class-reference)
6. [Response Examples by Status Code](#response-examples-by-status-code)
7. [Endpoint Error Mapping](#endpoint-error-mapping)
8. [Shared Validation Helpers](#shared-validation-helpers)
9. [Inference / ML Service Errors](#inference--ml-service-errors)
10. [Background Jobs (Celery)](#background-jobs-celery)
11. [Developer Guidelines](#developer-guidelines)
12. [Adding a New Exception](#adding-a-new-exception)
13. [Running Tests](#running-tests)

---

## Overview

```
Client Request
    │
    ▼
RequestIdMiddleware          → sets X-Request-ID header + request.state.request_id
    │
    ▼
API Route / Dependency       → raises AppException subclass (never raw HTTPException in routes)
    │
    ▼
Global Exception Handler     → converts to JSON response
    │
    ▼
Client receives structured error body
```

**Rules:**

- Routes and dependencies raise **`AppException` subclasses** from `app/core/exceptions.py`.
- Services raise domain exceptions — **never** `HTTPException`.
- `HTTPException` is only normalized by the global handler (legacy / third-party code).
- Unhandled exceptions return **500**; internal details are hidden when `DEBUG=false`.

---

## File Structure

| File | Purpose |
|------|---------|
| `app/core/exceptions.py` | All custom exception classes |
| `app/core/error_responses.py` | `build_error_body()` / `build_app_exception_body()` |
| `app/core/exception_handlers.py` | Global FastAPI handlers registered in `main.py` |
| `app/core/middleware.py` | `RequestIdMiddleware` — `X-Request-ID` on every response |
| `app/core/uploads.py` | Shared upload/file validation (raises 400 / 413) |
| `app/core/inference_helpers.py` | ML service readiness + safe inference error mapping |
| `app/main.py` | `register_exception_handlers(app)` + middleware registration |

---

## Standard Error Response Schema

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `error` | `string` | Yes | Machine-readable error code (e.g. `NOT_FOUND`) |
| `message` | `string` | Yes | Human-readable error description |
| `detail` | `string` | Yes | Same as `message` (kept for FastAPI / frontend backward compatibility) |
| `request_id` | `string` | When available | Correlates logs and client errors |
| `details` | `object \| array` | Optional | Extra context (validation errors, field-level info) |

### Minimal shape

```json
{
  "error": "NOT_FOUND",
  "message": "Document not found",
  "detail": "Document not found",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01"
}
```

### With optional `details`

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "detail": "Request validation failed",
  "request_id": "a1b2c3d4e5f6789012345678abcdef01",
  "details": [
    {
      "type": "string_too_short",
      "loc": ["body", "password"],
      "msg": "String should have at least 8 characters",
      "input": "short"
    }
  ]
}
```

---

## Request Tracing

Every response includes an `X-Request-ID` header.

- If the client sends `X-Request-ID`, that value is reused.
- Otherwise a new UUID hex is generated.
- The same value is echoed in the JSON body as `request_id`.

**Example request:**

```http
GET /api/v1/auth/me/ HTTP/1.1
Authorization: Bearer <token>
X-Request-ID: my-trace-id-123
```

**Example response headers:**

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
X-Request-ID: my-trace-id-123
```

---

## Exception Class Reference

All exceptions inherit from `AppException` in `app/core/exceptions.py`.

| Exception Class | HTTP Status | `error` Code | Retryable (Celery) | When to Use |
|-----------------|-------------|--------------|--------------------|-------------|
| `BadRequestError` | 400 | `BAD_REQUEST` | No | Invalid input, wrong file type, business rule violation |
| `ValidationError` | 400 | `VALIDATION_ERROR` | No | Manual validation failures (e.g. bad JSON payload) |
| `AuthenticationError` | 401 | `AUTHENTICATION_ERROR` | No | Missing/invalid token, bad login, inactive account |
| `AuthorizationError` | 403 | `AUTHORIZATION_ERROR` | No | Authenticated but not permitted |
| `QuotaExceededError` | 403 | `QUOTA_EXCEEDED` | No | OCR quota limit reached |
| `NotFoundError` | 404 | `NOT_FOUND` | No | Resource does not exist |
| `ConflictError` | 409 | `CONFLICT` | No | Duplicate resource or state conflict |
| `PayloadTooLargeError` | 413 | `PAYLOAD_TOO_LARGE` | No | Upload exceeds `MAX_UPLOAD_SIZE_MB` |
| `RateLimitExceededError` | 429 | `RATE_LIMIT_EXCEEDED` | Yes | Rate limit hit (reserved for future middleware) |
| `InternalError` | 500 | `INTERNAL_ERROR` | Yes | Unexpected server failure |
| `ExternalServiceError` | 502 | `EXTERNAL_SERVICE_ERROR` | Yes | Stripe or other external API failure |
| `StorageError` | 502 | `STORAGE_ERROR` | Yes | S3 / storage backend failure |
| `ServiceUnavailableError` | 503 | `SERVICE_UNAVAILABLE` | Yes | ML model disabled or failed to load |
| `InferenceTimeoutError` | 504 | `INFERENCE_TIMEOUT` | Yes | Inference exceeded time limit |

### How to raise

```python
from app.core.exceptions import NotFoundError, BadRequestError

# Simple message
raise NotFoundError("Document not found")

# With structured details (optional)
raise BadRequestError(
    "Invalid document state",
    details={"document_id": str(doc.id), "status": doc.status},
)
```

### Client vs server errors

```python
from app.core.exceptions import is_client_error

# Returns True for status_code < 500
# Used by Celery to skip retries on 4xx errors
is_client_error(exc)  # True for NotFoundError, False for InternalError
```

---

## Response Examples by Status Code

### 400 — Bad Request

**Trigger:** Invalid file type, missing filename, wrong OCR task, demo limit, invalid tier.

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json
X-Request-ID: abc123
```

```json
{
  "error": "BAD_REQUEST",
  "message": "Only PDF, PNG, JPG allowed",
  "detail": "Only PDF, PNG, JPG allowed",
  "request_id": "abc123"
}
```

**Other common messages:**

| Message | Source |
|---------|--------|
| `"No filename provided"` | Upload validation |
| `"Demo run limit reached for this session"` | `ocr_engine/service.py` |
| `"No document uploaded for session"` | `ocr_engine/service.py` |
| `"Invalid tier"` | `billing/service.py` |
| `"PDF contains no pages"` | PDF validation |
| `"Use POST /vlm/pdf/analyze/ for PDF uploads"` | Image-only endpoint |

---

### 401 — Authentication Error

**Trigger:** Missing Bearer token, expired/invalid JWT, wrong login credentials.

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
X-Request-ID: abc123
```

```json
{
  "error": "AUTHENTICATION_ERROR",
  "message": "Not authenticated",
  "detail": "Not authenticated",
  "request_id": "abc123"
}
```

**All 401 messages:**

| Message | Endpoint / Layer |
|---------|------------------|
| `"Not authenticated"` | `get_current_user` — no `Authorization` header |
| `"Invalid token"` | `get_current_user` — bad access token |
| `"User not found"` | `get_current_user` or `/auth/refresh/` |
| `"Account is inactive"` | `get_current_user` — `user.is_active=False` |
| `"Invalid credentials"` | `POST /auth/login/` |
| `"Invalid refresh token"` | `POST /auth/refresh/` |

---

### 403 — Quota Exceeded

**Trigger:** User has used all pages in their subscription quota.

```http
HTTP/1.1 403 Forbidden
Content-Type: application/json
X-Request-ID: abc123
```

```json
{
  "error": "QUOTA_EXCEEDED",
  "message": "Quota exceeded",
  "detail": "Quota exceeded",
  "request_id": "abc123"
}
```

---

### 404 — Not Found

**Trigger:** Document, job, session, model, or storage file not found.

```http
HTTP/1.1 404 Not Found
Content-Type: application/json
X-Request-ID: abc123
```

```json
{
  "error": "NOT_FOUND",
  "message": "Session not found",
  "detail": "Session not found",
  "request_id": "abc123"
}
```

**Other common messages:**

| Message | Endpoint |
|---------|----------|
| `"Document not found"` | `/advisor/session/`, `/ocr/jobs/` |
| `"Job not found"` | `/ocr/jobs/{id}/`, `/demo/result/{id}/` |
| `"Session not found"` | `/advisor/`, `/demo/run/` |
| `"Model 'trocr-xyz' not found"` | `/testing/run/` |
| `"File not found: uploads/..."` | `storage.download()` |

---

### 409 — Conflict

**Trigger:** Duplicate registration or session state conflict.

```http
HTTP/1.1 409 Conflict
Content-Type: application/json
X-Request-ID: abc123
```

```json
{
  "error": "CONFLICT",
  "message": "Email already registered",
  "detail": "Email already registered",
  "request_id": "abc123"
}
```

| Message | Endpoint |
|---------|----------|
| `"Email already registered"` | `POST /auth/register/` |
| `"Session already has a document"` | `POST /advisor/upload/` |

---

### 413 — Payload Too Large

**Trigger:** Uploaded file exceeds `MAX_UPLOAD_SIZE_MB` (default: 10 MB).

```http
HTTP/1.1 413 Payload Too Large
Content-Type: application/json
X-Request-ID: abc123
```

```json
{
  "error": "PAYLOAD_TOO_LARGE",
  "message": "File exceeds 10MB limit",
  "detail": "File exceeds 10MB limit",
  "request_id": "abc123"
}
```

---

### 422 — Validation Error (Pydantic / FastAPI)

**Trigger:** Invalid request body, query params, or form fields (automatic).

**Example request that triggers 422:**

```http
POST /api/v1/auth/register/ HTTP/1.1
Content-Type: application/json

{
  "email": "not-an-email",
  "password": "short"
}
```

**Response:**

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json
X-Request-ID: abc123
```

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "detail": "Request validation failed",
  "request_id": "abc123",
  "details": [
    {
      "type": "value_error",
      "loc": ["body", "email"],
      "msg": "value is not a valid email address: An email address must have an @-sign.",
      "input": "not-an-email"
    },
    {
      "type": "string_too_short",
      "loc": ["body", "password"],
      "msg": "String should have at least 8 characters",
      "input": "short"
    }
  ]
}
```

---

### 429 — Rate Limit Exceeded (reserved)

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
X-Request-ID: abc123
```

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests. Please try again later.",
  "detail": "Too many requests. Please try again later.",
  "request_id": "abc123"
}
```

---

### 500 — Internal Server Error

**Production (`DEBUG=false`):**

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
X-Request-ID: abc123
```

```json
{
  "error": "INTERNAL_ERROR",
  "message": "An unexpected error occurred",
  "detail": "An unexpected error occurred",
  "request_id": "abc123"
}
```

**Development (`DEBUG=true`):**

```json
{
  "error": "INTERNAL_ERROR",
  "message": "VLM inference failed: CUDA out of memory",
  "detail": "VLM inference failed: CUDA out of memory",
  "request_id": "abc123"
}
```

> Internal exception details are **never** exposed in production.

---

### 502 — External Service / Storage Error

**Stripe checkout failure:**

```json
{
  "error": "EXTERNAL_SERVICE_ERROR",
  "message": "Payment provider is temporarily unavailable",
  "detail": "Payment provider is temporarily unavailable",
  "request_id": "abc123"
}
```

**S3 download failure:**

```json
{
  "error": "STORAGE_ERROR",
  "message": "Failed to download file from storage",
  "detail": "Failed to download file from storage",
  "request_id": "abc123"
}
```

---

### 503 — Service Unavailable

**Trigger:** VLM / PaddleOCR / GOT-OCR / Qianfan-OCR disabled or model not loaded.

```http
HTTP/1.1 503 Service Unavailable
Content-Type: application/json
X-Request-ID: abc123
```

```json
{
  "error": "SERVICE_UNAVAILABLE",
  "message": "VLM service is disabled",
  "detail": "VLM service is disabled",
  "request_id": "abc123"
}
```

---

### 504 — Inference Timeout

```json
{
  "error": "INFERENCE_TIMEOUT",
  "message": "VLM inference timed out",
  "detail": "VLM inference timed out",
  "request_id": "abc123"
}
```

---

## Endpoint Error Mapping

### Auth — `/api/v1/auth/`

| Method | Path | Status | `error` | Message |
|--------|------|--------|---------|---------|
| POST | `/register/` | 409 | `CONFLICT` | Email already registered |
| POST | `/register/` | 422 | `VALIDATION_ERROR` | Request validation failed |
| POST | `/login/` | 401 | `AUTHENTICATION_ERROR` | Invalid credentials |
| POST | `/refresh/` | 401 | `AUTHENTICATION_ERROR` | Invalid refresh token / User not found |
| GET | `/me/` | 401 | `AUTHENTICATION_ERROR` | Not authenticated / Invalid token |

### Advisor — `/api/v1/advisor/`

| Method | Path | Status | `error` | Message |
|--------|------|--------|---------|---------|
| POST | `/session/` | 404 | `NOT_FOUND` | Document not found |
| POST | `/upload/` | 400 | `BAD_REQUEST` | No filename / bad file type |
| POST | `/upload/` | 413 | `PAYLOAD_TOO_LARGE` | File exceeds N MB limit |
| POST | `/upload/` | 409 | `CONFLICT` | Session already has a document |
| POST | `/message/` | 404 | `NOT_FOUND` | Session not found |
| GET | `/session/{id}/` | 404 | `NOT_FOUND` | Session not found |

### Demo — `/api/v1/demo/`

| Method | Path | Status | `error` | Message |
|--------|------|--------|---------|---------|
| POST | `/run/` | 404 | `NOT_FOUND` | Session not found |
| POST | `/run/` | 400 | `BAD_REQUEST` | Demo limit / no document |
| GET | `/result/{id}/` | 404 | `NOT_FOUND` | Job not found |

### OCR / Dashboard — `/api/v1/`

| Method | Path | Status | `error` | Message |
|--------|------|--------|---------|---------|
| POST | `/ocr/jobs/` | 404 | `NOT_FOUND` | Document not found |
| POST | `/ocr/jobs/` | 403 | `QUOTA_EXCEEDED` | Quota exceeded |
| GET | `/ocr/jobs/{id}/` | 404 | `NOT_FOUND` | Job not found |

### Billing — `/api/v1/billing/`

| Method | Path | Status | `error` | Message |
|--------|------|--------|---------|---------|
| POST | `/checkout/` | 400 | `BAD_REQUEST` | Invalid tier |
| POST | `/checkout/` | 502 | `EXTERNAL_SERVICE_ERROR` | Payment provider unavailable |

### ML Endpoints — `/api/v1/vlm/`, `/paddle-ocr/`, `/got-ocr/`, `/qianfan-ocr/`, `/testing/`

| Condition | Status | `error` |
|-----------|--------|---------|
| Bad file / filename / PDF pages | 400 | `BAD_REQUEST` |
| File too large | 413 | `PAYLOAD_TOO_LARGE` |
| Model not found (testing) | 404 | `NOT_FOUND` |
| Service disabled / model load fail | 503 | `SERVICE_UNAVAILABLE` |
| Inference failure | 500 | `INTERNAL_ERROR` |
| Inference timeout | 504 | `INFERENCE_TIMEOUT` |

---

## Shared Validation Helpers

Located in `app/core/uploads.py`. Use these instead of duplicating validation in routes.

```python
from app.core.uploads import (
    validate_media_upload,      # OCR/VLM/testing — PDF + images
    validate_advisor_upload,    # Advisor — PDF, PNG, JPG only
    check_payload_size,         # Raises 413
    require_pdf_only,           # PDF-only endpoints
    reject_pdf_for_image_endpoint,
    validate_pdf_page_count,
)
```

| Helper | Raises | Example Message |
|--------|--------|-----------------|
| `validate_filename(None)` | 400 | `"No filename provided"` |
| `validate_media_upload(...)` | 400 | `"Only PDF and image files (PNG, JPG, WEBP) are supported"` |
| `validate_advisor_upload(...)` | 400 | `"Only PDF, PNG, JPG allowed"` |
| `check_payload_size(content)` | 413 | `"File exceeds 10MB limit"` |
| `require_pdf_only(...)` | 400 | `"Only PDF files are supported"` |
| `validate_pdf_page_count(0, 50)` | 400 | `"PDF contains no pages"` |
| `validate_pdf_page_count(51, 50)` | 400 | `"PDF exceeds maximum of 50 pages"` |

---

## Inference / ML Service Errors

Use helpers from `app/core/inference_helpers.py`:

```python
from app.core.inference_helpers import (
    ensure_model_service_ready,
    validate_pdf_images,
    map_inference_error,
)

# Before inference
ensure_model_service_ready(
    enabled=settings.VLM_ENABLED,
    service_name="VLM",
    load_fn=vlm_service.load,
)

# In try/except around inference
try:
    result = await vlm_service.chat_with_image(...)
except AppException:
    raise
except Exception as exc:
    raise map_inference_error(exc, operation="VLM inference") from exc
```

`map_inference_error` mapping:

| Input Exception | Output Exception |
|-----------------|------------------|
| `AppException` | Re-raised as-is |
| `ValueError` | `BadRequestError` (400) |
| `RuntimeError` | `ServiceUnavailableError` (503) |
| `TimeoutError` | `InferenceTimeoutError` (504) |
| Anything else | `InternalError` (500) — details hidden in prod |

---

## Background Jobs (Celery)

File: `workers/celery_app.py`

- **4xx `AppException`** → job marked failed, **no retry**
- **5xx / unknown errors** → retried up to 3 times (30s delay)

```python
from app.core.exceptions import is_client_error

if is_client_error(exc):
    return {"job_id": job_id, "status": "failed", "error": exc.message}
raise self.retry(exc=exc)
```

---

## Developer Guidelines

### DO

```python
# In API routes and dependencies
from app.core.exceptions import NotFoundError
raise NotFoundError("Job not found")

# In services
from app.core.exceptions import BadRequestError
raise BadRequestError("Demo run limit reached for this session")

# Use shared upload helpers
from app.core.uploads import check_payload_size, validate_media_upload
```

### DON'T

```python
# Don't use HTTPException in routes (use domain exceptions)
raise HTTPException(status_code=404, detail="Not found")  # ❌

# Don't expose raw exception strings in production inference paths
raise InternalError(f"failed: {exc}")  # ❌ in prod — use map_inference_error()

# Don't catch and swallow AppException without re-raising
except Exception:
    return {"error": "something"}  # ❌
```

### Layer responsibilities

| Layer | Responsibility |
|-------|----------------|
| `app/api/v1/*.py` | HTTP entry, call services, raise domain exceptions |
| `app/core/dependencies.py` | Auth → `AuthenticationError` |
| `app/*/service.py` | Business logic → domain exceptions |
| `app/core/exception_handlers.py` | Convert all errors to JSON |
| `app/core/uploads.py` | File validation |
| `workers/celery_app.py` | Retry policy |

---

## Adding a New Exception

1. **Add class** in `app/core/exceptions.py`:

```python
class PaymentRequiredError(AppException):
    status_code = 402
    code = "PAYMENT_REQUIRED"
```

2. **Raise it** in the relevant service or route:

```python
raise PaymentRequiredError("Active subscription required")
```

3. **No handler changes needed** — `AppException` handler picks it up automatically.

4. **Add tests** in `tests/test_exceptions.py` and `tests/test_api_exceptions.py`.

5. **Update this document** with the new code, status, and example response.

---

## Running Tests

```bash
cd ocr_plateform/ocr_platform
python3 -m pytest tests/ -v
```

| Test file | Coverage |
|-----------|----------|
| `tests/test_exceptions.py` | All exception classes, handlers, DEBUG behavior |
| `tests/test_uploads.py` | Upload validation helpers |
| `tests/test_api_exceptions.py` | Live API: 401, 404, 409, 422, 400, request IDs |

---

## Frontend Consumption (reference)

The frontend reads errors via `ApiError` in `frontend/src/lib/api.ts`:

```typescript
// Parses: error, message, detail, request_id, details
const err = await parseApiError(response);
console.log(err.status);   // 404
console.log(err.code);     // "NOT_FOUND"
console.log(err.message);  // "Session not found"
```

Clients should prefer `message` for display and `error` for programmatic handling.

---

## Environment Variables

| Variable | Default | Effect on errors |
|----------|---------|------------------|
| `DEBUG` | `true` | `false` → 500 responses hide internal exception text |
| `MAX_UPLOAD_SIZE_MB` | `10` | Used by `check_payload_size()` for 413 messages |

---

*Last updated: matches implementation in `app/core/exceptions.py` and global handlers in `app/main.py`.*
