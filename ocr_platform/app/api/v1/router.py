from fastapi import APIRouter

from app.api.v1 import (
    advisor,
    auth,
    billing,
    demo,
    documents,
    got_ocr,
    models,
    ocr,
    paddle_ocr,
    qianfan_ocr,
    status,
    testing,
    vlm,
)

api_router = APIRouter()
api_router.include_router(status.router)
api_router.include_router(auth.router)
api_router.include_router(advisor.router)
api_router.include_router(documents.router)
api_router.include_router(models.router)
api_router.include_router(demo.router)
api_router.include_router(billing.router)
api_router.include_router(ocr.router)
api_router.include_router(testing.router)
api_router.include_router(vlm.router)
api_router.include_router(paddle_ocr.router)
api_router.include_router(qianfan_ocr.router)
api_router.include_router(got_ocr.router)
