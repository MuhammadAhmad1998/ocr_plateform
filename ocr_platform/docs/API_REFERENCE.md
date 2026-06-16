# API Reference

Public HTTP API for the Unified OCR Platform (v1).  
Base URL: `http://localhost:8000` (local) — prefix `/api/v1` unless noted.

Interactive docs: `/docs` (Swagger) and `/redoc`.

For authentication details, see [AUTHENTICATION.md](./AUTHENTICATION.md).

---

## Authentication

### JWT (Bearer)

Used for advisor, documents, demo, testing, dashboard, billing, and auth routes.

```bash
curl -s http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Use the `access_token` from the response:

```bash
curl -s http://localhost:8000/api/v1/auth/me/ \
  -H "Authorization: Bearer <access_token>"
```

### API key

Used for **OCR job** endpoints only (`POST/GET /api/v1/ocr/jobs/`).

Create a key (JWT required):

```bash
curl -s -X POST "http://localhost:8000/api/v1/dashboard/api-keys/?name=Production" \
  -H "Authorization: Bearer <access_token>"
```

The raw `key` is shown once. Authenticate with either header:

```bash
# Option A — Bearer
curl -s http://localhost:8000/api/v1/ocr/jobs/<job_id>/ \
  -H "Authorization: Bearer ocr_<your_key>"

# Option B — x-api-key
curl -s http://localhost:8000/api/v1/ocr/jobs/<job_id>/ \
  -H "x-api-key: ocr_<your_key>"
```

Full authentication guide: [AUTHENTICATION.md](./AUTHENTICATION.md).

---

## Public API aliases

These routes are the preferred public paths. Legacy routes remain available but return `Deprecation: true` and a `Link` header pointing to the successor.

| New path | Legacy path | Auth |
|----------|-------------|------|
| `GET /api/v1/models/` | `GET /api/v1/testing/models/` | JWT |
| `POST /api/v1/documents/` | `POST /api/v1/advisor/upload/` | JWT |
| `GET /api/v1/documents/{id}/` | — (new) | JWT |
| `GET /api/v1/documents/` | — (new, paginated) | JWT |

### `GET /api/v1/models/`

List available OCR and VLM models.

```bash
curl -s http://localhost:8000/api/v1/models/ \
  -H "Authorization: Bearer <access_token>"
```

Success (200):

```json
{
  "models": [
    {
      "slug": "paddle-ocr-vl",
      "display_name": "PaddleOCR-VL (...)",
      "type": "paddle_ocr",
      "adapter_type": "paddle_ocr",
      "capability_tags": ["vision", "pdf", "images", "ocr"]
    }
  ]
}
```

Errors: 401 `AUTHENTICATION_ERROR`

### `POST /api/v1/documents/`

Upload a document (same response as `/advisor/upload/`).

```bash
curl -s -X POST http://localhost:8000/api/v1/documents/ \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@sample.pdf"
```

Optional query: `?session_id=<uuid>` to attach to an advisor session.

Success (201): `id`, `filename`, `content_type`, `fingerprint`, `page_count`, `preview_url`  
Errors: 400, 413, 409

### `GET /api/v1/documents/{id}/`

Retrieve a document by ID.

```bash
curl -s http://localhost:8000/api/v1/documents/<document_id>/ \
  -H "Authorization: Bearer <access_token>"
```

Success (200): same fields as upload response  
Errors: 404 `NOT_FOUND`, 401

### `GET /api/v1/documents/`

Cursor-based list (Stripe-style pagination).

```bash
curl -s "http://localhost:8000/api/v1/documents/?limit=20" \
  -H "Authorization: Bearer <access_token>"
```

Next page:

```bash
curl -s "http://localhost:8000/api/v1/documents/?limit=20&starting_after=<last_id>" \
  -H "Authorization: Bearer <access_token>"
```

Success (200):

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "invoice.pdf",
      "content_type": "application/pdf",
      "fingerprint": {"type": "pdf"},
      "page_count": 2,
      "preview_url": "http://localhost:8000/storage/uploads/..."
    }
  ],
  "has_more": false
}
```

