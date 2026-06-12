from fastapi import APIRouter

from app.api.v2 import documents, models, ocr

api_router = APIRouter()
api_router.include_router(ocr.router)
api_router.include_router(documents.router)
api_router.include_router(models.router)
