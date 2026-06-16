# API v2 Reference

Modern public HTTP API for the Unified OCR Platform.  
Base URL: `http://localhost:8000` — prefix `/api/v2`.

**v1 remains unchanged** — the frontend and existing integrations continue to use `/api/v1`.  
Use v2 for new integrations that want a consistent envelope and prefixed resource ids.

Interactive docs: `/docs` — filter by tag **V2**.

---

## Response envelope

Every successful v2 response uses this shape:

```json
{
  "object": "ocr_job",
  "id": "job_660e8400-e29b-41d4-a716-446655440001",
  "created_at": "2026-06-12T10:00:00+00:00",
  "request_id": "abc123def456",
  "data": { }
}
```

| Field | Description |
|-------|-------------|
| `object` | Resource type (`ocr_job`, `document`, `document_list`, `model_catalog`) |
| `id` | Prefixed resource id (`job_…`, `doc_…`) or `null` for list/catalog responses |
| `created_at` | ISO 8601 timestamp when the resource was created |
| `request_id` | Correlation id from `X-Request-ID` middleware |
| `data` | Resource-specific payload |

Errors use the same format as v1 — see [EXCEPTION_HANDLING.md](./EXCEPTION_HANDLING.md).

---

## Authentication

v2 endpoints accept **API key (recommended)** or **JWT**:

```bash
# API key — x-api-key header
curl -s http://localhost:8000/api/v2/models/ \
  -H "x-api-key: ocr_<your_key>"

# API key — Bearer
curl -s http://localhost:8000/api/v2/models/ \
  -H "Authorization: Bearer ocr_<your_key>"

# JWT (optional)
curl -s http://localhost:8000/api/v2/models/ \
  -H "Authorization: Bearer <access_token>"
```

Create API keys via v1 dashboard: `POST /api/v1/dashboard/api-keys/` (JWT required).  
OCR job endpoints enforce scopes: `ocr:read`, `ocr:write`.

See [AUTHENTICATION.md](./AUTHENTICATION.md) for key creation and scope details.

---

## Prefixed resource ids

| Prefix | Resource | Example |
|--------|----------|---------|
| `job_` | OCR job | `job_660e8400-e29b-41d4-a716-446655440001` |
| `doc_` | Document | `doc_550e8400-e29b-41d4-a716-446655440000` |

Request bodies and path parameters accept either the prefixed id or the raw UUID.

---

## Endpoints

### `GET /api/v2/models/`

List available OCR and VLM models.

```bash
curl -s http://localhost:8000/api/v2/models/ \
  -H "x-api-key: ocr_<your_key>"
```

Success (200):

```json
{
  "object": "model_catalog",
  "id": null,
  "created_at": null,
  "request_id": "req_abc",
  "data": {
    "models": [
      {
        "slug": "trocr-base",
        "display_name": "TrOCR Base",
        "type": "ocr",
        "adapter_type": "trocr-base",
        "capability_tags": ["printed_text"]
      }
    ]
  }
}
```

---

### `POST /api/v2/documents/`

Upload a document. Returns a `document` envelope with `doc_` id.

```bash
curl -s -X POST http://localhost:8000/api/v2/documents/ \
  -H "x-api-key: ocr_<your_key>" \
  -F "file=@invoice.pdf"
```

Success (201):

```json
{
  "object": "document",
  "id": "doc_550e8400-e29b-41d4-a716-446655440000",
  "created_at": "2026-06-12T10:00:00+00:00",
  "request_id": "req_abc",
  "data": {
    "filename": "invoice.pdf",
    "content_type": "application/pdf",
    "fingerprint": {"type": "pdf", "page_count": 2},
    "page_count": 2,
    "preview_url": "http://localhost:8000/storage/uploads/..."
  }
}
```

---

### `GET /api/v2/documents/{id}/`

Retrieve a document by `doc_<uuid>` or raw uuid.

```bash
curl -s http://localhost:8000/api/v2/documents/doc_550e8400-e29b-41d4-a716-446655440000/ \
  -H "x-api-key: ocr_<your_key>"
```

---

### `GET /api/v2/documents/`

Cursor-based document list (Stripe-style pagination).

| Query | Default | Description |
|-------|---------|-------------|
| `limit` | 20 | Page size (1–100) |
| `starting_after` | — | `doc_<uuid>` cursor |

```bash
curl -s "http://localhost:8000/api/v2/documents/?limit=20" \
  -H "Authorization: Bearer <access_token>"
```

Success (200):

```json
{
  "object": "document_list",
  "id": null,
  "created_at": null,
  "request_id": "req_abc",
  "data": {
    "items": [
      {
        "object": "document",
        "id": "doc_550e8400-e29b-41d4-a716-446655440000",
        "created_at": "2026-06-12T10:00:00+00:00",
        "request_id": "req_abc",
        "data": { "filename": "invoice.pdf", "...": "..." }
      }
    ],
    "has_more": false
  }
}
```

---

### `POST /api/v2/ocr/jobs/`

Submit an OCR job. Requires `ocr:write` scope when using an API key.

Optional header: `Idempotency-Key` (24h replay, same as v1).

```bash
curl -s -X POST http://localhost:8000/api/v2/ocr/jobs/ \
  -H "x-api-key: ocr_<your_key>" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: my-unique-key-001" \
  -d '{
    "document_id": "doc_550e8400-e29b-41d4-a716-446655440000",
    "tier_slug": "basic",
    "webhook_url": "https://example.com/hooks/ocr"
  }'
```

Success (202):

```json
{
  "object": "ocr_job",
  "id": "job_660e8400-e29b-41d4-a716-446655440001",
  "created_at": "2026-06-12T10:00:00+00:00",
  "request_id": "req_abc",
  "data": {
    "status": "queued",
    "job_type": "production",
    "pages_processed": 0,
    "result": null,
    "error_message": null
  }
}
```

Response headers (when subscription exists):

- `X-Quota-Used`
- `X-Quota-Limit`

---

### `GET /api/v2/ocr/jobs/{id}/`

Poll job status. Requires `ocr:read` scope when using an API key.

```bash
curl -s http://localhost:8000/api/v2/ocr/jobs/job_660e8400-e29b-41d4-a716-446655440001/ \
  -H "x-api-key: ocr_<your_key>"
```

When `data.status` is `completed`, `data.result` contains the OCR output.

---

## v1 vs v2 comparison

| Aspect | v1 | v2 |
|--------|----|----|
| Base path | `/api/v1` | `/api/v2` |
| Response shape | Flat fields (`id`, `status`, …) | Envelope with `object`, `id`, `data` |
| Job id | Raw UUID | `job_<uuid>` |
| Document id | Raw UUID | `doc_<uuid>` |
| Auth on OCR | API key or JWT | API key or JWT (key preferred) |
| Auth on documents | JWT only | API key or JWT |
| Idempotency | Yes (OCR, demo, billing) | Yes (OCR jobs) |
| Webhooks | Optional on job create | Optional on job create |

---

## Rate limiting

When `RATE_LIMIT_ENABLED=true`, `POST/GET /api/v2/ocr/jobs/` are rate-limited by subscription tier (same rules as v1 OCR jobs).

---

## Migration notes

- **Do not change v1 clients** until explicitly migrating.
- Map v1 `id` → v2 `job_<id>` or `doc_<id>` when comparing resources.
- v2 idempotency keys are scoped to v2 endpoints (separate from v1 replay cache).
