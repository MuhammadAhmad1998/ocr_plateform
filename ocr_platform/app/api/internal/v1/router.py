from fastapi import APIRouter

from app.api.internal.v1 import accounts, keys

router = APIRouter()
router.include_router(keys.router)
router.include_router(accounts.router)
