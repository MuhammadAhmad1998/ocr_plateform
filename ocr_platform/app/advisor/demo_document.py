"""Attach a built-in sample document when the advisor demo runs without an upload."""

from __future__ import annotations

import io

from PIL import Image, ImageDraw, ImageFont
from sqlalchemy.orm import Session

from app.advisor.models import ChatMessage, ChatSession, Document
from app.core.storage import storage
from app.registry.models import Engine

_ENGINE_SAMPLE_TEXT: dict[str, str] = {
    "paddle-ocr-free": (
        "INVOICE #1042\n"
        "Date: March 15, 2026\n"
        "Bill To: Acme Corp\n"
        "Item          Qty    Amount\n"
        "Widget A       12    $240.00\n"
        "Widget B        4     $80.00\n"
        "Total:                $320.00"
    ),
    "paddle-ocr-vl": (
        "PURCHASE ORDER\n"
        "Vendor: Northwind Supplies\n"
        "Ship To: 42 Market Street\n"
        "SKU      Description       Qty   Price\n"
        "A-100    Stainless bolts    50   $12.50\n"
        "B-220    Rubber gaskets     25    $4.75\n"
        "Subtotal:                         $781.25"
    ),
    "got-ocr2": (
        "Research Notes — Quantum Optics\n"
        "The wave function evolves as:\n"
        "psi(x,t) = A * exp(i*(k*x - omega*t))\n"
        "Energy relation: E = h * f\n"
        "Handwritten margin note: verify boundary conditions."
    ),
    "got-ocr2-enterprise": (
        "Technical Report — Materials Science\n"
        "Stress tensor: sigma_ij = F/A\n"
        "Figure 3: crystalline lattice (multi-column layout)\n"
        "Annotated diagram with handwritten callouts."
    ),
    "qianfan-ocr": (
        "PATIENT INTAKE FORM\n"
        "Name: Jane Doe          DOB: 1988-04-12\n"
        "Policy ID: MED-44821    Provider: City Clinic\n"
        "Diagnosis code: J06.9    Visit date: 2026-06-16\n"
        "Prescription: Amoxicillin 500mg — 3x daily"
    ),
    "qianfan-ocr-enterprise": (
        "LOAN APPLICATION — CONFIDENTIAL\n"
        "Applicant: Robert Chen     SSN: ***-**-4821\n"
        "Annual income: $128,400    Employer: Horizon Labs\n"
        "Requested amount: $45,000  Term: 36 months\n"
        "Collateral: commercial property — Block 7, Lot 12"
    ),
    "infinity-parser2-flash": (
        "QUARTERLY REPORT — Q1 2026\n"
        "Revenue by Region          | Units | Growth\n"
        "North America              | 12.4M | +8.2%\n"
        "Europe                     |  8.1M | +5.1%\n"
        "Figure 1: Regional sales chart (bar chart)\n"
        "Formula: ROI = (Gain - Cost) / Cost"
    ),
    "infinity-parser2-flash-enterprise": (
        "ANNUAL FINANCIAL STATEMENT\n"
        "Consolidated Balance Sheet (multi-column)\n"
        "Assets | 2025 | 2024 | Change\n"
        "Chart: YoY revenue trend\n"
        "Chemical notation: H2SO4 + 2NaOH -> Na2SO4 + 2H2O"
    ),
}

_DEFAULT_SAMPLE_TEXT = (
    "OCR Platform Demo Document\n"
    "This sample shows how your recommended engine extracts printed text.\n"
    "Line 3: Order reference KLX-2026-0616\n"
    "Line 4: Thank you for evaluating Planet OCR."
)

_ENGINE_FINGERPRINTS: dict[str, dict] = {
    "paddle-ocr-free": {"doc_type": "invoice", "has_tables": True, "layout_complexity": "simple"},
    "paddle-ocr-vl": {"doc_type": "form", "has_tables": True, "layout_complexity": "moderate"},
    "got-ocr2": {
        "doc_type": "scientific",
        "has_equations": True,
        "has_handwriting": True,
        "layout_complexity": "complex",
    },
    "got-ocr2-enterprise": {
        "doc_type": "scientific",
        "has_equations": True,
        "has_handwriting": True,
        "has_tables": True,
        "layout_complexity": "complex",
    },
    "qianfan-ocr": {"doc_type": "medical", "has_tables": True, "layout_complexity": "moderate"},
    "qianfan-ocr-enterprise": {
        "doc_type": "financial",
        "has_tables": True,
        "layout_complexity": "moderate",
    },
    "infinity-parser2-flash": {
        "doc_type": "report",
        "has_tables": True,
        "has_charts": True,
        "has_equations": True,
        "layout_complexity": "complex",
    },
    "infinity-parser2-flash-enterprise": {
        "doc_type": "report",
        "has_tables": True,
        "has_charts": True,
        "has_equations": True,
        "layout_complexity": "complex",
        "page_count": 12,
    },
}


def _sample_text_for_engine(engine_slug: str | None) -> str:
    if engine_slug and engine_slug in _ENGINE_SAMPLE_TEXT:
        return _ENGINE_SAMPLE_TEXT[engine_slug]
    return _DEFAULT_SAMPLE_TEXT


def _fingerprint_for_engine(engine_slug: str | None) -> dict:
    if engine_slug and engine_slug in _ENGINE_FINGERPRINTS:
        return dict(_ENGINE_FINGERPRINTS[engine_slug])
    return {"doc_type": "form", "layout_complexity": "simple"}


def _render_sample_image(text: str) -> bytes:
    lines = text.split("\n")
    line_height = 28
    padding = 32
    width = 900
    height = max(400, padding * 2 + line_height * len(lines))

    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    except OSError:
        font = ImageFont.load_default()

    y = padding
    for line in lines:
        draw.text((padding, y), line, fill="black", font=font)
        y += line_height

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def ensure_demo_document(
    db: Session,
    session: ChatSession,
    user_id: uuid.UUID,
    *,
    engine_slug: str | None = None,
) -> Document:
    """Return the session document, creating a built-in sample when none was uploaded."""
    if session.document_id:
        existing = db.query(Document).filter(Document.id == session.document_id).first()
        if existing:
            return existing

    text = _sample_text_for_engine(engine_slug)
    content = _render_sample_image(text)
    filename = f"advisor-demo-{engine_slug or 'sample'}.png"
    s3_key = storage.upload(content, "demo-samples", filename, "image/png")

    doc = Document(
        user_id=user_id,
        filename=filename,
        content_type="image/png",
        s3_key=s3_key,
        fingerprint_json=_fingerprint_for_engine(engine_slug),
        page_count=1,
    )
    db.add(doc)
    db.flush()

    session.document_id = doc.id
    db.flush()
    return doc


def recommendation_from_session(db: Session, session: ChatSession) -> dict | None:
    last_rec = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id, ChatMessage.metadata_json.isnot(None))
        .order_by(ChatMessage.created_at.desc())
        .first()
    )
    if last_rec and last_rec.metadata_json:
        return last_rec.metadata_json.get("recommendation")
    return None


def engine_slug_for_session(db: Session, session: ChatSession, engine: Engine | None) -> str | None:
    if engine:
        return engine.slug
    recommendation = recommendation_from_session(db, session)
    if recommendation:
        return recommendation.get("selected_engine")
    return None