Errors: 404 `NOT_FOUND` (invalid `starting_after` cursor), 401

### Deprecation headers

Legacy routes return:

```
Deprecation: true
Link: </api/v1/models/>; rel="successor-version"
```

Affected legacy paths: `GET /api/v1/testing/models/`, `POST /api/v1/advisor/upload/`.

---

## Error responses

All errors use a consistent JSON body (see [EXCEPTION_HANDLING.md](./EXCEPTION_HANDLING.md)):

```json
{
  "error": "NOT_FOUND",
  "message": "Job not found",
  "detail": "Job not found",
  "request_id": "abc123..."
}
```

| HTTP | `error` code | Typical cause |
|------|--------------|---------------|
| 400 | `BAD_REQUEST` | Invalid input |
| 401 | `AUTHENTICATION_ERROR` | Missing/invalid JWT or API key |
| 403 | `QUOTA_EXCEEDED` | Subscription page quota exhausted |
| 404 | `NOT_FOUND` | Resource missing |
| 409 | `CONFLICT` | Duplicate email, session conflict |
| 413 | `PAYLOAD_TOO_LARGE` | Upload over limit |
| 422 | `VALIDATION_ERROR` | Pydantic validation failure |
| 429 | `RATE_LIMIT_EXCEEDED` | Rate limit (when `RATE_LIMIT_ENABLED=true`) |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

Every response includes `X-Request-ID`. Rate-limited routes also return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` when limiting is enabled.

---

## Health

### `GET /health`

Liveness probe — no dependencies checked.

```bash
curl -s http://localhost:8000/health
```

```json
{"status":"ok","service":"Unified OCR Platform"}
```

### `GET /health/ready`

Readiness probe — checks PostgreSQL and Redis.

```bash
curl -s http://localhost:8000/health/ready
```

Success (200):

```json
{"status":"ready","checks":{"database":"ok","redis":"ok"}}
```

Failure (503):

```json
{"status":"not_ready","checks":{"database":"ok","redis":"error"}}
```

---

## Auth — `/api/v1/auth/`

### `POST /api/v1/auth/register/`

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"new@example.com","password":"password123","full_name":"New User"}'
```

Success (201): `access_token`, `refresh_token`  
Errors: 409 `CONFLICT`, 422 `VALIDATION_ERROR`

### `POST /api/v1/auth/login/`

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Success (200): `access_token`, `refresh_token`  
Errors: 401 `AUTHENTICATION_ERROR`

### `GET /api/v1/auth/me/`

```bash
curl -s http://localhost:8000/api/v1/auth/me/ \
  -H "Authorization: Bearer <access_token>"
```

Success (200): `id`, `email`, `full_name`, `subscription`  
Errors: 401 `AUTHENTICATION_ERROR`

---

## Advisor — `/api/v1/advisor/`

JWT required.

### `POST /api/v1/advisor/session/`

```bash
curl -s -X POST http://localhost:8000/api/v1/advisor/session/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Success (201): session object with `id`, `messages`, etc.  
Errors: 404 `NOT_FOUND` (invalid `document_id`)

### `POST /api/v1/advisor/upload/`

```bash
curl -s -X POST http://localhost:8000/api/v1/advisor/upload/ \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@sample.pdf"
```

Success (201): document metadata  
Errors: 400, 413, 409

### `POST /api/v1/advisor/message/`

```bash
curl -s -X POST http://localhost:8000/api/v1/advisor/message/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"<uuid>","content":"What tier fits my invoice?"}'
```

### `GET /api/v1/advisor/session/{session_id}/`

```bash
curl -s http://localhost:8000/api/v1/advisor/session/<session_id>/ \
  -H "Authorization: Bearer <access_token>"
