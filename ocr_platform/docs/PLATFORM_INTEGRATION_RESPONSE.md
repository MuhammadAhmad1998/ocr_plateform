# AI Platform Integration — Delivery & Answers

## Section 6 deliverables

### Connection & auth

| Item | Status | Value |
|------|--------|-------|
| Production base URL | Configure | `PUBLIC_BASE_URL` env (e.g. `https://api.ocr.example.com`) |
| Staging base URL | Configure | `STAGING_BASE_URL` env |
| PLATFORM_API_KEY | Generate & share securely | Set `PLATFORM_API_KEY` on both sides |
| Auth header | Confirmed | `Authorization: Bearer {API_KEY}` (primary); `x-api-key` also supported |
| API key format | Confirmed | Accept `ak_live_*` from platform (bcrypt hash); local dev keys remain `ocr_*` |

### Internal APIs

| Item | Status |
|------|--------|
| `POST /internal/v1/keys/provision` | Implemented |
| `POST /internal/v1/keys/{platform_key_id}/revoke` | Implemented |
| `POST /internal/v1/keys/{platform_key_id}/rotate` | Implemented |
| `PATCH /internal/v1/accounts/{platform_account_id}/quota` | Implemented |
| Internal API docs | [INTERNAL_API.md](./INTERNAL_API.md) |
| `api_keys` schema | Extended — see INTERNAL_API.md |

### API reference pack

| Item | Status |
|------|--------|
| 8 priority endpoints documented | [api_reference_platform.json](./api_reference_platform.json) |
| JSON import format (Section 4.5) | Delivered |

### Environment (OCR service)

```bash
PLATFORM_API_KEY=<shared-with-platform-team>
REQUIRE_API_KEY=false          # true in platform-only production
DISABLE_PUBLIC_AUTH=false      # true to block register/login for marketplace deploys
PUBLIC_BASE_URL=https://api.ocr.example.com
STAGING_BASE_URL=https://staging.api.ocr.example.com
```

---

## Section 7 — answers

| # | Answer |
|---|--------|
| 1 | **Yes** — integration model agreed. Platform provisions keys via internal API; inference validated locally in our Postgres. |
| 2 | **Yes** — set `DISABLE_PUBLIC_AUTH=true` for marketplace deployments. Standalone/dev keeps register/login for our frontend. |
| 3 | **We accept `ak_live_*`** keys you generate. We store your bcrypt `key_hash`. |
| 4 | **`Authorization: Bearer`** primary; `x-api-key` alternate. |
| 5 | Provision + revoke **implemented**. |
| 6 | Schema per spec plus `key_source`, `key_hash_algorithm`, shadow `user_id` for job ownership. `ocr_jobs.webhook_url` exists. |
| 7 | **Yes** — `docs/api_reference_platform.json`. |
| 8 | All **tenant inference** endpoints (documents, OCR, models) require API key when `REQUIRE_API_KEY=true`. Raw ML routes (`/vlm/*`, etc.) are not part of tenant API surface. |
| 9 | **Quota headers** on responses + **webhook** on job completion (`webhook_url` in job create). No per-request callback to your platform. |
| 10 | Ready for joint staging test after URLs and `PLATFORM_API_KEY` are exchanged. |

---

## Dual-mode operation

| Consumer | Auth | Notes |
|----------|------|-------|
| **Our Next.js frontend** | JWT (`/api/v1/auth/login`) | Unchanged — advisor, demo, dashboard |
| **AI Platform tenants** | `ak_live_*` API key | Provisioned via `/internal/v1/keys/provision` |

Both can use the same OCR service. Set `REQUIRE_API_KEY=false` (default) to allow JWT on inference routes for the frontend.
