from sqlalchemy.orm import Session

from platform_api.models import Engine, Tier
from platform_api.ocr_bridge import get_ocr_platform_settings


def seed_registry(db: Session) -> None:
    tiers = [
        ("free", "Starter", "PDF text extraction", 50),
        ("basic", "Essential", "Printed text + tables", 500),
        ("pro", "Professional", "Advanced OCR", 5000),
        ("enterprise", "Enterprise", "All capabilities", 999999),
    ]
    tier_map: dict[str, Tier] = {}
    for slug, name, desc, quota in tiers:
        tier = db.query(Tier).filter(Tier.slug == slug).first()
        if not tier:
            tier = Tier(slug=slug, public_name=name, description=desc, quota_limit=quota)
            db.add(tier)
            db.flush()
        tier_map[slug] = tier

    engines = [
        ("paddle-ocr-free", "free", "PaddleOCR Lite", "paddle-ocr", ["printed_text", "forms"]),
        ("paddle-ocr-vl", "basic", "PaddleOCR Vision-Language", "paddle-ocr-vl", ["ocr", "pdf", "images", "tables"]),
        ("got-ocr2", "pro", "GOT-OCR 2.0", "got-ocr2", ["ocr", "handwriting", "equations"]),
        ("qianfan-ocr", "pro", "Qianfan OCR", "qianfan-ocr", ["ocr", "kie"]),
        ("got-ocr2-enterprise", "enterprise", "GOT-OCR 2.0 Enterprise", "got-ocr2", ["ocr", "scientific_pdf"]),
    ]
    for slug, tier_slug, name, adapter, tags in engines:
        if db.query(Engine).filter(Engine.slug == slug).first():
            continue
        db.add(
            Engine(
                slug=slug,
                tier_id=tier_map[tier_slug].id,
                display_name=name,
                adapter_type=adapter,
                capability_tags=tags,
            )
        )
    db.commit()


def build_models_list(db: Session) -> dict:
    """Match ocr_platform /api/v1/testing/models catalog (open access)."""
    settings = get_ocr_platform_settings()
    engines = (
        db.query(Engine)
        .filter(Engine.is_active.is_(True))
        .order_by(Engine.display_name)
        .all()
    )

    models = [
        {
            "slug": engine.slug,
            "display_name": engine.display_name,
            "type": "ocr",
            "adapter_type": engine.adapter_type,
            "capability_tags": engine.capability_tags or [],
        }
        for engine in engines
    ]

    if settings.VLM_ENABLED:
        models.insert(
            0,
            {
                "slug": "vlm",
                "display_name": f"VLM ({settings.VLM_MODEL_ID})",
                "type": "vlm",
                "adapter_type": "vlm",
                "capability_tags": ["vision", "pdf", "images", "qa"],
            },
        )

    if settings.PADDLE_OCR_ENABLED:
        insert_at = 1 if settings.VLM_ENABLED else 0
        models.insert(
            insert_at,
            {
                "slug": "paddle-ocr-vl",
                "display_name": f"PaddleOCR-VL ({settings.PADDLE_OCR_MODEL_ID})",
                "type": "paddle_ocr",
                "adapter_type": "paddle_ocr",
                "capability_tags": ["vision", "pdf", "images", "ocr", "table", "chart", "formula"],
            },
        )

    if settings.QIANFAN_OCR_ENABLED:
        insert_at = sum(1 for flag in (settings.VLM_ENABLED, settings.PADDLE_OCR_ENABLED) if flag)
        models.insert(
            insert_at,
            {
                "slug": "qianfan-ocr",
                "display_name": f"Qianfan-OCR ({settings.QIANFAN_OCR_MODEL_ID})",
                "type": "qianfan_ocr",
                "adapter_type": "qianfan_ocr",
                "capability_tags": ["vision", "pdf", "images", "ocr", "markdown"],
            },
        )

    if settings.GOT_OCR_ENABLED:
        insert_at = sum(
            1
            for flag in (
                settings.VLM_ENABLED,
                settings.PADDLE_OCR_ENABLED,
                settings.QIANFAN_OCR_ENABLED,
            )
            if flag
        )
        models.insert(
            insert_at,
            {
                "slug": "got-ocr2",
                "display_name": f"GOT-OCR 2.0 ({settings.GOT_OCR_MODEL_ID})",
                "type": "got_ocr",
                "adapter_type": "got-ocr2",
                "capability_tags": ["vision", "pdf", "images", "ocr", "format", "plain_text"],
            },
        )

    return {"models": models}
