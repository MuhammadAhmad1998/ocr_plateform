"""Document fingerprinting for OCR tier routing."""

from __future__ import annotations

import io
import re
from collections import Counter
from typing import Any

import fitz
from PIL import Image, ImageStat

FORM_FILENAME_KEYWORDS = ("invoice", "receipt", "form", "bill", "statement", "claim")
SCIENTIFIC_FILENAME_KEYWORDS = ("paper", "article", "thesis", "dissertation", "journal", "arxiv")
HANDWRITING_FILENAME_KEYWORDS = ("handwritten", "handwriting", "note", "notes", "script")
MEDICAL_FILENAME_KEYWORDS = ("medical", "patient", "prescription", "clinical", "eob")

TABLE_TEXT_PATTERNS = (
    r"\|.+\|",
    r"\t.+\t",
    r"(?m)^\s*\S+\s{2,}\S+\s{2,}\S+",
    r"(?i)\b(qty|quantity|amount|total|subtotal|unit\s*price|line\s*item)\b",
)
EQUATION_PATTERNS = (
    r"\\frac\b",
    r"\\sum\b",
    r"\\int\b",
    r"\\sqrt\b",
    r"[∑∫√±∞≈≠≤≥]",
    r"\^[0-9{n]",
    r"_[0-9{a-z]",
    r"(?i)\btheorem\b|\bproof\b|\bequation\b",
)

LANGUAGE_SCRIPT_MARKERS: list[tuple[str, str, re.Pattern[str]]] = [
    ("zh", "Chinese", re.compile(r"[\u4e00-\u9fff]")),
    ("ja", "Japanese", re.compile(r"[\u3040-\u30ff]")),
    ("ko", "Korean", re.compile(r"[\uac00-\ud7af]")),
    ("ar", "Arabic", re.compile(r"[\u0600-\u06ff]")),
    ("he", "Hebrew", re.compile(r"[\u0590-\u05ff]")),
    ("ru", "Cyrillic", re.compile(r"[\u0400-\u04ff]")),
    ("hi", "Devanagari", re.compile(r"[\u0900-\u097f]")),
]


def fingerprint_document(content: bytes, content_type: str, filename: str) -> dict[str, Any]:
    fp: dict[str, Any] = {
        "filename": filename,
        "content_type": content_type,
        "page_count": 1,
        "has_tables": False,
        "has_equations": False,
        "has_handwriting": False,
        "has_multi_column": False,
        "is_scanned": False,
        "languages": ["en"],
        "layout_complexity": "simple",
        "doc_type": "unknown",
        "text_density": "unknown",
        "routing_hints": [],
    }

    name_lower = filename.lower()
    filename_doc_type = _doc_type_from_filename(name_lower)
    if filename_doc_type:
        fp["doc_type"] = filename_doc_type

    is_pdf = content_type == "application/pdf" or name_lower.endswith(".pdf")
    is_image = content_type.startswith("image/")

    if is_pdf:
        _apply_pdf_signals(fp, content)
    elif is_image:
        _apply_image_signals(fp, content)
        fp["doc_type"] = fp.get("doc_type") or "image"

    if fp["doc_type"] == "unknown" and fp.get("text_sample"):
        inferred = _doc_type_from_text(fp["text_sample"], name_lower)
        if inferred:
            fp["doc_type"] = inferred

    if filename_doc_type == "form":
        fp["has_tables"] = True
    elif filename_doc_type == "scientific":
        fp["layout_complexity"] = "complex"
    elif filename_doc_type in {"handwriting", "medical_form"}:
        fp["has_handwriting"] = True

    fp["routing_hints"] = _build_routing_hints(fp)
    return fp


