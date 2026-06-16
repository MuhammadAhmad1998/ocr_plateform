import uuid

from sqlalchemy import JSON, Boolean, ForeignKey, Integer, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Tier(Base):
    __tablename__ = "tiers"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    public_name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    quota_limit: Mapped[int] = mapped_column(Integer, default=500)
    stripe_price_id: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    engines: Mapped[list["Engine"]] = relationship(back_populates="tier")


class Engine(Base):
    __tablename__ = "engines"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    tier_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("tiers.id"))
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    hf_endpoint: Mapped[str | None] = mapped_column(String(500))
    adapter_type: Mapped[str] = mapped_column(String(50), default="tesseract")
    capability_tags: Mapped[list] = mapped_column(JSON, default=list)
    benchmark_scores: Mapped[dict] = mapped_column(JSON, default=dict)
    cost_profile: Mapped[str] = mapped_column(String(20), default="low")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    tier: Mapped["Tier"] = relationship(back_populates="engines")