```

Errors: 404 `NOT_FOUND`

---

## Demo — `/api/v1/demo/`

JWT required.

### `POST /api/v1/demo/run/`

```bash
curl -s -X POST http://localhost:8000/api/v1/demo/run/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"session_id":"<uuid>"}'
```

Success (202): `job_id`, `status`, optional `request_id`, `created_at`  
Errors: 404, 400

**Idempotency:** send `Idempotency-Key: <unique-string>` to safely retry. Within 24 hours, the same key + body returns the original response (202). Reusing the key with a different body returns 409 `CONFLICT`.

```bash
curl -s -X POST http://localhost:8000/api/v1/demo/run/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: demo-run-001" \
  -d '{"session_id":"<uuid>"}'
```

### `GET /api/v1/demo/result/{job_id}/`

```bash
curl -s http://localhost:8000/api/v1/demo/result/<job_id>/ \
  -H "Authorization: Bearer <access_token>"
```

Errors: 404 `NOT_FOUND`

---

## OCR jobs — `/api/v1/ocr/jobs/`

**JWT or API key.**

### `POST /api/v1/ocr/jobs/`

```bash
curl -s -X POST http://localhost:8000/api/v1/ocr/jobs/ \
  -H "x-api-key: ocr_<your_key>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: job-submit-001" \
  -d '{"document_id":"<uuid>","tier_slug":"basic","webhook_url":"https://example.com/hooks/ocr"}'
```

Success (202): `id`, `status`, `job_type`, `pages_processed`, `result`, `error_message`, optional `request_id`, `created_at`  
Response headers (when subscription exists): `X-Quota-Used`, `X-Quota-Limit`

Errors: 404 `NOT_FOUND`, 403 `QUOTA_EXCEEDED` or `AUTHORIZATION_ERROR` (missing `ocr:write` scope), 401, 409 `CONFLICT` (idempotency key reused with different body)

**Idempotency:** `Idempotency-Key` header — replays within 24h return the same 202 response. See [WEBHOOKS.md](./WEBHOOKS.md) for optional `webhook_url`.

### `GET /api/v1/ocr/jobs/{job_id}/`

```bash
curl -s http://localhost:8000/api/v1/ocr/jobs/<job_id>/ \
  -H "Authorization: Bearer ocr_<your_key>"
```

Errors: 404 `NOT_FOUND`

---

## Dashboard — `/api/v1/dashboard/`

JWT required.

### `GET /api/v1/dashboard/usage/`

```bash
curl -s http://localhost:8000/api/v1/dashboard/usage/ \
  -H "Authorization: Bearer <access_token>"
```

### `GET /api/v1/dashboard/jobs/`

```bash
curl -s http://localhost:8000/api/v1/dashboard/jobs/ \
  -H "Authorization: Bearer <access_token>"
```

### `GET /api/v1/dashboard/api-keys/`

```bash
curl -s http://localhost:8000/api/v1/dashboard/api-keys/ \
  -H "Authorization: Bearer <access_token>"
```

### `POST /api/v1/dashboard/api-keys/`

```bash
curl -s -X POST "http://localhost:8000/api/v1/dashboard/api-keys/?name=My+Key" \
  -H "Authorization: Bearer <access_token>"
```

Optional scopes (JSON body):

```bash
curl -s -X POST "http://localhost:8000/api/v1/dashboard/api-keys/?name=ReadOnly" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"scopes":["ocr:read"]}'
```

Valid scopes: `ocr:read` (GET jobs), `ocr:write` (POST jobs). Default: both scopes.

Success (201): includes one-time `key` field and `scopes` array.

### `POST /api/v1/dashboard/api-keys/{id}/revoke/`

Soft-revoke a key (`is_active=false`).

```bash
curl -s -X POST "http://localhost:8000/api/v1/dashboard/api-keys/<key_id>/revoke/" \
  -H "Authorization: Bearer <access_token>"
```

Success (200): `{"id":"...","is_active":false}`

---

## Billing — `/api/v1/billing/`

JWT required.

### `POST /api/v1/billing/checkout/`

```bash
curl -s -X POST http://localhost:8000/api/v1/billing/checkout/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: checkout-001" \
  -d '{"tier_slug":"basic"}'