def format_fingerprint_for_prompt(fp: dict[str, Any], filename: str | None = None) -> str:
    """Human-readable document analysis for the advisor LLM with confidence indicators."""
    if not fp:
        return "No document uploaded yet. Ask the user to upload a sample before recommending a tier."

    name = filename or fp.get("filename", "unknown")
    doc_type = fp.get('doc_type', 'unknown')
    
    # Build analysis with confidence indicators
    lines = [f"📄 Document Analysis: {name}"]
    
    # Clear facts (high confidence)
    clear_facts = []
    clear_facts.append(f"{fp.get('page_count', 1)} page(s)")
    
    complexity = fp.get("layout_complexity", "unknown")
    if complexity in ("complex", "scanned"):
        clear_facts.append(f"{complexity} layout")
    
    if doc_type != "unknown":
        clear_facts.append(f"type: {doc_type}")
    
    langs = fp.get("languages") or ["en"]
    if len(langs) > 1:
        clear_facts.append(f"languages: {', '.join(langs)}")
    elif langs[0] != "en":
        clear_facts.append(f"language: {langs[0]}")
    
    if clear_facts:
        lines.append(f"\n✓ DETECTED (high confidence): {', '.join(clear_facts)}")

    # Detected features
    detected_features = []
    if fp.get("has_tables"):
        detected_features.append("tables")
    if fp.get("has_equations"):
        detected_features.append("equations/formulas")
    if fp.get("has_handwriting"):
        detected_features.append("handwriting")
    if fp.get("has_multi_column"):
        detected_features.append("multi-column layout")
    if fp.get("is_scanned"):
        detected_features.append("scanned/image-based")
    
    if detected_features:
        lines.append(f"✓ FEATURES FOUND: {', '.join(detected_features)}")

    # Uncertain/Unknown (what to ask about)
    uncertainties = []
    if doc_type == "unknown":
        uncertainties.append("document type unclear")
    if not detected_features and complexity == "simple":
        uncertainties.append("simple structure (may need to confirm use case)")
    
    if uncertainties:
        lines.append(f"\n⚠ UNCERTAIN: {', '.join(uncertainties)}")
    
    # Routing hints
    hints = fp.get("routing_hints", [])
    if hints:
        lines.append(f"\n💡 Routing hints: {' | '.join(hints[:3])}")

    # Text preview for context
    sample = (fp.get("text_sample") or "").strip()
    if sample:
        preview = sample[:150].replace("\n", " ")
        lines.append(f"\n📝 Text preview: {preview}...")

    lines.append("\n🎯 INSTRUCTION: Ask contextual questions based on what's UNCERTAIN. Don't ask about what's already DETECTED.")
    return "\n".join(lines)


def _doc_type_from_filename(name_lower: str) -> str | None:
    if any(k in name_lower for k in MEDICAL_FILENAME_KEYWORDS):
        return "medical_form"
    if any(k in name_lower for k in HANDWRITING_FILENAME_KEYWORDS):
        return "handwriting"
    if any(k in name_lower for k in FORM_FILENAME_KEYWORDS):
        return "form"
    if any(k in name_lower for k in SCIENTIFIC_FILENAME_KEYWORDS):
        return "scientific"
    return None


def _doc_type_from_text(text: str, name_lower: str) -> str | None:
    lower = text.lower()
    if any(k in lower for k in ("abstract", "references", "doi:", "arxiv", "theorem", "bibliography")):
        return "scientific"
    if any(k in lower for k in ("invoice", "receipt", "bill to", "amount due", "subtotal", "tax")):
        return "form"
    if any(k in lower for k in ("patient", "diagnosis", "prescription", "claim number")):
        return "medical_form"
    if any(k in name_lower for k in HANDWRITING_FILENAME_KEYWORDS):
        return "handwriting"
    return None


def _detect_tables(text: str) -> bool:
    return any(re.search(pattern, text) for pattern in TABLE_TEXT_PATTERNS)


def _detect_equations(text: str) -> bool:
    if any(char in text for char in ("=", "∑", "∫")):
        return True
    return any(re.search(pattern, text) for pattern in EQUATION_PATTERNS)


def _detect_languages(text: str) -> list[str]:
    if not text.strip():
        return ["en"]

    detected: list[str] = []
    for code, _label, pattern in LANGUAGE_SCRIPT_MARKERS:
        if pattern.search(text):
            detected.append(code)

    latin_chars = len(re.findall(r"[A-Za-z]", text))
    if latin_chars >= 5:
        detected.append("en")

    # Preserve order while deduplicating.
    seen: set[str] = set()
    ordered: list[str] = []
    for code in detected:
        if code not in seen:
            seen.add(code)
            ordered.append(code)

    return ordered or ["en"]


def _text_density_label(char_count: int, page_count: int) -> str:
    if page_count <= 0:
        return "unknown"
    per_page = char_count / page_count
    if per_page < 120:
        return "low"
    if per_page < 600:
        return "medium"
    return "high"


