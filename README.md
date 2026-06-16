# Unified OCR Platform

A full-stack OCR platform that combines multiple vision-language and document OCR engines with an AI-powered advisor. Upload a sample document, get a RAG-grounded tier and engine recommendation, run a live demo on your data, and integrate via REST API.

## Features

- **Multi-engine OCR** — GOT-OCR 2.0, PaddleOCR-VL, Qianfan-OCR, Nanonets OCR 2, and MiniCPM-V (VLM)
- **Intelligent advisor** — Document fingerprinting, dynamic questioning, and knowledge-base–grounded recommendations
- **Tiered SaaS model** — Starter, Essential, Professional, and Enterprise plans with Stripe billing
- **REST APIs** — v1 (current integrations) and v2 (modern envelope with prefixed resource IDs)
- **Dashboard** — Usage tracking, job history, and API key management
- **Async jobs** — Celery workers for background OCR processing
- **Production-ready** — JWT + API key auth, rate limiting, webhooks, structured logging, and idempotency

## Architecture

```
┌─────────────────┐     ┌──────────────────────────────────────────┐
│  Next.js UI     │────▶│  FastAPI API  (/api/v1, /api/v2)         │
│  (frontend/)    │     │  ├── Advisor + RAG (pgvector / Pinecone) │
└─────────────────┘     │  ├── OCR engines (torch / transformers)  │
                        │  ├── Auth, billing, documents, webhooks   │
                        │  └── Celery workers                      │
                        └──────────┬───────────────┬───────────────┘
                                   │               │
                            ┌──────▼──────┐ ┌──────▼──────┐
                            │ PostgreSQL  │ │    Redis    │
                            │ (pgvector)  │ │ (Celery/RL) │
                            └─────────────┘ └─────────────┘
```

| Layer | Stack |
|-------|-------|
| Frontend | Next.js 14, React 18, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, SQLAlchemy, Celery |
| Database | PostgreSQL 15 + pgvector |
| Cache / queue | Redis |
| ML | PyTorch, Transformers, Hugging Face models |
| LLM / RAG | OpenAI / Anthropic, LangChain, Pinecone (optional) |
| Billing | Stripe |

## Project structure

```
OCR/
├── frontend/              # Next.js web app (marketing, advisor, dashboard)
├── ocr_platform/          # FastAPI backend
│   ├── app/               # API routes, services, models
│   ├── knowledge_base/    # YAML knowledge for the advisor (RAG)
│   ├── workers/           # Celery worker
│   ├── docs/              # API and operations documentation
│   ├── scripts/           # DB setup, KB indexing
│   └── tests/             # Pytest suite
├── docker-compose.yml     # Postgres, Redis, API, worker
└── .env.example           # Environment variable template
```

## Quick start (Docker)

The fastest way to run the full backend stack:

```bash
# 1. Copy environment file and adjust as needed
cp .env.example .env

# 2. Start Postgres, Redis, API, and Celery worker
docker compose up --build
```

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| Swagger docs | http://localhost:8000/docs |
| PostgreSQL | `localhost:5433` (user `postgres`, password `root`) |
| Redis | `localhost:6379` |

Then start the frontend:

```bash
cd frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1" > .env.local
npm install
npm run dev
```

Open http://localhost:3000.

> **Note:** OCR model inference requires a CUDA-capable GPU and large model downloads. For local development without a GPU, the API, advisor (mock RAG), auth, and billing flows still work; set `USE_MOCK_RAG=true` and disable eager model loading in `.env`.