```

Success (200): `checkout_url`, `session_id`  
Errors: 400 `BAD_REQUEST`, 502 `EXTERNAL_SERVICE_ERROR`, 409 `CONFLICT` (idempotency key reused with different body)

**Idempotency:** same `Idempotency-Key` + body replays the original checkout response within 24 hours.

---

## Testing — `/api/v1/testing/`

JWT required.

### `GET /api/v1/testing/models/`

```bash
curl -s http://localhost:8000/api/v1/testing/models/ \
  -H "Authorization: Bearer <access_token>"
```

### `POST /api/v1/testing/run/`

```bash
curl -s -X POST http://localhost:8000/api/v1/testing/run/ \
  -H "Authorization: Bearer <access_token>" \
  -F "model_slug=paddle-ocr-vl" \
  -F "file=@sample.png"
```

Errors: 404 `NOT_FOUND` (unknown model)

---

## Service status

### `GET /api/v1/status/`

Public, no authentication. Returns version, uptime, enabled models, and degraded flags (no secrets or hostnames).

```bash
curl -s http://localhost:8000/api/v1/status/
```

Success (200):

```json
{
  "version": "1.0.0",
  "uptime_seconds": 3600,
  "models": {
    "vlm": true,
    "paddle": true,
    "got": true,
    "qianfan": false
  },
  "degraded": {
    "database": false,
    "redis": false
  }
}
```

---

## Rate limiting

When `RATE_LIMIT_ENABLED=true`, these path prefixes are limited per subscription tier (requests per `RATE_LIMIT_WINDOW_SECONDS`, default 60s):

| Tier | Default limit / window |
|------|------------------------|
| free | 30 |
| basic | 60 |
| pro | 120 |
| enterprise | 300 |

Paths:

- `/api/v1/ocr/jobs/`
- `/api/v1/vlm/`
- `/api/v1/paddle-ocr/`
- `/api/v1/got-ocr/`
- `/api/v1/qianfan-ocr/`

Tier is resolved from JWT user subscription or API key owner's subscription. Unauthenticated clients use the `free` tier limit.

Exceeded limit → 429 with `RATE_LIMIT_EXCEEDED`.

Headers when limiting is enabled: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `X-RateLimit-Tier`.

Override per tier via env: `RATE_LIMIT_REQUESTS_FREE`, `RATE_LIMIT_REQUESTS_BASIC`, `RATE_LIMIT_REQUESTS_PRO`, `RATE_LIMIT_REQUESTS_ENTERPRISE`.

---

## Quota metering headers

On successful `POST /api/v1/ocr/jobs/` (202), when the user has a subscription:

- `X-Quota-Used` — pages consumed this billing period
- `X-Quota-Limit` — plan page limit

---

## Request tracing

Send a custom trace ID:

```bash
curl -s http://localhost:8000/api/v1/auth/me/ \
  -H "X-Request-ID: my-trace-123" \
  -H "Authorization: Bearer <token>"
```

The same value is returned in the response header and error JSON `request_id`.

Inference routes also return `X-Processing-Time-Ms` (wall time for the HTTP handler).

---

## Idempotency

Mutating endpoints accept an optional `Idempotency-Key` header:

| Endpoint | Method |
|----------|--------|
| `/api/v1/ocr/jobs/` | POST |
| `/api/v1/demo/run/` | POST |
| `/api/v1/billing/checkout/` | POST |

Within **24 hours**, the same key + authenticated user + request body returns the stored response (status code and JSON body). Reusing a key with a different body returns 409 `CONFLICT`.

---

## Webhooks

Optional `webhook_url` on job creation triggers a signed POST when the job completes or fails.  
See [WEBHOOKS.md](./WEBHOOKS.md) for payload schema and signature verification.

---

*See [EXCEPTION_HANDLING.md](./EXCEPTION_HANDLING.md) for the full error catalog.*  
*Production deploy checklist: [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).*
