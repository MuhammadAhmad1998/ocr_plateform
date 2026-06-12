# Webhooks

Outbound webhooks notify your server when an OCR job completes or fails.  
Configure an optional `webhook_url` when creating a job.

---

## Enabling webhooks

### Production OCR jobs

```bash
curl -s -X POST http://localhost:8000/api/v1/ocr/jobs/ \
  -H "x-api-key: ocr_<your_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "<uuid>",
    "webhook_url": "https://your-server.com/webhooks/ocr"
  }'
```

### Demo runs

```bash
curl -s -X POST http://localhost:8000/api/v1/demo/run/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "<uuid>",
    "webhook_url": "https://your-server.com/webhooks/ocr"
  }'
```

When the job reaches `completed` or `failed`, the platform POSTs a JSON payload to your URL.

---

## Payload schema

```json
{
  "event": "job.completed",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "job_type": "production",
  "pages_processed": 3,
  "error_message": null,
  "completed_at": "2026-06-12T14:30:00+00:00"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `event` | string | `job.completed` or `job.failed` |
| `job_id` | string | OCR job UUID |
| `status` | string | Final job status |
| `job_type` | string | `production` or `demo` |
| `pages_processed` | integer | Pages processed (0 until complete) |
| `error_message` | string \| null | Error text when `status` is `failed` |
| `completed_at` | string \| null | ISO 8601 timestamp |

---

## Signature verification

Every delivery includes:

```
X-OCR-Signature: sha256=<hex_digest>
```

The signature is **HMAC-SHA256** of the raw JSON body using your platform `SECRET_KEY` (same value configured on the OCR server).

### Python example

```python
import hashlib
import hmac

def verify_webhook(body: bytes, signature_header: str, secret: str) -> bool:
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    provided = signature_header.removeprefix("sha256=").strip()
    return hmac.compare_digest(expected, provided)
```

### Node.js example

```javascript
const crypto = require("crypto");

function verifyWebhook(body, signatureHeader, secret) {
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  const provided = signatureHeader.replace(/^sha256=/, "").trim();
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}
```

Always verify the signature before trusting the payload. Reject requests with missing or invalid signatures.

---

## Retries

Failed deliveries are retried up to **3 attempts** (30 seconds apart via Celery).  
Delivery records are stored in `webhook_deliveries` with `status`: `pending`, `delivered`, or `failed`.

Your endpoint should respond with **2xx** quickly. Timeouts are 10 seconds.

---

## Idempotency on your side

Webhook deliveries may be retried. Use `job_id` + `event` as a deduplication key on your receiver.

---

*See [API_REFERENCE.md](./API_REFERENCE.md) for job creation and [EXCEPTION_HANDLING.md](./EXCEPTION_HANDLING.md) for API errors.*
