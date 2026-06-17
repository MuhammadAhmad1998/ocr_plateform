"""Request/response schemas for /internal/v1 platform APIs."""

from __future__ import annotations

import uuid
from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.core.dependencies import DEFAULT_API_KEY_SCOPES, VALID_API_KEY_SCOPES


class KeyProvisionRequest(BaseModel):
    platform_key_id: uuid.UUID
    plain_key: str | None = None
    key_prefix: str = Field(..., min_length=12, max_length=12)
    key_hash: str

    platform_tenant_id: uuid.UUID
    platform_account_id: uuid.UUID
    platform_user_id: uuid.UUID
    platform_subscription_id: uuid.UUID

    user_email: str
    user_full_name: str | None = None
    account_type: str | None = None
    company_name: str | None = None

    service_slug: str = "ocr"
    key_name: str = "Default"
    scopes: list[str] = Field(default_factory=lambda: list(DEFAULT_API_KEY_SCOPES))

    quota_limit: int = Field(..., ge=0)
    quota_unit: str = "pages"
    plan_slug: str | None = None

    @field_validator("scopes")
    @classmethod
    def validate_scopes(cls, scopes: list[str]) -> list[str]:
        invalid = set(scopes) - VALID_API_KEY_SCOPES
        if invalid:
            raise ValueError(f"Invalid scopes: {', '.join(sorted(invalid))}")
        return scopes

    @field_validator("key_prefix")
    @classmethod
    def validate_prefix(cls, prefix: str) -> str:
        if len(prefix) != 12:
            raise ValueError("key_prefix must be exactly 12 characters")
        return prefix


class KeyProvisionResponse(BaseModel):
    ocr_key_id: uuid.UUID
    status: Literal["active"] = "active"


class KeyRevokeResponse(BaseModel):
    platform_key_id: uuid.UUID
    status: Literal["revoked"] = "revoked"


class KeyRotateRequest(BaseModel):
    plain_key: str | None = None
    key_prefix: str = Field(..., min_length=12, max_length=12)
    key_hash: str


class KeyRotateResponse(BaseModel):
    ocr_key_id: uuid.UUID
    platform_key_id: uuid.UUID
    status: Literal["active"] = "active"


class AccountQuotaPatchRequest(BaseModel):
    quota_limit: int = Field(..., ge=0)
    quota_unit: str = "pages"
    plan_slug: str | None = None


class AccountQuotaPatchResponse(BaseModel):
    platform_account_id: uuid.UUID
    keys_updated: int
    quota_limit: int
