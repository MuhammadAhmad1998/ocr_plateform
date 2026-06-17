# Joint integration test — AI Platform ↔ OCR Service

Staging flow for `ai_service_platform` (port 8004).

## Prerequisites

1. Staging instance running with:
   - `PLATFORM_API_KEY` set (shared secret)
   - `REQUIRE_API_KEY=true`
   - Postgres database `ai_service_ocr` reachable
2. Your platform server configured with the same `PLATFORM_API_KEY` and staging `base_url`.

## 1. Provision API key

```bash
export PLATFORM_API_KEY="<shared-secret>"
export STAGING_URL="https://staging.api.ocr.example.com"

curl -s -X POST "$STAGING_URL/internal/v1/keys/provision" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "platform_key_id": "550e8400-e29b-41d4-a716-446655440000",
    "plain_key": "ak_live_stagingtestkey1",
    "key_prefix": "ak_live_stag",
    "key_hash": "<bcrypt-hash-of-plain_key>",
    "platform_tenant_id": "660e8400-e29b-41d4-a716-446655440001",
    "platform_account_id": "770e8400-e29b-41d4-a716-446655440002",
    "platform_user_id": "880e8400-e29b-41d4-a716-446655440003",
    "platform_subscription_id": "990e8400-e29b-41d4-a716-446655440004",
    "user_email": "developer@company.com",
    "user_full_name": "Jane Developer",
    "account_type": "company",
    "company_name": "Acme Corp",
    "service_slug": "ocr",
    "key_name": "Staging Key",
    "scopes": ["ocr:read", "ocr:write"],
    "quota_limit": 1000,
    "quota_unit": "pages",
    "plan_slug": "professional"
  }'
```

Expected: `201` with `{"ocr_key_id":"...","status":"active"}`

## 2. Upload document

```bash
export TENANT_KEY="ak_live_stagingtestkey1"

curl -s -X POST "$STAGING_URL/api/v1/documents/" \
  -H "Authorization: Bearer $TENANT_KEY" \
  -F "file=@sample.pdf"
```

Expected: `201` with document `id`.

## 3. Create OCR job

```bash
curl -s -X POST "$STAGING_URL/api/v1/ocr/jobs/" \
  -H "Authorization: Bearer $TENANT_KEY" \
  -H "Content-Type: application/json" \
  -d '{"document_id":"<uuid>","tier_slug":"basic","webhook_url":"https://your-hooks.example/ocr"}'
```

Expected: `202` with job `id`, headers `X-Quota-Used` and `X-Quota-Limit`.

## 4. Poll job status

```bash
curl -s "$STAGING_URL/api/v1/ocr/jobs/<job_id>/" \
  -H "Authorization: Bearer $TENANT_KEY"
```

Expected: `200`, status progresses to `completed`.

## 5. Revoke key

```bash
curl -s -X POST "$STAGING_URL/internal/v1/keys/550e8400-e29b-41d4-a716-446655440000/revoke" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```

Expected: `200` with `{"status":"revoked",...}`

## 6. Verify revocation (< 60s)

```bash
curl -s -o /dev/null -w "%{http_code}" "$STAGING_URL/api/v1/documents/" \
  -H "Authorization: Bearer $TENANT_KEY"
```

Expected: `401`

## Local automated test

```bash
cd ai_service_platform
pip install pytest bcrypt
pytest tests/test_platform_integration.py -v
```
