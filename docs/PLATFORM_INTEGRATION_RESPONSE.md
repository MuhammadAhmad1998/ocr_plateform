# AI Platform Integration — Delivery & Answers

## Section 6 deliverables

### Connection & auth

| Item | Status | Value |
|------|--------|-------|
| Production base URL | Configure | `PUBLIC_BASE_URL` env (e.g. `https://api.ocr.example.com`) |
| Staging base URL | Configure | `STAGING_BASE_URL` env |
| PLATFORM_API_KEY | Generate & share securely | Set `PLATFORM_API_KEY` on both sides |
| Auth header | Confirmed | `Authorization: Bearer {API_KEY}` (primary); `x-api-key` also supported |
| API key format | Confirmed | Accept `ak_live_*` from platform (bcrypt hash) |

### Internal APIs

| Item | Status |
|------|--------|
| `POST /internal/v1/keys/provision` | Implemented |
| `POST /internal/v1/keys/{platform_key_id}/revoke` | Implemented |
| `POST /internal/v1/keys/{platform_key_id}/rotate` | Implemented |
| `PATCH /internal/v1/accounts/{platform_account_id}/quota` | Implemented |
| Internal API docs | [INTERNAL_API.md](./INTERNAL_API.md) |
| `api_keys` schema | See INTERNAL_API.md |

### API reference pack

| Item | Status |
|------|--------|
| 8 priority endpoints documented | [api_reference_platform.json](./api_reference_platform.json) |
| JSON import format (Section 4.5) | Delivered |

### Database

| Item | Status |
|------|--------|
| `api_keys` with scopes, quota, platform columns | `platform_api/models.py` |
| `ocr_jobs.webhook_url` | Present |
| Migrations | `Base.metadata.create_all` on startup (Postgres) |

### Environment (this service)

```bash
PLATFORM_API_KEY=<shared-with-platform-team>
REQUIRE_API_KEY=true
WEBHOOK_SECRET=<optional-signing-secret>
PUBLIC_BASE_URL=https://api.ocr.example.com
STAGING_BASE_URL=https://staging.api.ocr.example.com
```

---

## Section 7 — answers

| # | Answer |
|---|--------|
| 1 | **Yes** — integration model agreed. Platform provisions keys via internal API; inference validated locally in our Postgres. |
| 2 | **N/A for this service** — `ai_service_platform` has no public register/login. Marketplace tenants never use a login UI here. |
| 3 | **We accept `ak_live_*`** keys you generate. We store your bcrypt `key_hash`. |
| 4 | **`Authorization: Bearer`** primary; `x-api-key` alternate. |
| 5 | Provision + revoke **implemented**. |
| 6 | Schema per Section 3.3 plus `key_hash_algorithm`. `ocr_jobs.webhook_url` exists. |
| 7 | **Yes** — `docs/api_reference_platform.json`. |
| 8 | **Yes** — all inference endpoints (documents, OCR, models, testing, `/vlm/*`, `/paddle-ocr/*`, etc.) require API key when `REQUIRE_API_KEY=true`. |
| 9 | **Quota headers** (`X-Quota-Used`, `X-Quota-Limit`) on job create + **webhook** on job completion/failure (`webhook_url` in job create). No per-request callback to your platform. |
| 10 | Ready for joint staging test after URLs and `PLATFORM_API_KEY` are exchanged. |

---

## Service split

| Service | Port | Audience |
|---------|------|----------|
| `ocr_platform` + `frontend/` | 8000 / 8003 | Your app (JWT login, advisor, dashboard) |
| **`ai_service_platform`** | **8004** | AI Platform marketplace tenants (API keys only) |

This backend is standalone — not linked to the Next.js frontend.
