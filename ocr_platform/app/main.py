import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

# Must be set BEFORE any torch import to reduce CUDA memory fragmentation.
# This helps avoid OOM when switching between large models.
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.api.v1.router import api_router as api_v1_router
from app.api.v2.router import api_router as api_v2_router
from app.api.internal.v1.router import router as internal_v1_router
from app.core.config import get_settings
from app.core.exception_handlers import register_exception_handlers
from app.core.middleware import (
    DeprecationMiddleware,
    ProcessingTimeMiddleware,
    RequestBodySizeLimitMiddleware,
    RequestIdMiddleware,
    StructuredLoggingMiddleware,
)
from app.core.security_checks import validate_production_settings
from app.core.rate_limit import RateLimitMiddleware
from app.core.db_bootstrap import sync_database_schema, wait_for_database
from app.core.database import Base, engine
import app.models  # noqa: F401 — register all models
from app.seed import seed_database

settings = get_settings()
logger = logging.getLogger(__name__)

OPENAPI_TAGS = [
    {"name": "status", "description": "Public service status, uptime, and model availability."},
    {"name": "auth", "description": "Register, login, refresh tokens, and current user profile."},
    {"name": "documents", "description": "Upload, retrieve, and list documents (public API)."},
    {"name": "models", "description": "List available OCR and VLM models (public API)."},
    {"name": "advisor", "description": "Document upload, chat sessions, and OCR tier recommendations."},
    {"name": "demo", "description": "Demo OCR runs tied to advisor sessions."},
    {"name": "billing", "description": "Stripe checkout and subscription management."},
    {"name": "ocr", "description": "Production OCR job submission and status (JWT or API key)."},
    {"name": "dashboard", "description": "Usage, job history, and API key management."},
    {"name": "testing", "description": "Model registry and sandbox OCR runs (legacy paths — prefer /models/)."},
    {"name": "vlm", "description": "MiniCPM-V vision-language model inference."},
    {"name": "paddle-ocr", "description": "PaddleOCR-VL document OCR."},
    {"name": "got-ocr", "description": "GOT-OCR2 document OCR."},
    {"name": "qianfan-ocr", "description": "Qianfan-OCR document OCR."},
    {
        "name": "V2",
        "description": (
            "Modern envelope API (`object`, `id`, `created_at`, `request_id`, `data`). "
            "Prefixed ids (`job_`, `doc_`). API key auth by default; JWT optional. "
            "See docs/API_V2_REFERENCE.md."
        ),
    },
    {
        "name": "internal",
        "description": "AI Platform marketplace integration — key provisioning (PLATFORM_API_KEY required).",
    },
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_production_settings(settings)
    wait_for_database(engine)
    from app.rag.store import ensure_pgvector_extension

    ensure_pgvector_extension()
    Base.metadata.create_all(bind=engine)
    sync_database_schema(engine)
    seed_database()

    if not settings.USE_MOCK_RAG:
        from app.rag.indexer import ensure_kb_indexed

        ensure_kb_indexed()

    if settings.VLM_ENABLED and settings.VLM_EAGER_LOAD:
        from app.vlm.service import vlm_service

        try:
            vlm_service.load()
            logger.info("VLM model preloaded at startup")
        except RuntimeError as exc:
            logger.warning("VLM preload skipped: %s", exc)

    if settings.PADDLE_OCR_ENABLED and settings.PADDLE_OCR_EAGER_LOAD:
        from app.paddle_ocr.service import paddle_ocr_service

        try:
            paddle_ocr_service.load()
            logger.info("PaddleOCR-VL model preloaded at startup")
        except RuntimeError as exc:
            logger.warning("PaddleOCR preload skipped: %s", exc)

    if settings.QIANFAN_OCR_ENABLED and settings.QIANFAN_OCR_EAGER_LOAD:
        from app.qianfan_ocr.service import qianfan_ocr_service

        try:
            qianfan_ocr_service.load()
            logger.info("Qianfan-OCR model preloaded at startup")
        except RuntimeError as exc:
            logger.warning("Qianfan-OCR preload skipped: %s", exc)

    if settings.GOT_OCR_ENABLED and settings.GOT_OCR_EAGER_LOAD:
        from app.got_ocr.service import got_ocr_service

        try:
            got_ocr_service.load()
            logger.info("GOT-OCR model preloaded at startup")
        except RuntimeError as exc:
            logger.warning("GOT-OCR preload skipped: %s", exc)

    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "Unified OCR Platform API for document processing, tier recommendations, "
        "billing, and ML inference.\n\n"
        "**Authentication:** JWT for dashboard, advisor, and billing routes; "
        "API keys for production OCR jobs (`POST/GET /ocr/jobs/`).\n\n"
        "See `/docs` for interactive exploration or `docs/API_REFERENCE.md` for cURL examples."
    ),
    contact={"name": "OCR Platform Support", "email": "support@example.com"},
    license_info={"name": "Proprietary"},
    servers=[
        {"url": "http://localhost:8000", "description": "Local development"},
        {"url": "https://api.example.com", "description": "Production"},
    ],
    openapi_tags=OPENAPI_TAGS,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

register_exception_handlers(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestBodySizeLimitMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(DeprecationMiddleware)
app.add_middleware(ProcessingTimeMiddleware)
app.add_middleware(StructuredLoggingMiddleware)
app.add_middleware(RequestIdMiddleware)

app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)
app.include_router(api_v2_router, prefix=settings.API_V2_PREFIX)
app.include_router(internal_v1_router, prefix="/internal/v1")

storage_path = Path(settings.LOCAL_STORAGE_PATH)
storage_path.mkdir(parents=True, exist_ok=True)
if settings.USE_LOCAL_STORAGE:
    app.mount("/storage", StaticFiles(directory=str(storage_path)), name="storage")


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.APP_NAME}


@app.get("/health/ready")
def health_ready():
    checks: dict[str, str] = {}
    status_code = 200

    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        logger.warning("Readiness check failed for database: %s", exc)
        checks["database"] = "error"
        status_code = 503

    try:
        import redis

        client = redis.from_url(settings.REDIS_URL)
        client.ping()
        checks["redis"] = "ok"
    except Exception as exc:
        logger.warning("Readiness check failed for redis: %s", exc)
        checks["redis"] = "error"
        status_code = 503

    body = {
        "status": "ready" if status_code == 200 else "not_ready",
        "checks": checks,
    }
    return JSONResponse(status_code=status_code, content=body)
