"""Quota enforcement for local subscriptions and platform-provisioned API keys."""

from __future__ import annotations

from fastapi import Request
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.core.exceptions import QuotaExceededError


def is_platform_api_key(request: Request) -> bool:
    api_key = getattr(request.state, "api_key", None)
    return api_key is not None and api_key.key_source == "platform"


def check_quota(request: Request, user: User) -> None:
    api_key = getattr(request.state, "api_key", None)
    if api_key and api_key.key_source == "platform":
        limit = api_key.quota_limit if api_key.quota_limit is not None else 0
        if api_key.quota_used >= limit:
            raise QuotaExceededError("Page quota exhausted")
        return

    sub = user.subscription
    if sub and sub.quota_used >= sub.quota_limit:
        raise QuotaExceededError("Quota exceeded")


def increment_quota(request: Request, user: User, db: Session, pages: int) -> dict[str, str]:
    api_key = getattr(request.state, "api_key", None)
    if api_key and api_key.key_source == "platform":
        api_key.quota_used += pages
        db.commit()
        limit = api_key.quota_limit if api_key.quota_limit is not None else 0
        return {
            "X-Quota-Used": str(api_key.quota_used),
            "X-Quota-Limit": str(limit),
        }

    sub = user.subscription
    if sub:
        sub.quota_used += pages
        db.commit()
        return {
            "X-Quota-Used": str(sub.quota_used),
            "X-Quota-Limit": str(sub.quota_limit),
        }
    return {}


def quota_headers(request: Request, user: User) -> dict[str, str]:
    api_key = getattr(request.state, "api_key", None)
    if api_key and api_key.key_source == "platform":
        limit = api_key.quota_limit if api_key.quota_limit is not None else 0
        return {
            "X-Quota-Used": str(api_key.quota_used),
            "X-Quota-Limit": str(limit),
        }

    sub = user.subscription
    if not sub:
        return {}
    return {
        "X-Quota-Used": str(sub.quota_used),
        "X-Quota-Limit": str(sub.quota_limit),
    }
