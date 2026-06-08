from fastapi import APIRouter

from app.api.v1 import advisor, auth, billing, demo, ocr, paddle_ocr, testing, vlm

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(advisor.router)
api_router.include_router(demo.router)
api_router.include_router(billing.router)
api_router.include_router(ocr.router)
api_router.include_router(testing.router)
api_router.include_router(vlm.router)
api_router.include_router(paddle_ocr.router)
