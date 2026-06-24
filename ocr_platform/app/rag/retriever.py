"""RAG retrieval for the OCR advisor (pgvector + local embeddings, mock fallback)."""

from __future__ import annotations

import logging
from typing import Any

from app.core.config import get_settings
from app.rag.store import count_indexed_chunks, get_vector_store

logger = logging.getLogger(__name__)

MOCK_KNOWLEDGE = [
    {
        "content": "TrOCR models excel at printed text recognition with transformer architecture. "
        "Best for clean scans and forms with high accuracy on English text.",
        "metadata": {"source_type": "research_paper", "capability_tags": "printed_text,forms"},
    },
    {
        "content": "Nougat is designed for scientific PDFs with equations, multi-column layouts, "
        "and academic formatting. Handles LaTeX-style math notation effectively.",
        "metadata": {"source_type": "research_paper", "capability_tags": "equations,scientific_pdf,multi_column"},
    },
    {
        "content": "Professional tier supports equations, multi-language documents, and handwriting. "
        "Quota: 5,000 pages/month. Includes API access and priority processing.",
        "metadata": {"source_type": "tier_spec", "tier_id": "pro", "capability_tags": "equations,handwriting,multi_language"},
    },
    {
        "content": "Essential tier handles printed text and tables. Ideal for invoices, receipts, "
        "and business documents under 500 pages/month.",
        "metadata": {"source_type": "tier_spec", "tier_id": "basic", "capability_tags": "printed_text,tables"},
    },
    {
        "content": "Starter tier provides basic PDF text extraction for evaluation. "
        "50 pages/month, no API access.",
        "metadata": {"source_type": "tier_spec", "tier_id": "free", "capability_tags": "pdf_text"},
    },
    {
        "content": "Handwriting recognition requires specialized models like TrOCR-handwritten. "
        "Print vs handwriting detection improves routing accuracy significantly.",
        "metadata": {"source_type": "research_paper", "capability_tags": "handwriting"},
    },
]

PHASE_CATEGORIES = {
    "greeting": {"questions", "fingerprint", "tier", "constraints"},
    "discovery": {"questions", "fingerprint", "profile", "tier", "comparison", "constraints"},
    "clarification": {"questions", "fingerprint", "profile", "routing", "selection_rules"},
    "recommendation": {
        "routing",
        "templates",
        "comparison",
        "selection_rules",
        "case_study",
        "profile",
        "technical",
        "tier",
    },
}

FINGERPRINT_TAG_MAP = {
    "has_tables": "tables",
    "has_equations": "equations",
    "has_handwriting": "handwriting",
}

DOC_TYPE_ENGINE_HINTS = {
    "form": "paddle-ocr-vl",
    "scientific": "got-ocr2",
    "medical_form": "qianfan-ocr",
    "report": "infinity-parser2-flash",
}


