"""Redis-backed rate limiting middleware for inference and OCR routes."""

from __future__ import annotations

import hashlib
import logging
import time
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import Settings, get_settings
from app.core.error_responses import build_error_body

logger = logging.getLogger(__name__)
settings = get_settings()

RATE_LIMITED_PREFIXES = (
    "/api/v1/ocr/jobs/",
    "/api/v2/ocr/jobs/",
    "/api/v1/vlm/",
    "/api/v1/paddle-ocr/",
    "/api/v1/got-ocr/",
    "/api/v1/qianfan-ocr/",
)

_redis_client = None


def tier_rate_limit(settings_obj: Settings | None = None, tier_slug: str = "free") -> int:
    """Return per-minute request limit for a subscription tier."""
    cfg = settings_obj or settings
    limits = {
        "free": cfg.RATE_LIMIT_REQUESTS_FREE,
        "basic": cfg.RATE_LIMIT_REQUESTS_BASIC,
        "pro": cfg.RATE_LIMIT_REQUESTS_PRO,
        "enterprise": cfg.RATE_LIMIT_REQUESTS_ENTERPRISE,
    }
    return limits.get(tier_slug, cfg.RATE_LIMIT_REQUESTS)


def _get_redis():
    global _redis_client
    if _redis_client is None:
        import redis

        _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


def _is_rate_limited_path(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in RATE_LIMITED_PREFIXES)


def _client_identifier(request: Request) -> str:
    auth = request.headers.get("authorization", "")
    api_key = request.headers.get("x-api-key", "")
    credential = auth.removeprefix("Bearer ").strip() or api_key.strip()
    if credential:
        return hashlib.sha256(credential.encode()).hexdigest()[:32]
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def _rate_limit_bucket(path: str) -> str:
    for prefix in RATE_LIMITED_PREFIXES:
        if path.startswith(prefix):
            return prefix.strip("/").replace("/", ":")
    return "default"


def _tier_slug_for_request(request: Request) -> str:
    """Resolve subscription tier from JWT or API key credentials."""
    from app.accounts.models import ApiKey, User
    from app.core.database import SessionLocal
    from app.core.security import decode_token
    from app.registry.models import Tier

    auth = request.headers.get("authorization", "")
    api_key_hdr = (request.headers.get("x-api-key") or "").strip()
    bearer = auth.removeprefix("Bearer ").strip() if auth.lower().startswith("bearer ") else ""

    db = SessionLocal()
    try:
        user: User | None = None
        if bearer:
            payload = decode_token(bearer)
            if payload and payload.get("type") == "access":
                user = db.query(User).filter(User.email == payload.get("sub")).first()

        if user is None:
            key_value = api_key_hdr or bearer
            if key_value:
                from app.core.api_key_auth import find_api_key

                api_key = find_api_key(key_value, db)
                if api_key:
                    user = db.query(User).filter(User.id == api_key.user_id).first()

        if user and user.subscription and user.subscription.tier_id:
            tier = db.query(Tier).filter(Tier.id == user.subscription.tier_id).first()
            if tier:
                return tier.slug
        return "free"
    except Exception as exc:
        logger.warning("Tier resolution for rate limit skipped: %s", exc)
        return "free"
    finally:
        db.close()


def check_rate_limit(request: Request) -> tuple[bool, dict[str, str]]:
    """Return (allowed, headers). Used by middleware and tests."""
    if not settings.RATE_LIMIT_ENABLED:
        return True, {}

    if not _is_rate_limited_path(request.url.path):
        return True, {}

    tier_slug = _tier_slug_for_request(request)
    limit = tier_rate_limit(settings, tier_slug)
    window = settings.RATE_LIMIT_WINDOW_SECONDS
    identifier = _client_identifier(request)
    bucket = _rate_limit_bucket(request.url.path)
    key = f"rate_limit:{bucket}:{identifier}"
    now = int(time.time())
    reset_at = now + window

    try:
        client = _get_redis()
        pipe = client.pipeline()
        pipe.incr(key)
        pipe.ttl(key)
        count, ttl = pipe.execute()
        if ttl == -1:
            client.expire(key, window)
            ttl = window
        remaining = max(0, limit - int(count))
        headers = {
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": str(remaining),
            "X-RateLimit-Reset": str(now + ttl if ttl > 0 else reset_at),
            "X-RateLimit-Tier": tier_slug,
        }
        if int(count) > limit:
            return False, headers
        return True, headers
    except Exception as exc:
        logger.warning("Rate limit check skipped (Redis unavailable): %s", exc)
        return True, {}


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        allowed, headers = check_rate_limit(request)
        if not allowed:
            request_id = getattr(request.state, "request_id", None)
            body = build_error_body(
                code="RATE_LIMIT_EXCEEDED",
                message="Too many requests. Please try again later.",
                request_id=request_id,
            )
            return JSONResponse(status_code=429, content=body, headers=headers)

        response = await call_next(request)
        for name, value in headers.items():
            response.headers[name] = value
        return response
