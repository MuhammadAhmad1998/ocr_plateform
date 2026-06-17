import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))
    platform_account_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    subscription: Mapped["SubscriptionProfile | None"] = relationship(back_populates="user", uselist=False)
    api_keys: Mapped[list["ApiKey"]] = relationship(back_populates="user")
    documents: Mapped[list["Document"]] = relationship(back_populates="user")
    chat_sessions: Mapped[list["ChatSession"]] = relationship(back_populates="user")
    ocr_jobs: Mapped[list["OcrJob"]] = relationship(back_populates="user")


class SubscriptionProfile(Base):
    __tablename__ = "subscription_profiles"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), unique=True)
    tier_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("tiers.id"))
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255))
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255))
    quota_used: Mapped[int] = mapped_column(Integer, default=0)
    quota_limit: Mapped[int] = mapped_column(Integer, default=50)
    status: Mapped[str] = mapped_column(String(50), default="active")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    user: Mapped["User"] = relationship(back_populates="subscription")
    tier: Mapped["Tier | None"] = relationship()


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    key_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(12), nullable=False, index=True)
    key_hash_algorithm: Mapped[str] = mapped_column(String(20), default="sha256")
    key_source: Mapped[str] = mapped_column(String(20), default="local")
    name: Mapped[str] = mapped_column(String(100), default="Default")
    scopes: Mapped[list] = mapped_column(JSON, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    platform_key_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, unique=True, index=True)
    platform_tenant_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    platform_account_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, index=True)
    platform_user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    platform_subscription_id: Mapped[uuid.UUID | None] = mapped_column(Uuid)
    user_email: Mapped[str | None] = mapped_column(String(255))
    quota_limit: Mapped[int | None] = mapped_column(Integer)
    quota_used: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    user: Mapped["User"] = relationship(back_populates="api_keys")
