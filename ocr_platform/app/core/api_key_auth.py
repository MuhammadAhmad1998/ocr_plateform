"""API key lookup and verification (local SHA-256 and platform bcrypt)."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.accounts.models import ApiKey
from app.core.exceptions import AuthenticationError
from app.core.security import verify_password

API_KEY_PREFIXES = ("ocr_", "ak_live_", "ak_test_")


def looks_like_api_key(value: str) -> bool:
    return any(value.startswith(prefix) for prefix in API_KEY_PREFIXES)


def verify_key_hash(raw_key: str, api_key: ApiKey) -> bool:
    algorithm = api_key.key_hash_algorithm or "sha256"
    if algorithm == "bcrypt":
        try:
            return verify_password(raw_key, api_key.key_hash)
        except (ValueError, TypeError):
            return False
    expected = hashlib.sha256(raw_key.encode()).hexdigest()
    return secrets.compare_digest(expected, api_key.key_hash)


def find_api_key(raw_key: str, db: Session) -> ApiKey | None:
    if len(raw_key) < 12:
        return None

    prefix = raw_key[:12]
    candidates = (
        db.query(ApiKey)
        .filter(ApiKey.key_prefix == prefix, ApiKey.is_active.is_(True))
        .all()
    )
    for candidate in candidates:
        if verify_key_hash(raw_key, candidate):
            if candidate.expires_at and candidate.expires_at < datetime.now(UTC):
                return None
            return candidate
    return None


def touch_api_key_last_used(api_key: ApiKey, db: Session) -> None:
    api_key.last_used_at = datetime.now(UTC)
    db.commit()
