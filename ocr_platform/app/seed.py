from sqlalchemy.orm import Session

from app.accounts.models import SubscriptionProfile, User
from app.core.config import get_settings
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
            # PaddleOCR - Free & Basic Tiers (printed text, forms, tables)
            dict(
                slug="paddle-ocr-free",
                tier_slug="free",
                display_name="PaddleOCR Lite",
                adapter_type="paddle-ocr",
                capability_tags=["printed_text", "simple_forms"],
                benchmark_scores={"form": 0.82, "invoice": 0.80, "unknown": 0.78},
                cost_profile="low",
            ),
            dict(
                slug="paddle-ocr-vl",
                tier_slug="basic",
                display_name="PaddleOCR Vision-Language",
                adapter_type="paddle-ocr-vl",
                capability_tags=["printed_text", "tables", "forms", "invoice"],
                benchmark_scores={"form": 0.88, "invoice": 0.90, "table": 0.87, "unknown": 0.85},
                cost_profile="low",
            ),
            # GOT-OCR 2.0 - Pro & Enterprise Tiers (advanced features)
            dict(
                slug="got-ocr2",
                tier_slug="pro",
                display_name="GOT-OCR 2.0",
                adapter_type="got-ocr2",
                capability_tags=[
                    "printed_text",
                    "handwriting",
                    "equations",
                    "multi_column",
                    "tables",
                    "scientific_pdf",
                    "format_preservation",
                ],
                benchmark_scores={
                    "pdf": 0.93,
                    "form": 0.94,
                    "scientific": 0.95,
                    "handwritten": 0.89,
                    "equation": 0.92,
                },
                cost_profile="medium",
            ),
            # Qianfan-OCR - Pro & Enterprise Tiers (KIE, complex extraction)
            dict(
                slug="qianfan-ocr",
                tier_slug="pro",
                display_name="Qianfan OCR",
                adapter_type="qianfan-ocr",
                capability_tags=[
                    "printed_text",
                    "tables",
                    "key_information_extraction",
                    "medical_documents",
                    "financial_documents",
                    "structured_extraction",
                ],
                benchmark_scores={
                    "medical": 0.91,
                    "financial": 0.90,
                    "form": 0.89,
                    "invoice": 0.92,
                },
                cost_profile="medium",
            ),
            # Infinity-Parser2-Flash - Pro tier (fast document parsing)
            dict(
                slug="infinity-parser2-flash",
                tier_slug="pro",
                display_name="Infinity-Parser2-Flash",
                adapter_type="infinity-parser2-flash",
                capability_tags=[
                    "printed_text",
                    "tables",
                    "charts",
                    "formulas",
                    "layout_analysis",
                    "markdown",
                    "multi_column",
                    "document_parsing",
                ],
                benchmark_scores={
                    "pdf": 0.92,
                    "form": 0.90,
                    "table": 0.92,
                    "layout": 0.91,
                    "parsebench": 0.72,
                },
                cost_profile="low",
            ),
            # GOT-OCR 2.0 Enterprise - Full capabilities
            dict(
                slug="got-ocr2-enterprise",
                tier_slug="enterprise",
                display_name="GOT-OCR 2.0 Enterprise",
                adapter_type="got-ocr2",
                capability_tags=[
                    "printed_text",
                    "handwriting",
                    "equations",
                    "multi_column",
                    "tables",
                    "scientific_pdf",
                    "format_preservation",
                    "diagrams",
                    "musical_notation",
                    "molecular_formulas",
                ],
                benchmark_scores={
                    "pdf": 0.95,
                    "form": 0.96,
                    "scientific": 0.97,
                    "handwritten": 0.91,
                    "equation": 0.94,
                    "complex": 0.93,
                },
                cost_profile="high",
            ),
            # Qianfan-OCR Enterprise - Advanced KIE
            dict(
                slug="qianfan-ocr-enterprise",
                tier_slug="enterprise",
                display_name="Qianfan OCR Enterprise",
                adapter_type="qianfan-ocr",
                capability_tags=[
                    "printed_text",
                    "tables",
                    "key_information_extraction",
                    "medical_documents",
                    "financial_documents",
                    "structured_extraction",
                    "custom_templates",
                    "multi_language",
                ],
                benchmark_scores={
                    "medical": 0.94,
                    "financial": 0.93,
                    "form": 0.92,
                    "invoice": 0.95,
                    "contract": 0.91,
                },
                cost_profile="high",
            ),
            # Infinity-Parser2-Flash Enterprise
            dict(
                slug="infinity-parser2-flash-enterprise",
                tier_slug="enterprise",
                display_name="Infinity-Parser2-Flash Enterprise",
                adapter_type="infinity-parser2-flash",
                capability_tags=[
                    "printed_text",
                    "tables",
                    "charts",
                    "formulas",
                    "layout_analysis",
                    "markdown",
                    "multi_column",
                    "document_parsing",
                    "chemical_formulas",
                    "document_vqa",
                ],
                benchmark_scores={
                    "pdf": 0.94,
                    "form": 0.92,
                    "table": 0.94,
                    "layout": 0.93,
                    "parsebench": 0.73,
                    "chart": 0.80,
                },
                cost_profile="medium",
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
                title="PaddleOCR Architecture Overview",
                doc_type="research_paper",
                capability_tags=["printed_text", "forms", "tables"],
                content="PaddleOCR excels at printed text recognition with strong table extraction capabilities, optimized for business documents.",
            ),
            dict(
                title="GOT-OCR 2.0 Advanced Features",
                doc_type="research_paper",
                capability_tags=["equations", "handwriting", "multi_column"],
                content="GOT-OCR 2.0 provides state-of-the-art performance on handwriting, equations, and complex layouts with format preservation.",
            ),
            dict(
                title="Qianfan OCR Key Information Extraction",
                doc_type="research_paper",
                capability_tags=["key_information_extraction", "medical_documents", "financial_documents"],
                content="Qianfan OCR specializes in structured data extraction with advanced KIE capabilities for medical and financial documents.",
            ),
            dict(
                title="Infinity-Parser2-Flash Document Parsing",
                doc_type="research_paper",
                capability_tags=["document_parsing", "layout_analysis", "tables", "charts", "markdown"],
                content="Infinity-Parser2-Flash is a 2B parameter fast document parser with SOTA layout analysis, table/chart/formula parsing, and Markdown output.",
            ),
            dict(
                title="Professional Tier Spec",
                doc_type="tier_spec",
                capability_tags=["equations", "handwriting"],
                content="Professional tier supports equations, multi-language, and handwriting using GOT-OCR 2.0 and Qianfan OCR.",
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
                role="user",
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

        # Bootstrap super admin from environment variables
        settings = get_settings()
        if settings.SUPER_ADMIN_EMAIL and settings.SUPER_ADMIN_PASSWORD:
            existing_admin = db.query(User).filter(User.email == settings.SUPER_ADMIN_EMAIL).first()
            if existing_admin:
                # Promote existing user to super admin
                if existing_admin.role != "super_admin":
                    existing_admin.role = "super_admin"
                    print(f"Promoted {settings.SUPER_ADMIN_EMAIL} to super admin")
            else:
                # Create new super admin
                admin_user = User(
                    email=settings.SUPER_ADMIN_EMAIL,
                    password_hash=hash_password(settings.SUPER_ADMIN_PASSWORD),
                    full_name="Super Admin",
                    role="super_admin",
                )
                db.add(admin_user)
                db.flush()
                
                # Super admins don't need a subscription profile for now
                # but we'll create one with unlimited quota for consistency
                admin_sub = SubscriptionProfile(
                    user_id=admin_user.id,
                    tier_id=None,
                    quota_limit=999999,
                    quota_used=0,
                    status="active",
                )
                db.add(admin_sub)
                print(f"Created super admin: {settings.SUPER_ADMIN_EMAIL}")

        db.commit()
    finally:
        db.close()
