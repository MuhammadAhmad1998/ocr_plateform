import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from platform_api.accounts import get_or_create_default_account
from platform_api.config import get_settings
from platform_api.database import Base, SessionLocal, engine
from platform_api.exception_handlers import register_exception_handlers
from platform_api.middleware import ProcessingTimeMiddleware, RequestIdMiddleware
from platform_api.ocr_bridge import get_ml_routers, preload_ml_models
from platform_api.routes import (
    documents_v1,
    documents_v2,
    models_v1,
    models_v2,
    ocr_v1,
    ocr_v2,
    status,
    testing,
)
from platform_api.seed import seed_registry

logger = logging.getLogger(__name__)
settings = get_settings()

OPENAPI_TAGS = [
    {"name": "status", "description": "Service status and uptime."},
    {"name": "documents", "description": "Upload, list, and retrieve documents."},
    {"name": "ocr", "description": "Production OCR job queue and status."},
    {"name": "models", "description": "OCR / VLM model catalog."},
    {"name": "testing", "description": "Sandbox OCR runs against any model."},
    {"name": "vlm", "description": "MiniCPM-V vision-language model inference."},
    {"name": "paddle-ocr", "description": "PaddleOCR-VL document OCR."},
    {"name": "got-ocr", "description": "GOT-OCR2 document OCR."},
    {"name": "qianfan-ocr", "description": "Qianfan-OCR document OCR."},
    {"name": "V2", "description": "Envelope API with prefixed ids (doc_, job_)."},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_registry(db)
        get_or_create_default_account(db)
    finally:
        db.close()
    preload_ml_models()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description=(
        "Standalone open OCR API (port 8004). "
        "No authentication required. Not connected to the Next.js frontend."
    ),
    openapi_tags=OPENAPI_TAGS,
    lifespan=lifespan,
)

register_exception_handlers(app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ProcessingTimeMiddleware)
app.add_middleware(RequestIdMiddleware)

api_v1 = APIRouter()
api_v1.include_router(status.router)
api_v1.include_router(documents_v1.router)
api_v1.include_router(ocr_v1.router)
api_v1.include_router(models_v1.router)
api_v1.include_router(testing.router)
for ml_router in get_ml_routers():
    api_v1.include_router(ml_router)

api_v2 = APIRouter()
api_v2.include_router(documents_v2.router)
api_v2.include_router(ocr_v2.router)
api_v2.include_router(models_v2.router)

app.include_router(api_v1, prefix=settings.API_V1_PREFIX)
app.include_router(api_v2, prefix=settings.API_V2_PREFIX)

storage_path = Path(settings.LOCAL_STORAGE_PATH)
storage_path.mkdir(parents=True, exist_ok=True)
if settings.USE_LOCAL_STORAGE:
    app.mount("/storage", StaticFiles(directory=str(storage_path)), name="storage")


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.APP_NAME}


@app.get("/health/ready")
def health_ready():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready", "checks": {"database": "ok"}}
    except Exception as exc:
        logger.warning("Readiness failed: %s", exc)
        return JSONResponse(status_code=503, content={"status": "not_ready", "checks": {"database": "error"}})
