# Authentication

How to authenticate with the Unified OCR Platform API.

---

## Overview

| Method | Use for | Header |
|--------|---------|--------|
| **JWT (Bearer)** | Dashboard, advisor, documents, demo, testing, billing, auth | `Authorization: Bearer <access_token>` |
| **API key** | Production OCR jobs only (`POST/GET /api/v1/ocr/jobs/`) | `Authorization: Bearer ocr_<key>` or `x-api-key: ocr_<key>` |

JWT and API keys are **not interchangeable** — each route accepts only the methods listed above.

---

## JWT authentication

### 1. Register or log in

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Response:

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

Access tokens expire after 15 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`).

### 2. Use the access token

```bash
curl -s http://localhost:8000/api/v1/auth/me/ \
  -H "Authorization: Bearer eyJ..."
```

### 3. Refresh (when implemented)

Send the `refresh_token` to the refresh endpoint to obtain a new access token without re-entering credentials.

### JWT-protected routes

- `POST /api/v1/auth/register/`, `login/`, `GET me/`
- `POST /api/v1/advisor/*` — sessions, upload, messages
- `POST /api/v1/documents/` — public upload alias (same as advisor upload)
- `GET /api/v1/documents/`, `GET /api/v1/documents/{id}/`
- `POST /api/v1/demo/run/`, `GET /api/v1/demo/result/{job_id}/`
- `GET /api/v1/testing/models/`, `POST /api/v1/testing/run/`
- `GET /api/v1/models/` — public models alias
- `GET/POST /api/v1/dashboard/*`
- `POST /api/v1/billing/checkout/`

---

## API key authentication

API keys are for **server-to-server** OCR job submission. They are scoped to the key owner's subscription quota.

### 1. Create a key (JWT required)

```bash
curl -s -X POST "http://localhost:8000/api/v1/dashboard/api-keys/?name=Production" \
  -H "Authorization: Bearer <access_token>"
```

The raw key is returned **once** in the `key` field (prefix `ocr_`). Store it securely — it cannot be retrieved later.

### 2. Authenticate OCR requests

**Option A — Bearer header:**

```bash
curl -s -X POST http://localhost:8000/api/v1/ocr/jobs/ \
  -H "Authorization: Bearer ocr_<your_key>" \
  -H "Content-Type: application/json" \
  -d '{"document_id":"<uuid>","tier_slug":"basic"}'
```

**Option B — x-api-key header:**

```bash
curl -s http://localhost:8000/api/v1/ocr/jobs/<job_id>/ \
  -H "x-api-key: ocr_<your_key>"
```

### API key–protected routes

- `POST /api/v1/ocr/jobs/`
- `GET /api/v1/ocr/jobs/{job_id}/`

Both routes also accept JWT if you prefer a single credential during development.

---

## Error responses

| HTTP | `error` code | Cause |
|------|--------------|-------|
| 401 | `AUTHENTICATION_ERROR` | Missing, expired, or invalid token/key |
| 403 | `QUOTA_EXCEEDED` | Subscription page quota exhausted (OCR jobs) |

Example:

```json
{
  "error": "AUTHENTICATION_ERROR",
  "message": "Could not validate credentials",
  "detail": "Could not validate credentials",
  "request_id": "abc123..."
}
```

---

## Security best practices

1. **Never commit keys or tokens** to source control.
2. **Use API keys in production** for OCR job automation; keep JWT for user-facing flows.
3. **Rotate keys** by creating a new key and revoking the old one via `POST /api/v1/dashboard/api-keys/{id}/revoke/`.
4. **Use HTTPS** in production — tokens and keys are sent in headers on every request.
5. **Set `DEBUG=false`** in production to avoid leaking internal error details.

---

## Idempotency (mutating requests)

JWT or API key requests to idempotent endpoints may include:

```
Idempotency-Key: <unique-string>
```

Supported on `POST /api/v1/ocr/jobs/`, `POST /api/v1/demo/run/`, and `POST /api/v1/billing/checkout/`. See [API_REFERENCE.md](./API_REFERENCE.md#idempotency).

---

*See [API_REFERENCE.md](./API_REFERENCE.md) for full endpoint cURL examples.*
