from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.ocr_engine.models import KnowledgeDocument
from app.registry.models import Engine, Tier


def seed_database() -> None:
    db: Session = SessionLocal()
    try:
        if db.query(Tier).count() > 0:
            return

        tiers = [
            Tier(
                slug="free",
                public_name="Starter",
                description="PDF text extraction; 50 pages/month; no API",
                quota_limit=50,
            ),
            Tier(
                slug="basic",
                public_name="Essential",
                description="Printed text + tables; 500 pages/month; API included",
                quota_limit=500,
            ),
            Tier(
                slug="pro",
                public_name="Professional",
                description="Equations, multi-language, handwriting; 5,000 pages/month",
                quota_limit=5000,
            ),
            Tier(
                slug="enterprise",
                public_name="Enterprise",
                description="All capabilities + custom fine-tuning; unlimited",
                quota_limit=999999,
            ),
        ]
        db.add_all(tiers)
        db.flush()

        tier_map = {t.slug: t for t in tiers}
        engines = [
            Engine(
                slug="trocr-base",
                tier_id=tier_map["basic"].id,
                display_name="TrOCR Base",
                adapter_type="trocr-base",
                capability_tags=["printed_text", "forms"],
                benchmark_scores={"form": 0.9, "unknown": 0.8},
                cost_profile="low",
            ),
            Engine(
                slug="donut-base",
                tier_id=tier_map["basic"].id,
                display_name="Donut Base",
                adapter_type="tesseract",
                capability_tags=["printed_text", "tables"],
                benchmark_scores={"form": 0.85},
                cost_profile="low",
            ),
            Engine(
                slug="nougat-base",
                tier_id=tier_map["pro"].id,
                display_name="Nougat Base",
                adapter_type="nougat-base",
                capability_tags=["equations", "scientific_pdf", "multi_column"],
                benchmark_scores={"scientific": 0.95, "pdf": 0.9},
                cost_profile="medium",
            ),
            Engine(
                slug="trocr-handwritten",
                tier_id=tier_map["pro"].id,
                display_name="TrOCR Handwritten",
                adapter_type="trocr-handwritten",
                capability_tags=["handwriting", "printed_text"],
                benchmark_scores={"image": 0.88},
                cost_profile="medium",
            ),
            Engine(
                slug="pix2struct",
                tier_id=tier_map["enterprise"].id,
                display_name="Pix2Struct",
                adapter_type="pix2struct",
                capability_tags=["multi_column", "diagrams", "tables"],
                benchmark_scores={"complex": 0.92},
                cost_profile="high",
            ),
            Engine(
                slug="doctr",
                tier_id=tier_map["enterprise"].id,
                display_name="docTR",
                adapter_type="doctr",
                capability_tags=["printed_text", "tables", "multi_column"],
                benchmark_scores={"form": 0.91},
                cost_profile="high",
            ),
        ]
        db.add_all(engines)

        knowledge = [
            KnowledgeDocument(
                title="TrOCR Architecture Overview",
                doc_type="research_paper",
                capability_tags=["printed_text", "forms"],
                content="TrOCR models excel at printed text recognition with transformer architecture.",
            ),
            KnowledgeDocument(
                title="Professional Tier Spec",
                doc_type="tier_spec",
                capability_tags=["equations", "handwriting"],
                content="Professional tier supports equations, multi-language, and handwriting.",
            ),
        ]
        db.add_all(knowledge)
        db.commit()
    finally:
        db.close()
