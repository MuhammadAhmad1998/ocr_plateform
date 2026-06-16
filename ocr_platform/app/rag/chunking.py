"""Load and chunk knowledge base YAML/Markdown files for RAG indexing."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import yaml

_KB_ROOT = Path(__file__).resolve().parents[2] / "knowledge_base"

ENGINE_SLUGS = {
    "GOT-OCR-2.0": "got-ocr2",
    "PaddleOCR": "paddle-ocr-vl",
    "Qianfan-OCR": "qianfan-ocr",
    "Global": "platform",
}

CATEGORY_BY_FILENAME = {
    "capability_profile.yaml": "profile",
    "limitations.yaml": "limitations",
    "supported_formats.yaml": "formats",
    "language_support.yaml": "languages",
    "routing_guide.yaml": "routing",
    "latency_cost_profile.yaml": "performance",
    "technical_summary.md": "technical",
    "tier_capabilities.yaml": "tier",
    "platform_constraints.yaml": "constraints",
    "fingerprint_signal_guide.yaml": "fingerprint",
    "ocr_comparison_matrix.yaml": "comparison",
    "ocr_selection_rules.yaml": "selection_rules",
    "question_generation_rules.yaml": "questions",
    "recommendation_templates.yaml": "templates",
}

CAPABILITY_KEYWORDS = {
    "tables": ["table", "tables", "teds", "invoice"],
    "equations": ["equation", "formula", "latex", "math"],
    "handwriting": ["handwriting", "handwritten", "cursive"],
    "charts": ["chart", "plot", "visualization"],
    "kie": ["key information", "kie", "field extraction"],
    "formatted_output": ["markdown", "latex", "formatted"],
    "interactive_ocr": ["interactive", "coordinate", "region"],
    "multi_language": ["language", "multilingual", "192", "109"],
    "scientific_pdf": ["scientific", "academic", "research paper"],
    "printed_text": ["printed text", "plain text", "ocr"],
}


@dataclass
class KBChunk:
    content: str
    metadata: dict[str, Any]


def knowledge_base_root() -> Path:
    return _KB_ROOT


def _parse_confidence(text: str) -> str:
    match = re.search(r"confidence:\s*(\w+)", text, re.IGNORECASE)
    return match.group(1).lower() if match else "unknown"


def _infer_capability_tags(content: str) -> list[str]:
    lower = content.lower()
    tags: list[str] = []
    for tag, keywords in CAPABILITY_KEYWORDS.items():
        if any(keyword in lower for keyword in keywords):
            tags.append(tag)
    return tags


def _infer_doc_types(content: str, data: dict | None = None) -> list[str]:
    doc_types: set[str] = set()
    if data:
        doc_type = data.get("document_characteristics", {}).get("doc_type")
        if doc_type:
            doc_types.add(str(doc_type))
    lower = content.lower()
    for candidate in ("invoice", "form", "scientific", "medical", "receipt", "pdf", "image"):
        if candidate in lower:
            doc_types.add(candidate)
    return sorted(doc_types)


def _conversation_phases(category: str) -> list[str]:
    mapping = {
        "questions": ["discovery", "clarification"],
        "fingerprint": ["discovery"],
        "routing": ["recommendation"],
        "templates": ["recommendation"],
        "comparison": ["recommendation"],
        "selection_rules": ["recommendation"],
        "case_study": ["recommendation"],
        "profile": ["discovery", "recommendation"],
        "tier": ["discovery", "recommendation"],
        "technical": ["recommendation"],
    }
    return mapping.get(category, ["discovery", "recommendation"])


def _chunk_yaml_file(path: Path, engine: str, category: str) -> list[KBChunk]:
    raw_text = path.read_text(encoding="utf-8")
    confidence = _parse_confidence(raw_text)
    data = yaml.safe_load(raw_text) or {}

    if category == "case_study":
        case_id = data.get("case_id", path.stem)
        content = yaml.dump(data, default_flow_style=False, sort_keys=False)
        tags = data.get("tags", []) or _infer_capability_tags(content)
        doc_types = _infer_doc_types(content, data)
        return [
            KBChunk(
                content=content,
                metadata={
                    "source_file": str(path.relative_to(_KB_ROOT)),
                    "engine": engine,
                    "category": category,
                    "section": case_id,
                    "confidence": data.get("confidence", confidence),
                    "capability_tags": ",".join(tags) if isinstance(tags, list) else str(tags),
                    "doc_types": ",".join(doc_types),
                    "conversation_phases": ",".join(_conversation_phases(category)),
                },
            )
        ]

    chunks: list[KBChunk] = []
    if not isinstance(data, dict):
        return chunks

    for section, value in data.items():
        if section.startswith("#"):
            continue
        section_text = yaml.dump({section: value}, default_flow_style=False, sort_keys=False)
        tags = _infer_capability_tags(section_text)
        doc_types = _infer_doc_types(section_text, data if isinstance(data, dict) else None)
        chunks.append(
            KBChunk(
                content=f"# {path.name} :: {section}\n\n{section_text}",
                metadata={
                    "source_file": str(path.relative_to(_KB_ROOT)),
                    "engine": engine,
                    "category": category,
                    "section": section,
                    "confidence": confidence,
                    "capability_tags": ",".join(tags),
                    "doc_types": ",".join(doc_types),
                    "conversation_phases": ",".join(_conversation_phases(category)),
                },
            )
        )
    return chunks


def _chunk_markdown_file(path: Path, engine: str, category: str) -> list[KBChunk]:
    raw_text = path.read_text(encoding="utf-8")
    confidence = _parse_confidence(raw_text)
    sections = re.split(r"(?=^## )", raw_text, flags=re.MULTILINE)
    chunks: list[KBChunk] = []

    for section_text in sections:
        section_text = section_text.strip()
        if not section_text:
            continue
        title_match = re.match(r"^##\s+(.+)$", section_text, re.MULTILINE)
        section = title_match.group(1).strip() if title_match else path.stem
        tags = _infer_capability_tags(section_text)
        doc_types = _infer_doc_types(section_text)
        chunks.append(
            KBChunk(
                content=f"# {path.name} :: {section}\n\n{section_text}",
                metadata={
                    "source_file": str(path.relative_to(_KB_ROOT)),
                    "engine": engine,
                    "category": category,
                    "section": section,
                    "confidence": confidence,
                    "capability_tags": ",".join(tags),
                    "doc_types": ",".join(doc_types),
                    "conversation_phases": ",".join(_conversation_phases(category)),
                },
            )
        )
    return chunks


def load_knowledge_chunks(kb_root: Path | None = None) -> list[KBChunk]:
    root = kb_root or knowledge_base_root()
    if not root.exists():
        raise FileNotFoundError(f"Knowledge base not found at {root}")

    chunks: list[KBChunk] = []

    global_dir = root / "Global"
    if global_dir.exists():
        for path in sorted(global_dir.glob("*.yaml")):
            category = CATEGORY_BY_FILENAME.get(path.name, "global")
            chunks.extend(_chunk_yaml_file(path, ENGINE_SLUGS["Global"], category))

    for engine_dir_name, engine_slug in ENGINE_SLUGS.items():
        if engine_dir_name == "Global":
            continue
        engine_dir = root / engine_dir_name
        if not engine_dir.exists():
            continue

        for path in sorted(engine_dir.glob("*.yaml")):
            category = CATEGORY_BY_FILENAME.get(path.name, "profile")
            chunks.extend(_chunk_yaml_file(path, engine_slug, category))

        for path in sorted(engine_dir.glob("*.md")):
            category = CATEGORY_BY_FILENAME.get(path.name, "technical")
            chunks.extend(_chunk_markdown_file(path, engine_slug, category))

        case_dir = engine_dir / "case_studies"
        if case_dir.exists():
            for path in sorted(case_dir.glob("*.yaml")):
                chunks.extend(_chunk_yaml_file(path, engine_slug, "case_study"))

    return chunks