def _apply_pdf_signals(fp: dict[str, Any], content: bytes) -> None:
    fp["doc_type"] = fp.get("doc_type") or "pdf"
    try:
        doc = fitz.open(stream=content, filetype="pdf")
    except Exception:
        fp["layout_complexity"] = "complex"
        return

    try:
        fp["page_count"] = len(doc)
        pages_to_scan = min(len(doc), 5)
        text_parts: list[str] = []
        image_heavy_pages = 0
        table_pages = 0
        multi_column_pages = 0

        for page_index in range(pages_to_scan):
            page = doc[page_index]
            page_text = page.get_text("text") or ""
            text_parts.append(page_text)

            if _page_is_image_heavy(page):
                image_heavy_pages += 1

            try:
                tables = page.find_tables()
                if tables and tables.tables:
                    table_pages += 1
            except Exception:
                pass

            if _page_has_multi_column(page):
                multi_column_pages += 1

        text = "\n".join(text_parts)
        fp["text_sample"] = text[:800]
        fp["languages"] = _detect_languages(text)
        fp["has_tables"] = fp.get("has_tables") or table_pages > 0 or _detect_tables(text)
        fp["has_equations"] = _detect_equations(text)
        fp["text_density"] = _text_density_label(len(text.strip()), fp["page_count"])

        if image_heavy_pages >= max(1, pages_to_scan // 2) and len(text.strip()) < 80 * pages_to_scan:
            fp["is_scanned"] = True
            fp["layout_complexity"] = "scanned"
        elif multi_column_pages > 0 or fp["has_equations"]:
            fp["has_multi_column"] = multi_column_pages > 0
            fp["layout_complexity"] = "complex"
        elif fp["text_density"] == "high" and fp["page_count"] > 5:
            fp["layout_complexity"] = "complex"
        else:
            fp["layout_complexity"] = "simple"
    finally:
        doc.close()


def _apply_image_signals(fp: dict[str, Any], content: bytes) -> None:
    fp["is_scanned"] = True
    fp["layout_complexity"] = "scanned"
    fp["text_density"] = "low"

    try:
        img = Image.open(io.BytesIO(content))
        fp["width"], fp["height"] = img.size
        rgb = img.convert("RGB")
        stat = ImageStat.Stat(rgb.convert("L"))
        variance = stat.var[0]
        fp["image_variance"] = round(variance, 2)

        # High variance on grayscale-like scans often indicates handwriting or noisy scans.
        if variance > 1800 and img.mode in {"L", "LA", "1"}:
            fp["has_handwriting"] = True

        ocr_text = _sample_image_text(rgb)
        if ocr_text:
            fp["text_sample"] = ocr_text[:800]
            fp["languages"] = _detect_languages(ocr_text)
            fp["has_tables"] = _detect_tables(ocr_text)
            fp["has_equations"] = _detect_equations(ocr_text)
            fp["text_density"] = "medium" if len(ocr_text.strip()) > 80 else "low"
            if len(ocr_text.strip()) > 40:
                fp["is_scanned"] = True
    except Exception:
        pass


def _sample_image_text(img: Image.Image) -> str:
    try:
        import pytesseract
    except ImportError:
        return ""

    try:
        sample = img.copy()
        sample.thumbnail((1200, 1200))
        return pytesseract.image_to_string(sample) or ""
    except Exception:
        return ""


def _page_is_image_heavy(page: fitz.Page) -> bool:
    page_area = page.rect.width * page.rect.height
    if page_area <= 0:
        return False

    image_area = 0.0
    for block in page.get_images(full=True):
        try:
            bbox = page.get_image_bbox(block)
            image_area += bbox.width * bbox.height
        except Exception:
            image_area += page_area * 0.25

    text = (page.get_text("text") or "").strip()
    if image_area / page_area > 0.45 and len(text) < 80:
        return True
    return len(text) < 20 and image_area > 0


def _page_has_multi_column(page: fitz.Page) -> bool:
    """Detect multi-column layouts (academic papers, newspapers) - not simple label alignment."""
    blocks = page.get_text("dict").get("blocks", [])
    x_positions: list[float] = []
    for block in blocks:
        if block.get("type") != 0:
            continue
        bbox = block.get("bbox", [0, 0, 0, 0])
        x0 = bbox[0]
        width = bbox[2] - bbox[0]
        # Only consider text blocks with substantial width (not short labels)
        if width > 100:
            x_positions.append(round(x0 / 80) * 80)

    if len(x_positions) < 8:  # Need more blocks for confident column detection
        return False

    clusters = Counter(x_positions)
    # Require at least 2 distinct columns, each with 4+ blocks
    significant_clusters = [pos for pos, count in clusters.items() if count >= 4]
    if len(significant_clusters) < 2:
        return False
    
    # Verify columns are horizontally separated (not just indented paragraphs)
    positions = sorted(significant_clusters)
    min_separation = 150  # pixels
    return (positions[-1] - positions[0]) >= min_separation


def _build_routing_hints(fp: dict[str, Any]) -> list[str]:
    hints: list[str] = []

    if fp.get("has_handwriting"):
        hints.append("Handwriting detected — requires Pro+ tier.")
    if fp.get("has_equations"):
        hints.append("Math/equations detected — Pro tier recommended.")
    if fp.get("has_tables"):
        hints.append("Tables detected.")
    if fp.get("has_multi_column"):
        hints.append("Multi-column layout (e.g., newspaper/academic paper).")
    if fp.get("is_scanned"):
        hints.append("Scanned/image document — full OCR needed.")
    if fp.get("doc_type") == "scientific":
        hints.append("Scientific document detected.")
    if fp.get("doc_type") == "form":
        hints.append("Business form/invoice pattern.")
    if fp.get("doc_type") == "medical_form":
        hints.append("Medical/claims document.")
    if len(fp.get("languages") or []) > 1:
        hints.append("Multiple languages detected.")

    if not hints:
        hints.append("Standard document — Essential tier likely sufficient.")

    return hints
