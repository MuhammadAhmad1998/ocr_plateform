"""Resolve tier and engine for advisor demo runs from session state and recommendations."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.advisor.demo_document import recommendation_from_session
from app.advisor.models import ChatSession
from app.registry.models import Engine, Tier
from app.registry.service import registry_service

# Common LLM / template variants mapped to registered engine slugs.
_ENGINE_SLUG_ALIASES: dict[str, str] = {
    "got-ocr-2.0": "got-ocr2",
    "got-ocr2.0": "got-ocr2",
    "got-ocr-2": "got-ocr2",
    "got-ocr 2.0": "got-ocr2",
    "qianfan": "qianfan-ocr",
    "qianfan-ocr-enterprise": "qianfan-ocr-enterprise",
    "paddle-ocr": "paddle-ocr-free",
    "paddleocr-vl": "paddle-ocr-vl",
}

_TIER_DEFAULT_ENGINES: dict[str, str] = {
    "free": "paddle-ocr-free",
    "basic": "paddle-ocr-vl",
    "pro": "got-ocr2",
    "enterprise": "got-ocr2-enterprise",
}


def normalize_engine_slug(slug: str | None) -> str | None:
    if not slug:
        return None
    normalized = slug.strip().lower().replace(" ", "-").replace("_", "-")
    return _ENGINE_SLUG_ALIASES.get(normalized, normalized)


def resolve_demo_engine(
    db: Session,
    session: ChatSession,
) -> tuple[Tier | None, Engine | None]:
    tier: Tier | None = None
    engine: Engine | None = None
    recommendation = recommendation_from_session(db, session)

    if session.recommendation_tier_id:
        tier = db.query(Tier).filter(Tier.id == session.recommendation_tier_id).first()
    if not tier and recommendation:
        tier_slug = recommendation.get("primary_tier") or recommendation.get("demo_tier")
        if tier_slug:
            tier = registry_service.get_tier_by_slug(db, tier_slug)

    if session.selected_engine_id:
        engine = db.query(Engine).filter(Engine.id == session.selected_engine_id).first()

    if not engine and recommendation:
        slug = normalize_engine_slug(recommendation.get("selected_engine"))
        if slug:
            engine = registry_service.get_engine_by_slug(db, slug)

    fingerprint: dict = {}
    if session.document and session.document.fingerprint_json:
        fingerprint = session.document.fingerprint_json

    if not engine and tier:
        match = registry_service.select_engine_for_document(db, tier.slug, fingerprint)
        if match:
            engine = match.engine

    if not engine and tier:
        default_slug = _TIER_DEFAULT_ENGINES.get(tier.slug)
        if default_slug:
            engine = registry_service.get_engine_by_slug(db, default_slug)

    if engine and not tier:
        tier = db.query(Tier).filter(Tier.id == engine.tier_id).first()

    return tier, engine
