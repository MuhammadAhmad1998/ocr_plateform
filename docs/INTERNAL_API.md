# Internal API — AI Platform Integration

Server-to-server endpoints for the AI Platform marketplace.  
**Not for tenant use.** Protected by `PLATFORM_API_KEY`.

Base path: `/internal/v1`

## Authentication

```http
Authorization: Bearer <PLATFORM_API_KEY>
Content-Type: application/json
```

Configure the same secret on both sides:

```bash
PLATFORM_API_KEY=<shared-secret>
```

## `POST /internal/v1/keys/provision`

Create an API key row from data the platform generates.

**Request body:**

```json
{
  "platform_key_id": "550e8400-e29b-41d4-a716-446655440000",
  "plain_key": "ak_live_xxxxxxxxxxxxxxxx",
  "key_prefix": "ak_live_xxxx",
  "key_hash": "$2b$12$...",
  "platform_tenant_id": "uuid",
  "platform_account_id": "uuid",
  "platform_user_id": "uuid",
  "platform_subscription_id": "uuid",
  "user_email": "developer@company.com",
  "user_full_name": "Jane Developer",
  "account_type": "company",
  "company_name": "Acme Corp",
  "service_slug": "ocr",
  "key_name": "Production Key",
  "scopes": ["ocr:read", "ocr:write"],
  "quota_limit": 1000,
  "quota_unit": "pages",
  "plan_slug": "professional"
}
```

**Response 201:**

```json
{
  "ocr_key_id": "660e8400-e29b-41d4-a716-446655440001",
  "status": "active"
}
```

**Errors:** 401 (invalid platform secret), 409 (duplicate `platform_key_id`), 422 (validation)

## `POST /internal/v1/keys/{platform_key_id}/revoke`

Deactivate a provisioned key. Takes effect immediately.

**Response 200:**

```json
{
  "platform_key_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "revoked"
}
```

**Errors:** 401, 404

## `POST /internal/v1/keys/{platform_key_id}/rotate`

Update hash and prefix for an existing platform key.

**Request body:**

```json
{
  "key_prefix": "ak_live_yyyy",
  "key_hash": "$2b$12$..."
}
```

**Response 200:**

```json
{
  "ocr_key_id": "660e8400-e29b-41d4-a716-446655440001",
  "platform_key_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "active"
}
```

## `PATCH /internal/v1/accounts/{platform_account_id}/quota`

Update `quota_limit` on all platform keys for an account.

**Request body:**

```json
{
  "quota_limit": 5000,
  "quota_unit": "pages",
  "plan_slug": "enterprise"
}
```

**Response 200:**

```json
{
  "platform_account_id": "uuid",
  "keys_updated": 2,
  "quota_limit": 5000
}
```

## `api_keys` table (platform columns)

| Column | Description |
|--------|-------------|
| `id` | OCR service primary key (`ocr_key_id` in responses) |
| `platform_key_id` | Platform key UUID (revoke/rotate sync) |
| `platform_account_id` | Tenant account — isolation & quota patch |
| `platform_user_id` | Who created the key |
| `user_email` | Logs / support |
| `key_prefix` | First 12 chars (fast lookup) |
| `key_hash` | bcrypt (platform) or SHA-256 (local `ocr_*` keys) |
| `key_hash_algorithm` | `bcrypt` or `sha256` |
| `key_source` | `platform` or `local` |
| `scopes` | `["ocr:read", "ocr:write"]` |
| `is_active` | `false` when revoked |
| `quota_limit` / `quota_used` | Per-key quota for platform keys |
| `expires_at` / `last_used_at` | Optional expiry; updated on use |
| `created_at` | — |

## Integration test flow

```bash
# 1. Provision key (platform server)
curl -X POST "$OCR_BASE/internal/v1/keys/provision" \
  -H "Authorization: Bearer $PLATFORM_API_KEY" \
  -H "Content-Type: application/json" \
  -d @provision.json

# 2. Upload document (tenant, API key)
curl -X POST "$OCR_BASE/api/v1/documents/" \
  -H "Authorization: Bearer $TENANT_API_KEY" \
  -F "file=@sample.pdf"

# 3. Create OCR job
curl -X POST "$OCR_BASE/api/v1/ocr/jobs/" \
  -H "Authorization: Bearer $TENANT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"document_id":"<id>","tier_slug":"basic"}'

# 4. Revoke key
curl -X POST "$OCR_BASE/internal/v1/keys/<platform_key_id>/revoke" \
  -H "Authorization: Bearer $PLATFORM_API_KEY"
```
