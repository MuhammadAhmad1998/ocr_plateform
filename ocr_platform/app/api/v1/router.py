from fastapi import APIRouter

from app.api.v1 import advisor, auth, billing, demo, ocr

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(advisor.router)
api_router.include_router(demo.router)
api_router.include_router(billing.router)
api_router.include_router(ocr.router)
