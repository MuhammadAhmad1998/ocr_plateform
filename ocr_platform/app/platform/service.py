"""Provision and revoke API keys pushed by the AI Platform marketplace."""

from __future__ import annotations

import secrets
import uuid

from sqlalchemy.orm import Session

from app.accounts.models import ApiKey, SubscriptionProfile, User
from app.core.exceptions import ConflictError, NotFoundError
from app.core.security import hash_password
from app.platform.schemas import (
    AccountQuotaPatchRequest,
    KeyProvisionRequest,
    KeyRotateRequest,
)


def _shadow_email(platform_account_id: uuid.UUID) -> str:
    return f"platform+{platform_account_id}@internal.local"


def get_or_create_shadow_user(
    db: Session,
    *,
    platform_account_id: uuid.UUID,
    user_email: str,
    user_full_name: str | None,
    company_name: str | None,
) -> User:
    user = (
        db.query(User)
        .filter(User.platform_account_id == platform_account_id)
        .first()
    )
    display_name = company_name or user_full_name or user_email
    if user:
        if display_name and user.full_name != display_name:
            user.full_name = display_name
        return user

    user = User(
        email=_shadow_email(platform_account_id),
        password_hash=hash_password(secrets.token_urlsafe(32)),
        full_name=display_name,
        platform_account_id=platform_account_id,
    )
    db.add(user)
    db.flush()

    sub = SubscriptionProfile(
        user_id=user.id,
        quota_limit=999999,
        quota_used=0,
        status="active",
    )
    db.add(sub)
    return user


def provision_platform_key(db: Session, data: KeyProvisionRequest) -> ApiKey:
    existing = (
        db.query(ApiKey)
        .filter(ApiKey.platform_key_id == data.platform_key_id)
        .first()
    )
    if existing:
        raise ConflictError("API key already provisioned for this platform_key_id")

    user = get_or_create_shadow_user(
        db,
        platform_account_id=data.platform_account_id,
        user_email=data.user_email,
        user_full_name=data.user_full_name,
        company_name=data.company_name,
    )

    api_key = ApiKey(
        user_id=user.id,
        key_hash=data.key_hash,
        key_prefix=data.key_prefix,
        key_hash_algorithm="bcrypt",
        key_source="platform",
        name=data.key_name,
        scopes=data.scopes,
        is_active=True,
        platform_key_id=data.platform_key_id,
        platform_tenant_id=data.platform_tenant_id,
        platform_account_id=data.platform_account_id,
        platform_user_id=data.platform_user_id,
        platform_subscription_id=data.platform_subscription_id,
        user_email=data.user_email,
        quota_limit=data.quota_limit,
        quota_used=0,
    )
    db.add(api_key)
    db.commit()
    db.refresh(api_key)
    return api_key


def revoke_platform_key(db: Session, platform_key_id: uuid.UUID) -> ApiKey:
    api_key = (
        db.query(ApiKey)
        .filter(ApiKey.platform_key_id == platform_key_id)
        .first()
    )
    if not api_key:
        raise NotFoundError("API key not found")
    api_key.is_active = False
    db.commit()
    db.refresh(api_key)
    return api_key


def rotate_platform_key(
    db: Session,
    platform_key_id: uuid.UUID,
    data: KeyRotateRequest,
) -> ApiKey:
    api_key = (
        db.query(ApiKey)
        .filter(ApiKey.platform_key_id == platform_key_id)
        .first()
    )
    if not api_key:
        raise NotFoundError("API key not found")

    api_key.key_hash = data.key_hash
    api_key.key_prefix = data.key_prefix
    api_key.key_hash_algorithm = "bcrypt"
    api_key.is_active = True
    db.commit()
    db.refresh(api_key)
    return api_key


def update_account_quota(
    db: Session,
    platform_account_id: uuid.UUID,
    data: AccountQuotaPatchRequest,
) -> int:
    keys = (
        db.query(ApiKey)
        .filter(
            ApiKey.platform_account_id == platform_account_id,
            ApiKey.key_source == "platform",
        )
        .all()
    )
    if not keys:
        raise NotFoundError("No platform keys found for account")

    for key in keys:
        key.quota_limit = data.quota_limit
    db.commit()
    return len(keys)
