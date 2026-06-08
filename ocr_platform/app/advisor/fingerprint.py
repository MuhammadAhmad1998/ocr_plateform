import io
import json
from typing import Any

from PIL import Image
from pypdf import PdfReader


def fingerprint_document(content: bytes, content_type: str, filename: str) -> dict[str, Any]:
    fp: dict[str, Any] = {
        "filename": filename,
        "content_type": content_type,
        "page_count": 1,
        "has_tables": False,
        "has_equations": False,
        "has_handwriting": False,
        "languages": ["en"],
        "layout_complexity": "simple",
        "doc_type": "unknown",
    }

    if content_type == "application/pdf" or filename.lower().endswith(".pdf"):
        fp["doc_type"] = "pdf"
        try:
            reader = PdfReader(io.BytesIO(content))
            fp["page_count"] = len(reader.pages)
            text = ""
            for page in reader.pages[:3]:
                text += page.extract_text() or ""
            fp["text_sample"] = text[:500]
            if "|" in text or "\t" in text:
                fp["has_tables"] = True
            if any(c in text for c in ["=", "∑", "∫", "\\frac"]):
                fp["has_equations"] = True
            if len(text.strip()) < 50 and fp["page_count"] > 0:
                fp["layout_complexity"] = "scanned"
        except Exception:
            fp["layout_complexity"] = "complex"
    elif content_type.startswith("image/"):
        fp["doc_type"] = "image"
        try:
            img = Image.open(io.BytesIO(content))
            fp["width"], fp["height"] = img.size
            if img.mode != "RGB":
                fp["layout_complexity"] = "scanned"
        except Exception:
            pass

    name_lower = filename.lower()
    if any(k in name_lower for k in ["invoice", "receipt", "form"]):
        fp["doc_type"] = "form"
        fp["has_tables"] = True
    elif any(k in name_lower for k in ["paper", "article", "thesis"]):
        fp["doc_type"] = "scientific"
        fp["layout_complexity"] = "complex"
    elif any(k in name_lower for k in ["handwritten", "note"]):
        fp["has_handwriting"] = True

    return fp
