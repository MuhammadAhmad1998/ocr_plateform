# Production Deployment Checklist

Use this checklist before deploying the OCR Platform API to production.

---

## Environment variables

| Variable | Production value | Notes |
|----------|------------------|-------|
| `DEBUG` | `false` | Hides internal error details from 500 responses |
| `SECRET_KEY` | Strong random hex (32+ bytes) | **Never** use the default `change-me-in-production-use-openssl-rand-hex-32` |
| `DATABASE_URL` | Managed PostgreSQL URL | Use SSL (`?sslmode=require`) when supported |
| `REDIS_URL` | Managed Redis URL | Required for rate limits, Celery, idempotency |
| `RATE_LIMIT_ENABLED` | `true` | Tier-based limits on OCR/ML routes |
| `CORS_ORIGINS` | Your frontend origin(s) | Comma-separated; no `*` with credentials |
| `MAX_UPLOAD_SIZE_MB` | `10` (or your policy) | Aligns with request body size middleware |
| `USE_LOCAL_STORAGE` | `false` | Use S3 in production |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `S3_BUCKET` | Set when using S3 | |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Live keys | Webhook endpoint must be HTTPS |

### Tier rate limits (optional overrides)

```env
RATE_LIMIT_REQUESTS_FREE=30
RATE_LIMIT_REQUESTS_BASIC=60
RATE_LIMIT_REQUESTS_PRO=120
RATE_LIMIT_REQUESTS_ENTERPRISE=300
RATE_LIMIT_WINDOW_SECONDS=60
```

---

## Startup security checks

On startup with `DEBUG=false`, the API logs an **error** if `SECRET_KEY` is still the default. Fix before going live.

Generate a key:

```bash
openssl rand -hex 32
```

---

## Health and status

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness — process is up |
| `GET /health/ready` | Readiness — database + Redis |
| `GET /api/v1/status/` | Public status — version, uptime, models, degraded flags |

Configure your load balancer or orchestrator to use `/health/ready` for readiness probes.

---

## Redis

- Required when `RATE_LIMIT_ENABLED=true`
- Used by Celery broker/backend (if workers enabled)
- Failure degrades rate limiting (requests allowed) and readiness check

---

## PostgreSQL

- Run migrations / `create_all` on first deploy
- Seed data (`seed_database`) creates tiers and test user in dev only — review for production
- Back up before schema changes

---

## CORS

Set `CORS_ORIGINS` to exact frontend URLs:

```env
CORS_ORIGINS=https://app.example.com,https://www.example.com
```

---

## Stripe

1. Create live products/prices matching tier slugs (`basic`, `pro`, etc.)
2. Set `stripe_price_id` on `tiers` table (or via admin)
3. Register webhook: `checkout.session.completed` → your API billing webhook URL
4. Set `STRIPE_WEBHOOK_SECRET` from the Stripe dashboard

---

## API keys and scopes

- Create keys via `POST /api/v1/dashboard/api-keys/` (JWT)
- Optional scopes: `ocr:read`, `ocr:write`
- Revoke via `POST /api/v1/dashboard/api-keys/{id}/revoke/`
- Raw key shown once at creation — store securely

---

## Observability

- Structured JSON request logs (no tokens or API keys)
- `X-Request-ID` on all responses — propagate in support tickets
- `X-Processing-Time-Ms` on inference routes
- `X-Quota-Used` / `X-Quota-Limit` on OCR job submit (when subscription exists)

---

## Pre-launch smoke test

```bash
cd ocr_plateform/ocr_platform
python3 -m pytest tests/ -v
curl -s http://localhost:8000/health/ready
curl -s http://localhost:8000/api/v1/status/
```

---

## UI smoke test (frontend unchanged)

- Login
- Advisor upload
- Testing page run
