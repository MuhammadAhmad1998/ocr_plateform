import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.db_bootstrap import wait_for_database
from app.core.database import Base, engine
import app.models  # noqa: F401 — register all models
from app.seed import seed_database

settings = get_settings()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    wait_for_database(engine)
    Base.metadata.create_all(bind=engine)
    seed_database()

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
            logger.warning("PaddleOCR-VL preload skipped: %s", exc)

    if settings.QIANFAN_OCR_ENABLED and settings.QIANFAN_OCR_EAGER_LOAD:
        from app.qianfan_ocr.service import qianfan_ocr_service

        try:
            qianfan_ocr_service.load()
            logger.info("Qianfan-OCR model preloaded at startup")
        except RuntimeError as exc:
            logger.warning("Qianfan-OCR preload skipped: %s", exc)

    yield


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)

storage_path = Path(settings.LOCAL_STORAGE_PATH)
storage_path.mkdir(parents=True, exist_ok=True)
if settings.USE_LOCAL_STORAGE:
    app.mount("/storage", StaticFiles(directory=str(storage_path)), name="storage")


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.APP_NAME}