class RAGRetriever:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _use_mock(self) -> bool:
        if self.settings.USE_MOCK_RAG:
            return True
        try:
            return count_indexed_chunks() == 0
        except Exception as exc:
            logger.warning("RAG index check failed, using mock: %s", exc)
            return True

    def retrieve(
        self,
        query: str,
        *,
        fingerprint: dict | None = None,
        phase: str | None = None,
        top_k: int | None = None,
    ) -> list[dict]:
        top_k = top_k or self.settings.RAG_TOP_K
        if self._use_mock():
            return self._mock_retrieve(query, fingerprint=fingerprint, top_k=top_k)
        return self._vector_retrieve(query, fingerprint=fingerprint, phase=phase, top_k=top_k)

    def _mock_retrieve(
        self, query: str, *, fingerprint: dict | None = None, top_k: int = 5
    ) -> list[dict]:
        query_lower = query.lower()
        scored: list[tuple[float, dict]] = []
        for doc in MOCK_KNOWLEDGE:
            score = sum(1 for word in query_lower.split() if word in doc["content"].lower())
            tags = doc["metadata"].get("capability_tags", "")
            if isinstance(tags, list):
                tag_list = tags
            else:
                tag_list = [t.strip() for t in str(tags).split(",") if t.strip()]
            score += sum(2 for tag in tag_list if tag.replace("_", " ") in query_lower or tag in query_lower)
            if fingerprint:
                score += self._fingerprint_boost(doc["metadata"], fingerprint)
            if score > 0:
                scored.append((score, doc))
        scored.sort(key=lambda item: item[0], reverse=True)
        return [doc for _, doc in scored[:top_k]] or MOCK_KNOWLEDGE[:3]

    def _build_metadata_filter(self, fingerprint: dict | None, phase: str | None) -> dict[str, Any] | None:
        filters: dict[str, Any] = {}
        if phase and phase in PHASE_CATEGORIES:
            # PGVector JSONB filter: match any category in phase set via engine-agnostic retrieval
            # LangChain PGVector supports $in for list values in newer versions; use post-filter if not.
            pass

        if fingerprint:
            doc_type = fingerprint.get("doc_type")
            if doc_type in DOC_TYPE_ENGINE_HINTS:
                filters["engine"] = DOC_TYPE_ENGINE_HINTS[doc_type]

        return filters or None

    def _fingerprint_boost(self, metadata: dict, fingerprint: dict) -> float:
        boost = 0.0
        tags = metadata.get("capability_tags", "")
        tag_set = {t.strip() for t in str(tags).split(",") if t.strip()}
        for fp_key, tag in FINGERPRINT_TAG_MAP.items():
            if fingerprint.get(fp_key) and tag in tag_set:
                boost += 0.25
        doc_type = fingerprint.get("doc_type")
        doc_types = metadata.get("doc_types", "")
        if doc_type and doc_type in str(doc_types):
            boost += 0.2
        return boost

    def _phase_boost(self, metadata: dict, phase: str | None) -> float:
        if not phase:
            return 0.0
        allowed = PHASE_CATEGORIES.get(phase, set())
        category = metadata.get("category", "")
        if category in allowed:
            return 0.15
        return 0.0

    def _vector_retrieve(
        self,
        query: str,
        *,
        fingerprint: dict | None = None,
        phase: str | None = None,
        top_k: int = 5,
    ) -> list[dict]:
        store = get_vector_store()
        metadata_filter = self._build_metadata_filter(fingerprint, phase)
        search_k = max(top_k * 3, 12)

        try:
            if metadata_filter:
                results = store.similarity_search_with_score(
                    query, k=search_k, filter=metadata_filter
                )
            else:
                results = store.similarity_search_with_score(query, k=search_k)
        except Exception as exc:
            logger.warning("Vector retrieval failed, falling back to mock: %s", exc)
            return self._mock_retrieve(query, fingerprint=fingerprint, top_k=top_k)

        ranked: list[tuple[float, dict]] = []
        allowed_categories = PHASE_CATEGORIES.get(phase or "", set())

        for doc, distance in results:
            metadata = dict(doc.metadata)
            # Convert distance to similarity-ish score (lower distance = better)
            score = 1.0 / (1.0 + float(distance))
            score += self._fingerprint_boost(metadata, fingerprint or {})
            score += self._phase_boost(metadata, phase)

            category = metadata.get("category", "")
            if allowed_categories and category and category not in allowed_categories:
                score -= 0.1

            ranked.append(
                (
                    score,
                    {
                        "content": doc.page_content,
                        "metadata": metadata,
                    },
                )
            )

        ranked.sort(key=lambda item: item[0], reverse=True)
        return [item[1] for item in ranked[:top_k]]

    def describe_mode(self) -> dict[str, Any]:
        """Return current RAG mode for observability (API / UI indicators)."""
        using_mock = self._use_mock()
        indexed_chunks = 0
        if not using_mock:
            try:
                indexed_chunks = count_indexed_chunks()
            except Exception:
                indexed_chunks = 0
        return {
            "rag_mode": "mock" if using_mock else "vector",
            "use_mock_rag_setting": self.settings.USE_MOCK_RAG,
            "indexed_chunks": indexed_chunks,
        }

    def chunk_sources(self, chunks: list[dict], limit: int = 5) -> list[str]:
        sources: list[str] = []
        seen: set[str] = set()
        for chunk in chunks:
            metadata = chunk.get("metadata", {})
            source = metadata.get("source_file") or metadata.get("source_type", "unknown")
            if source not in seen:
                seen.add(source)
                sources.append(str(source))
            if len(sources) >= limit:
                break
        return sources

    def format_context(self, chunks: list[dict]) -> str:
        parts = []
        for i, chunk in enumerate(chunks, 1):
            metadata = chunk.get("metadata", {})
            source = metadata.get("source_file") or metadata.get("source_type", "unknown")
            engine = metadata.get("engine", "")
            category = metadata.get("category", "")
            label = " / ".join(part for part in (engine, category, source) if part)
            parts.append(f"[{i}] ({label})\n{chunk['content']}")
        return "\n\n".join(parts)


rag_retriever = RAGRetriever()
