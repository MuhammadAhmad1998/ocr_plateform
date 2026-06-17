# AI Service Platform — Service Guide

Standalone open OCR API backend. **Port 8004.** No authentication.

| Service | Port | Purpose |
|---------|------|---------|
| `frontend/` + `ocr_platform/` | 8000 / 8003 | Main app (login, advisor, dashboard) |
| **`ai_service_platform/`** | **8004** | Public OCR API — open access |

---

## What this service is

`ai_service_platform` is a separate FastAPI backend that exposes OCR and ML inference endpoints without login, API keys, or billing. It reuses the OCR/ML engine code from the sibling `ocr_platform/` folder as a library only — it is **not** connected to the Next.js frontend.

**Included:** documents, OCR jobs, model catalog, testing sandbox, VLM, PaddleOCR, GOT-OCR, Qianfan-OCR.

**Not included:** user registration, login, Stripe, advisor chat, dashboard, API key management.

---

## Project layout

```
ai_service_platform/
├── platform_api/
│   ├── main.py              # FastAPI app entry
│   ├── config.py            # Environment settings
│   ├── database.py          # SQLAlchemy engine
│   ├── models.py            # DB models (accounts, documents, jobs, engines)
│   ├── ocr_bridge.py        # Lazy import bridge to ../ocr_platform ML code
│   ├── ocr_service.py       # OCR job processing + webhooks
│   ├── routes/              # API route handlers
│   ├── seed.py              # Tiers & engines seed data
│   └── webhooks.py          # Optional job completion webhooks
├── run.sh                   # Start server (0.0.0.0:8004)
├── requirements.txt
├── requirements-ocr-engine.txt
├── .env.example
├── storage/                 # Local file uploads (default)
└── tests/
```

---

## Quick start

```bash
cd ai_service_platform
python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt -r requirements-ocr-engine.txt

# PDF support — use pymupdf, NOT the PyPI package named "fitz"
pip uninstall -y fitz 2>/dev/null || true
pip install pymupdf

cp .env.example .env
# Edit DATABASE_URL if needed

bash run.sh
```

**Interactive docs:** http://localhost:8004/docs

**Equivalent manual start:**

```bash
export PYTHONPATH=../ocr_platform
uvicorn platform_api.main:app --host 0.0.0.0 --port 8004
```

---

## Public access

`run.sh` binds to `0.0.0.0`, so the API is reachable on your machine's IP (e.g. `http://154.57.212.236:8004/docs`).

1. Confirm locally: `curl http://127.0.0.1:8004/health`
2. Open firewall port 8004: `sudo ufw allow 8004/tcp`
3. Allow inbound TCP 8004 in your VPS/cloud security group
4. Optional in `.env`: `PUBLIC_BASE_URL=http://YOUR_PUBLIC_IP:8004`

> **Warning:** This API has no auth. Anyone who can reach the port can upload files and run inference. Use only for demos/dev, or put behind a reverse proxy with restrictions.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://ocr:ocr@localhost:5432/ai_service_ocr` | Postgres database (separate from `ocr_platform`) |
| `REDIS_URL` | `redis://localhost:6379/1` | Used for status checks; Celery if available |
| `PUBLIC_BASE_URL` | `http://localhost:8004` | Public base URL for docs/links |
| `LOCAL_STORAGE_PATH` | `./storage` | Local upload directory |
| `USE_LOCAL_STORAGE` | `true` | Serve files from `/storage` |
| `CORS_ORIGINS` | `*` | CORS allowed origins |
| `PORT` | `8004` | Set before `run.sh` to change port |

Model flags (`VLM_ENABLED`, `PADDLE_OCR_ENABLED`, etc.) are read from the repo root `.env` or `ocr_platform` settings.

---

## Authentication

**None.** All endpoints are open. No `Authorization` header required. Swagger shows no Authorize button.

Requests are attributed to a single default account created at startup (`get_default_account`).

---

## API endpoints

Base URL examples:
- Local: `http://localhost:8004`
- Public: `http://154.57.212.236:8004`

### Health (no prefix)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness check |
| GET | `/health/ready` | Readiness (DB check) |

### Status — `/api/v1`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/status/` | Uptime, model flags, DB/Redis health |

### Documents — `/api/v1` and `/api/v2`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/documents/` | Upload a document (multipart `file`) |
| GET | `/api/v1/documents/` | List documents (`limit`, `starting_after`) |
| GET | `/api/v1/documents/{document_id}/` | Get one document |
| POST | `/api/v2/documents/` | Upload (v2 envelope, id prefix `doc_`) |
| GET | `/api/v2/documents/` | List (v2 envelope) |
| GET | `/api/v2/documents/{document_id}/` | Get one (v2 envelope) |

**Upload example:**

```bash
curl -X POST "http://localhost:8004/api/v1/documents/" \
  -F "file=@sample.pdf"
```

### OCR jobs — `/api/v1` and `/api/v2`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/ocr/jobs/` | Queue OCR job → `202` |
| GET | `/api/v1/ocr/jobs/{job_id}/` | Poll job status/result |
| POST | `/api/v2/ocr/jobs/` | Queue job (v2 envelope, id prefix `job_`) |
| GET | `/api/v2/ocr/jobs/{job_id}/` | Poll job (v2 envelope) |

**Create job example:**

```bash
curl -X POST "http://localhost:8004/api/v1/ocr/jobs/" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": "550e8400-e29b-41d4-a716-446655440000",
    "tier_slug": "basic",
    "webhook_url": "https://example.com/hooks/ocr"
  }'
```

