import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from platform_api.database import Base


class Account(Base):
    """Shadow tenant account — one per platform_account_id."""

    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    platform_account_id: Mapped[uuid.UUID] = mapped_column(Uuid, unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    api_keys: Mapped[list["ApiKey"]] = relationship(back_populates="account")
    documents: Mapped[list["Document"]] = relationship(back_populates="account")
    ocr_jobs: Mapped[list["OcrJob"]] = relationship(back_populates="account")


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("accounts.id"))
    key_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    key_prefix: Mapped[str] = mapped_column(String(12), nullable=False, index=True)
    key_hash_algorithm: Mapped[str] = mapped_column(String(20), default="bcrypt")
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

    account: Mapped["Account"] = relationship(back_populates="api_keys")


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("accounts.id"))
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(500), nullable=False)
    fingerprint_json: Mapped[dict] = mapped_column(JSON, default=dict)
    page_count: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    account: Mapped["Account"] = relationship(back_populates="documents")


class Tier(Base):
    __tablename__ = "tiers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    public_name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(500), default="")
    quota_limit: Mapped[int] = mapped_column(Integer, default=500)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Engine(Base):
    __tablename__ = "engines"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    tier_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("tiers.id"))
    display_name: Mapped[str] = mapped_column(String(150))
    adapter_type: Mapped[str] = mapped_column(String(50))
    capability_tags: Mapped[list] = mapped_column(JSON, default=list)
    benchmark_scores: Mapped[dict] = mapped_column(JSON, default=dict)
    cost_profile: Mapped[str] = mapped_column(String(20), default="medium")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class OcrJob(Base):
    __tablename__ = "ocr_jobs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("accounts.id"))
    document_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("documents.id"))
    tier_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("tiers.id"))
    engine_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("engines.id"))
    job_type: Mapped[str] = mapped_column(String(20), default="production")
    status: Mapped[str] = mapped_column(String(20), default="queued")
    result_s3_key: Mapped[str | None] = mapped_column(String(500))
    error_message: Mapped[str | None] = mapped_column(String(2048))
    pages_processed: Mapped[int] = mapped_column(Integer, default=0)
    compute_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    webhook_url: Mapped[str | None] = mapped_column(String(2048))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    account: Mapped["Account"] = relationship(back_populates="ocr_jobs")
