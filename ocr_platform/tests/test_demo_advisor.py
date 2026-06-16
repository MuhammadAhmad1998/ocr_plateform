import pytest

from app.accounts.models import SubscriptionProfile, User
from app.advisor.models import ChatMessage, ChatSession
from app.core.security import hash_password
from app.ocr_engine.demo_resolution import normalize_engine_slug, resolve_demo_engine
from app.ocr_engine.service import create_demo_job
from app.registry.models import Engine, Tier


def _seed_tiers_and_engines(db_session):
    tiers = {}
    for slug, name, quota in [
        ("free", "Starter", 50),
        ("basic", "Essential", 500),
        ("pro", "Professional", 5000),
        ("enterprise", "Enterprise", 999999),
    ]:
        tier = Tier(slug=slug, public_name=name, description=slug, quota_limit=quota)
        db_session.add(tier)
        tiers[slug] = tier
    db_session.flush()

    engines = {}
    for slug, tier_slug, adapter in [
        ("paddle-ocr-free", "free", "paddle-ocr"),
        ("paddle-ocr-vl", "basic", "paddle-ocr-vl"),
        ("got-ocr2", "pro", "got-ocr2"),
        ("qianfan-ocr", "pro", "qianfan-ocr"),
    ]:
        engine = Engine(
            slug=slug,
            tier_id=tiers[tier_slug].id,
            display_name=slug,
            adapter_type=adapter,
            capability_tags=["printed_text"],
            benchmark_scores={"form": 0.9},
            cost_profile="low",
        )
        db_session.add(engine)
        engines[slug] = engine
    db_session.commit()
    return tiers, engines


def _create_user(db_session, email: str = "demo@example.com") -> User:
    user = User(email=email, password_hash=hash_password("password123"), full_name="Demo User")
    db_session.add(user)
    db_session.flush()
    db_session.add(SubscriptionProfile(user_id=user.id, quota_limit=50, quota_used=0))
    db_session.commit()
    return user


def test_normalize_engine_slug_aliases():
    assert normalize_engine_slug("got-ocr-2.0") == "got-ocr2"
    assert normalize_engine_slug("GOT-OCR 2.0") == "got-ocr2"


def test_resolve_demo_engine_from_recommendation_metadata(db_session):
    tiers, engines = _seed_tiers_and_engines(db_session)
    user = _create_user(db_session)
    session = ChatSession(user_id=user.id, recommendation_tier_id=tiers["pro"].id)
    db_session.add(session)
    db_session.flush()

    db_session.add(
        ChatMessage(
            session_id=session.id,
            role="assistant",
            content="Recommended GOT-OCR 2.0",
            metadata_json={
                "recommendation": {
                    "primary_tier": "pro",
                    "selected_engine": "got-ocr-2.0",
                    "demo_tier": "pro",
                }
            },
        )
    )
    db_session.commit()

    tier, engine = resolve_demo_engine(db_session, session)
    assert tier is not None
    assert tier.slug == "pro"
    assert engine is not None
    assert engine.slug == "got-ocr2"


def test_create_demo_job_without_upload_uses_recommended_engine(db_session, monkeypatch):
    tiers, engines = _seed_tiers_and_engines(db_session)
    user = _create_user(db_session)
    session = ChatSession(
        user_id=user.id,
        recommendation_tier_id=tiers["pro"].id,
        selected_engine_id=engines["got-ocr2"].id,
    )
    db_session.add(session)
    db_session.commit()

    monkeypatch.setattr(
        "app.ocr_engine.service.process_ocr_job",
        lambda db, job_id: None,
    )

    job = create_demo_job(db_session, user.id, session)
    assert job.engine_id == engines["got-ocr2"].id
    assert session.document_id is not None