**Tiers:** `free`, `basic`, `pro`, `enterprise` (seeded at startup).

**Job statuses:** `queued` → `processing` → `completed` or `failed`.

Optional `webhook_url` triggers a signed POST (`X-OCR-Signature`) when the job finishes.

### Models — `/api/v1` and `/api/v2`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/models/` | Model catalog |
| GET | `/api/v2/models/` | Model catalog (v2 envelope) |

### Testing sandbox — `/api/v1/testing`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/testing/models/` | Models available for sandbox runs |
| POST | `/api/v1/testing/run/` | Run OCR on upload (multipart: `file`, `model_slug`, …) |

**Sandbox run example:**

```bash
curl -X POST "http://localhost:8004/api/v1/testing/run/" \
  -F "file=@page.png" \
  -F "model_slug=paddle-ocr-vl" \
  -F "task=ocr"
```

### ML inference (from `ocr_platform` engine)

Mounted under `/api/v1`:

| Prefix | Endpoints | Description |
|--------|-----------|-------------|
| `/api/v1/vlm/` | `POST /chat/`, `POST /chat/multi/`, `POST /pdf/analyze/`, `GET /health/` | Vision-language model |
| `/api/v1/paddle-ocr/` | `POST /recognize/`, `POST /pdf/analyze/`, `GET /health/` | PaddleOCR-VL |
| `/api/v1/got-ocr/` | `POST /recognize/`, `POST /pdf/analyze/`, `GET /health/` | GOT-OCR 2.0 |
| `/api/v1/qianfan-ocr/` | `POST /recognize/`, `POST /pdf/analyze/`, `GET /health/` | Qianfan-OCR |

See Swagger at `/docs` for full request/response schemas per model.

### Static files

When `USE_LOCAL_STORAGE=true`, uploaded files are served at:

```
GET /storage/{path}
```

---

## V1 vs V2 API

| | V1 | V2 |
|---|----|----|
| Document IDs | UUID string | `doc_{uuid}` |
| Job IDs | UUID string | `job_{uuid}` |
| Response shape | Flat JSON | Envelope: `{ object, id, created_at, request_id, data }` |

Both versions are open and require no auth.

---

## Database

- **Database name:** `ai_service_ocr` (Postgres)
- **Tables:** `accounts`, `api_keys`, `documents`, `ocr_jobs`, `tiers`, `engines`
- **Schema:** created automatically on startup (`Base.metadata.create_all`)
- **Seed data:** tiers and engines inserted on first run

Create the database if it does not exist:

```bash
createdb -U ocr ai_service_ocr
```

---

## Architecture

```
Client (browser / curl)
        │
        ▼
┌───────────────────────────────┐
│  ai_service_platform :8004    │
│  FastAPI (platform_api/)      │
│  • routes (documents, OCR, …) │
│  • default account (no auth)  │
└───────────────┬───────────────┘
                │
     ┌──────────┴──────────┐
     ▼                     ▼
 PostgreSQL            ../ocr_platform
 (ai_service_ocr)      (ML engine library)
                       VLM, Paddle, GOT, Qianfan
```

`ocr_bridge.py` adds `../ocr_platform` to `PYTHONPATH` at runtime and lazy-loads engine modules so the service starts even when heavy ML deps are optional.

---

## Typical workflow

1. **Upload** a PDF or image → `POST /api/v1/documents/`
2. **Create OCR job** with `document_id` → `POST /api/v1/ocr/jobs/`
3. **Poll** until `status` is `completed` → `GET /api/v1/ocr/jobs/{job_id}/`
4. Read `result` from the job response

**Or** use the testing sandbox for a one-shot run without storing a document:

```bash
curl -X POST "http://localhost:8004/api/v1/testing/run/" \
  -F "file=@invoice.pdf" \
  -F "model_slug=qianfan-ocr"
```

---

## Troubleshooting

### `ModuleNotFoundError: No module named 'frontend'` on `import fitz`

Wrong PyPI package installed:

```bash
pip uninstall -y fitz
pip install pymupdf
```

### `OCR engine not found at .../ocr_platform`

The `ocr_platform` folder must sit next to `ai_service_platform` in the repo:

```
ocr_plateform/
├── ocr_platform/
└── ai_service_platform/
```

### Database connection errors

- Postgres running?
- Database `ai_service_ocr` exists?
- `DATABASE_URL` correct in `.env`?

### Public URL not reachable

- Server running with `--host 0.0.0.0`?
- Firewall / cloud security group allows TCP 8004?
- Test: `curl http://YOUR_IP:8004/health`

### ML model endpoints return 503

Model may be disabled. Check `/api/v1/status/` for `models.vlm`, `models.paddle`, etc. Enable in repo `.env`:

```bash
VLM_ENABLED=true
PADDLE_OCR_ENABLED=true
# etc.
```

---

## Tests

```bash
cd ai_service_platform
pip install pytest
pytest tests/ -v
```

---

## Related docs (legacy / reference)

Older marketplace integration docs remain in `docs/` but **auth is disabled** in the current deployment:

- `docs/api_reference_platform.json` — API reference JSON (auth sections outdated)
- `docs/INTERNAL_API.md` — Internal key APIs (not mounted)
- `docs/PLATFORM_INTEGRATION_RESPONSE.md` — Integration checklist (outdated)

For the **current** open-access service, this file (`SERVICE_GUIDE.md`) and `/docs` (Swagger) are the source of truth.
