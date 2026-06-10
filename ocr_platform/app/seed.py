from sqlalchemy.orm import Session

from app.accounts.models import SubscriptionProfile, User
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.ocr_engine.models import KnowledgeDocument
from app.registry.models import Engine, Tier


def seed_database() -> None:
    db: Session = SessionLocal()
    try:
        existing_tiers = {tier.slug: tier for tier in db.query(Tier).all()}
        tier_specs = [
            ("free", "Starter", "PDF text extraction; 50 pages/month; no API", 50),
            ("basic", "Essential", "Printed text + tables; 500 pages/month; API included", 500),
            ("pro", "Professional", "Equations, multi-language, handwriting; 5,000 pages/month", 5000),
            ("enterprise", "Enterprise", "All capabilities + custom fine-tuning; unlimited", 999999),
        ]

        for slug, public_name, description, quota_limit in tier_specs:
            if slug not in existing_tiers:
                db.add(
                    Tier(
                        slug=slug,
                        public_name=public_name,
                        description=description,
                        quota_limit=quota_limit,
                    )
                )

        db.flush()
        tier_map = {t.slug: t for t in db.query(Tier).all()}

        existing_engines = {engine.slug: engine for engine in db.query(Engine).all()}
        engine_specs = [
            dict(
                slug="trocr-base",
                tier_slug="basic",
                display_name="TrOCR Base",
                adapter_type="trocr-base",
                capability_tags=["printed_text", "forms"],
                benchmark_scores={"form": 0.9, "unknown": 0.8},
                cost_profile="low",
            ),
            dict(
                slug="donut-base",
                tier_slug="basic",
                display_name="Donut Base",
                adapter_type="tesseract",
                capability_tags=["printed_text", "tables"],
                benchmark_scores={"form": 0.85},
                cost_profile="low",
            ),
            dict(
                slug="nougat-base",
                tier_slug="pro",
                display_name="Nougat Base",
                adapter_type="nougat-base",
                capability_tags=["equations", "scientific_pdf", "multi_column"],
                benchmark_scores={"scientific": 0.95, "pdf": 0.9},
                cost_profile="medium",
            ),
            dict(
                slug="trocr-handwritten",
                tier_slug="pro",
                display_name="TrOCR Handwritten",
                adapter_type="trocr-handwritten",
                capability_tags=["handwriting", "printed_text"],
                benchmark_scores={"image": 0.88},
                cost_profile="medium",
            ),
            dict(
                slug="pix2struct",
                tier_slug="enterprise",
                display_name="Pix2Struct",
                adapter_type="pix2struct",
                capability_tags=["multi_column", "diagrams", "tables"],
                benchmark_scores={"complex": 0.92},
                cost_profile="high",
            ),
            dict(
                slug="doctr",
                tier_slug="enterprise",
                display_name="docTR",
                adapter_type="doctr",
                capability_tags=["printed_text", "tables", "multi_column"],
                benchmark_scores={"form": 0.91},
                cost_profile="high",
            ),
            dict(
                slug="got-ocr2",
                tier_slug="enterprise",
                display_name="GOT-OCR 2.0",
                adapter_type="got-ocr2",
                capability_tags=[
                    "printed_text",
                    "format",
                    "plain_text",
                    "ocr",
                ],
                benchmark_scores={"pdf": 0.93, "form": 0.94},
                cost_profile="high",
            ),
        ]

        for spec in engine_specs:
            if spec["slug"] in existing_engines:
                continue
            db.add(
                Engine(
                    slug=spec["slug"],
                    tier_id=tier_map[spec["tier_slug"]].id,
                    display_name=spec["display_name"],
                    adapter_type=spec["adapter_type"],
                    capability_tags=spec["capability_tags"],
                    benchmark_scores=spec["benchmark_scores"],
                    cost_profile=spec["cost_profile"],
                )
            )

        existing_knowledge = {doc.title for doc in db.query(KnowledgeDocument).all()}
        knowledge_specs = [
            dict(
                title="TrOCR Architecture Overview",
                doc_type="research_paper",
                capability_tags=["printed_text", "forms"],
                content="TrOCR models excel at printed text recognition with transformer architecture.",
            ),
            dict(
                title="Professional Tier Spec",
                doc_type="tier_spec",
                capability_tags=["equations", "handwriting"],
                content="Professional tier supports equations, multi-language, and handwriting.",
            ),
        ]
        for spec in knowledge_specs:
            if spec["title"] in existing_knowledge:
                continue
            db.add(
                KnowledgeDocument(
                    title=spec["title"],
                    doc_type=spec["doc_type"],
                    capability_tags=spec["capability_tags"],
                    content=spec["content"],
                )
            )

        # Create test user if not exists
        test_email = "test@example.com"
        existing_user = db.query(User).filter(User.email == test_email).first()
        if not existing_user:
            test_user = User(
                email=test_email,
                password_hash=hash_password("password123"),
                full_name="Test User",
            )
            db.add(test_user)
            db.flush()
            
            free_tier = db.query(Tier).filter(Tier.slug == "free").first()
            test_sub = SubscriptionProfile(
                user_id=test_user.id,
                tier_id=free_tier.id if free_tier else None,
                quota_limit=free_tier.quota_limit if free_tier else 50,
            )
            db.add(test_sub)

        db.commit()
    finally:
        db.close()
