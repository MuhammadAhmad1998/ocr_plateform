# Unified OCR Platform

AI-powered OCR aggregation platform with conversational tier recommendation, RAG-grounded advisory, and live document validation.

## Architecture

```
OCR/
├── ocr_platform/          # FastAPI backend
│   ├── app/
│   │   ├── main.py        # API entry point
│   │   ├── core/          # Config, auth, database, storage
│   │   ├── accounts/      # User & subscription models
│   │   ├── advisor/       # Chat sessions, LLM, fingerprinting
│   │   ├── rag/           # RAG retrieval (Pinecone / mock)
│   │   ├── ocr_engine/    # OCR jobs, Celery tasks, adapters
│   │   ├── registry/      # Tier & engine capability matrix
│   │   ├── billing/       # Stripe integration
│   │   └── api/v1/        # REST endpoints
│   └── workers/           # Celery worker
├── frontend/              # Next.js 14 frontend
│   └── src/
│       ├── app/           # Pages (advisor, dashboard, checkout)
│       ├── components/    # UI components
│       └── lib/           # API client, Zustand store
└── docker-compose.yml     # PostgreSQL, Redis, API, Worker
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for frontend)
- Python 3.11+ (optional, for local backend)

### 1. Start infrastructure & backend

```bash
cp .env.example .env
docker compose up -d postgres redis
```

### 2. Run backend locally

```bash
cd ocr_platform
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://ocr:ocr@localhost:5432/ocr_platform
export REDIS_URL=redis://localhost:6379/0
export USE_LOCAL_STORAGE=true
uvicorn app.main:app --reload --port 8000
```

Or with Docker:

```bash
docker compose up api worker
```

API docs: http://localhost:8000/api/docs

### 3. Run frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

## User Flow

1. **Register/Login** — JWT authentication required
2. **Upload document** — PDF/PNG/JPG on `/advisor`
3. **Chat with AI advisor** — SSE streaming, discovery questions
4. **Get tier recommendation** — Primary + alternative with reasoning
5. **Live demo** — Auto OCR on your document (1 run/session)
6. **Checkout** — Stripe subscription (mock without keys)
7. **Dashboard** — API keys, usage, job history

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register/` | Create account |
| POST | `/api/v1/auth/login/` | Get JWT tokens |
| GET | `/api/v1/auth/me/` | User profile |
| POST | `/api/v1/advisor/upload/` | Upload document |
| POST | `/api/v1/advisor/message/` | Chat (SSE stream) |
| POST | `/api/v1/demo/run/` | Trigger OCR demo |
| GET | `/api/v1/demo/result/{id}/` | Poll demo result |
| POST | `/api/v1/billing/checkout/` | Stripe checkout |
| GET | `/api/v1/dashboard/usage/` | Usage stats |

## Configuration

Copy `.env.example` to `.env`. Key settings:

- `OPENAI_API_KEY` — Enables real LLM advisor (mock without it)
- `STRIPE_SECRET_KEY` — Enables real checkout (mock without it)
- `PINECONE_API_KEY` — Enables real RAG (mock by default)
- `USE_LOCAL_STORAGE=true` — Local file storage instead of S3

## Tech Stack

**Backend:** FastAPI, SQLAlchemy, Celery, Redis, PostgreSQL, JWT auth

**Frontend:** Next.js 14, TypeScript, Tailwind CSS, TanStack Query, Zustand

**OCR:** Tesseract adapter (local), mock neural adapters for demo tiers

## Development Notes

- Database auto-creates tables and seeds tiers/engines on startup
- Celery worker falls back to synchronous processing if Redis unavailable
- Demo limited to 1 upload + 1 OCR run per advisor session
