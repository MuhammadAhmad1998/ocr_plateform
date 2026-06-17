"""Internal API for AI Platform marketplace — key provisioning and sync."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.platform_auth import verify_platform_api_key
from app.platform.schemas import (
    AccountQuotaPatchRequest,
    AccountQuotaPatchResponse,
    KeyProvisionRequest,
    KeyProvisionResponse,
    KeyRevokeResponse,
    KeyRotateRequest,
    KeyRotateResponse,
)
from app.platform.service import (
    provision_platform_key,
    revoke_platform_key,
    rotate_platform_key,
    update_account_quota,
)

router = APIRouter(prefix="/keys", tags=["internal"])


@router.post(
    "/provision",
    response_model=KeyProvisionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(verify_platform_api_key)],
)
def provision_key(data: KeyProvisionRequest, db: Session = Depends(get_db)):
    """Create or register an API key provisioned by the AI Platform."""
    api_key = provision_platform_key(db, data)
    return KeyProvisionResponse(ocr_key_id=api_key.id)


@router.post(
    "/{platform_key_id}/revoke",
    response_model=KeyRevokeResponse,
    dependencies=[Depends(verify_platform_api_key)],
)
def revoke_key(platform_key_id: uuid.UUID, db: Session = Depends(get_db)):
    """Deactivate a platform-provisioned API key."""
    revoke_platform_key(db, platform_key_id)
    return KeyRevokeResponse(platform_key_id=platform_key_id)


@router.post(
    "/{platform_key_id}/rotate",
    response_model=KeyRotateResponse,
    dependencies=[Depends(verify_platform_api_key)],
)
def rotate_key(
    platform_key_id: uuid.UUID,
    data: KeyRotateRequest,
    db: Session = Depends(get_db),
):
    """Rotate credentials for an existing platform key."""
    api_key = rotate_platform_key(db, platform_key_id, data)
    return KeyRotateResponse(ocr_key_id=api_key.id, platform_key_id=platform_key_id)
