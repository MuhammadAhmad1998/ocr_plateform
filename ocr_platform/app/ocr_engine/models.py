import uuid
from datetime import UTC, datetime

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class OcrJob(Base):
    __tablename__ = "ocr_jobs"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    session_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("chat_sessions.id"))
    document_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("documents.id"))
    tier_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("tiers.id"))
    engine_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("engines.id"))
    job_type: Mapped[str] = mapped_column(String(20), default="demo")
    status: Mapped[str] = mapped_column(String(20), default="queued")
    result_s3_key: Mapped[str | None] = mapped_column(String(500))
    error_message: Mapped[str | None] = mapped_column(Text)
    pages_processed: Mapped[int] = mapped_column(Integer, default=0)
    compute_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    webhook_url: Mapped[str | None] = mapped_column(String(2048))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User"] = relationship(back_populates="ocr_jobs")


class UsageEvent(Base):
    __tablename__ = "usage_events"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"))
    engine_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("engines.id"))
    tier_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, ForeignKey("tiers.id"))
    pages: Mapped[int] = mapped_column(Integer, default=1)
    compute_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    event_type: Mapped[str] = mapped_column(String(50), default="ocr")
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)
    s3_key: Mapped[str | None] = mapped_column(String(500))
    capability_tags: Mapped[list] = mapped_column(JSON, default=list)
    content: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(UTC))