## Local development (without Docker API)

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ with [pgvector](https://github.com/pgvector/pgvector)
- Redis (optional for rate limits and Celery)

### Backend

```bash
# Start infrastructure (Postgres + Redis only)
docker compose up postgres redis -d

# Or set up local Postgres
bash ocr_platform/scripts/setup_postgres.sh

# Python environment
cd ocr_platform
python -m venv ../venv
source ../venv/bin/activate
pip install -r requirements.txt

# From repo root — copy and edit .env
cp .env.example .env

# Run API
uvicorn app.main:app --reload --port 8000

# Optional: Celery worker (separate terminal)
celery -A workers.celery_app worker --loglevel=info
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` to match your API port.

### Index the knowledge base

After Postgres is running and `USE_MOCK_RAG=false`:

```bash
cd ocr_platform
python scripts/index_kb.py
```

## Environment variables

Copy `.env.example` to `.env` at the repo root. Key settings:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis URL for Celery and rate limiting |
| `SECRET_KEY` | JWT signing key — change in production |
| `USE_MOCK_RAG` | `true` skips Pinecone and uses mock advisor context |
| `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` | LLM for advisor chat (optional) |
| `PINECONE_API_KEY` | Vector store for RAG (optional) |
| `STRIPE_*` | Billing (optional — mock checkout without keys) |
| `VLM_*`, `PADDLE_OCR_*`, `QIANFAN_OCR_*`, `NANONETS_OCR_*` | Per-engine model and device settings |
| `CORS_ORIGINS` | Allowed frontend origins |
| `NEXT_PUBLIC_API_URL` | API base URL for the frontend |

See `.env.example` for the full list and defaults.

## API documentation

| Doc | Description |
|-----|-------------|
| [API Reference (v1)](ocr_platform/docs/API_REFERENCE.md) | Current public API |
| [API v2 Reference](ocr_platform/docs/API_V2_REFERENCE.md) | Modern envelope API for new integrations |
| [Authentication](ocr_platform/docs/AUTHENTICATION.md) | JWT and API key flows |
| [Webhooks](ocr_platform/docs/WEBHOOKS.md) | Job completion events |
| [Exception handling](ocr_platform/docs/EXCEPTION_HANDLING.md) | Error response format |
| [Production checklist](ocr_platform/docs/PRODUCTION_CHECKLIST.md) | Pre-deploy security and ops |

Interactive OpenAPI: http://localhost:8000/docs

### Quick API example

```bash
# Register
curl -s http://localhost:8000/api/v1/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"securepass123","full_name":"You"}'

# Login and use the access_token for authenticated routes
curl -s http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"securepass123"}'
```

## OCR engines

| Engine | Model | Best for |
|--------|-------|----------|
| GOT-OCR 2.0 | End-to-end 580M | Academic papers, LaTeX, interactive forms |
| PaddleOCR-VL | 0.9B | Tables, invoices, batch document processing |
| Qianfan-OCR | 4B | Document intelligence, KIE, medical claims |
| Nanonets OCR 2 | 3B | General document OCR |
| MiniCPM-V | VLM | Vision-language tasks, PDF understanding |

Engine profiles, routing rules, and case studies live in [`ocr_platform/knowledge_base/`](ocr_platform/knowledge_base/).

## Frontend pages

| Route | Purpose |
|-------|---------|
| `/` | Marketing landing page with advisor demo widget |
| `/advisor` | Full advisor chat and document upload |
| `/testing` | Sandbox OCR runs against registered models |
| `/dashboard` | Usage, jobs, and API keys |
| `/pricing` | Subscription tiers |
| `/login`, `/register` | Authentication |

## Testing

```bash
cd ocr_platform
source ../venv/bin/activate
pytest
```

## Production deployment

Before going live, review [ocr_platform/docs/PRODUCTION_CHECKLIST.md](ocr_platform/docs/PRODUCTION_CHECKLIST.md):

- Set `DEBUG=false` and a strong `SECRET_KEY`
- Enable `RATE_LIMIT_ENABLED=true`
- Use managed PostgreSQL and Redis with TLS
- Switch from local storage to S3 (`USE_LOCAL_STORAGE=false`)
- Configure live Stripe keys and HTTPS webhooks
- Deploy Celery workers separately from the API process

Health endpoints: `GET /health` (liveness), `GET /api/v1/status/` (service status and model availability).
ß
## License

Proprietary — all rights reserved unless otherwise noted.
