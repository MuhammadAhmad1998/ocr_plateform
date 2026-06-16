import fitz

from app.advisor.fingerprint import (
    _detect_equations,
    _detect_languages,
    _detect_tables,
    fingerprint_document,
    format_fingerprint_for_prompt,
)


def test_detect_tables_from_aligned_columns():
    text = "Item    Qty    Price\nApple   2      4.00"
    assert _detect_tables(text) is True


def test_detect_equations_from_latex():
    assert _detect_equations(r"\frac{a}{b} + x^2") is True


def test_detect_languages_multiscript():
    langs = _detect_languages("Hello 你好 world")
    assert "en" in langs
    assert "zh" in langs


def test_fingerprint_pdf_invoice_text():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Invoice\nBill To: Acme\nSubtotal | Tax | Total\n10 | 2 | 12")
    content = doc.tobytes()
    doc.close()

    fp = fingerprint_document(content, "application/pdf", "invoice_march.pdf")

    assert fp["doc_type"] == "form"
    assert fp["has_tables"] is True
    assert fp["page_count"] == 1
    assert fp["routing_hints"]


def test_fingerprint_scientific_pdf():
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 72), "Abstract\nWe prove a theorem with equation x^2 + y^2 = z^2")
    content = doc.tobytes()
    doc.close()

    fp = fingerprint_document(content, "application/pdf", "research_paper.pdf")

    assert fp["doc_type"] == "scientific"
    assert fp["has_equations"] is True


def test_format_fingerprint_for_prompt_includes_signals():
    fp = {
        "filename": "invoice.pdf",
        "content_type": "application/pdf",
        "page_count": 2,
        "doc_type": "form",
        "layout_complexity": "simple",
        "text_density": "medium",
        "languages": ["en"],
        "has_tables": True,
        "has_equations": False,
        "has_handwriting": False,
        "has_multi_column": False,
        "is_scanned": False,
        "routing_hints": ["Tabular structure detected — prioritize table-aware OCR engines."],
        "text_sample": "Invoice total 100",
    }

    prompt = format_fingerprint_for_prompt(fp)

    assert "invoice.pdf" in prompt
    assert "Tables: yes" in prompt
    assert "Routing implications" in prompt
