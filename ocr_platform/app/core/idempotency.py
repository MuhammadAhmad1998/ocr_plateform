"""Idempotency key storage and replay for mutating API endpoints."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.database import Base
from app.core.exceptions import ConflictError

IDEMPOTENCY_HEADER = "Idempotency-Key"
IDEMPOTENCY_TTL = timedelta(hours=24)


def _as_utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"
    __table_args__ = (UniqueConstraint("key", "user_id", "endpoint", name="uq_idempotency_key"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    key: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    request_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    response_body: Mapped[str] = mapped_column(Text, nullable=False)
    status_code: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


def normalize_idempotency_key(raw: str | None) -> str | None:
    if not raw:
        return None
    value = raw.strip()
    return value[:255] if value else None


def hash_request_body(body: dict) -> str:
    normalized = json.dumps(body, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(normalized.encode()).hexdigest()


def check_idempotency(
    db: Session,
    *,
    user_id: uuid.UUID,
    endpoint: str,
    key: str,
    request_hash: str,
) -> tuple[dict, int] | None:
    record = (
        db.query(IdempotencyKey)
        .filter(
            IdempotencyKey.key == key,
            IdempotencyKey.user_id == user_id,
            IdempotencyKey.endpoint == endpoint,
        )
        .first()
    )
    if not record:
        return None

    if datetime.now(UTC) - _as_utc(record.created_at) > IDEMPOTENCY_TTL:
        db.delete(record)
        db.commit()
        return None

    if record.request_hash != request_hash:
        raise ConflictError("Idempotency key reused with different request body")

    return json.loads(record.response_body), record.status_code


def save_idempotency(
    db: Session,
    *,
    user_id: uuid.UUID,
    endpoint: str,
    key: str,
    request_hash: str,
    response_body: dict,
    status_code: int,
) -> None:
    record = IdempotencyKey(
        key=key,
        user_id=user_id,
        endpoint=endpoint,
        request_hash=request_hash,
        response_body=json.dumps(response_body, separators=(",", ":")),
        status_code=status_code,
    )
    db.add(record)
    db.commit()
