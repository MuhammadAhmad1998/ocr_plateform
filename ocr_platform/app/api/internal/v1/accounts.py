"""Quota updates for platform tenant accounts."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.platform_auth import verify_platform_api_key
from app.platform.schemas import AccountQuotaPatchRequest, AccountQuotaPatchResponse
from app.platform.service import update_account_quota

router = APIRouter(prefix="/accounts", tags=["internal"])


@router.patch(
    "/{platform_account_id}/quota",
    response_model=AccountQuotaPatchResponse,
    dependencies=[Depends(verify_platform_api_key)],
)
def patch_account_quota(
    platform_account_id: uuid.UUID,
    data: AccountQuotaPatchRequest,
    db: Session = Depends(get_db),
):
    """Update quota limits for all keys belonging to a platform account."""
    keys_updated = update_account_quota(db, platform_account_id, data)
    return AccountQuotaPatchResponse(
        platform_account_id=platform_account_id,
        keys_updated=keys_updated,
        quota_limit=data.quota_limit,
    )
