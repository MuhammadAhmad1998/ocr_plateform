"""Knowledge base indexing orchestration."""

from __future__ import annotations

import logging

from app.rag.chunking import load_knowledge_chunks
from app.rag.store import count_indexed_chunks, index_chunks

logger = logging.getLogger(__name__)


def run_full_reindex() -> dict:
    chunks = load_knowledge_chunks()
    indexed = index_chunks(chunks)
    logger.info("Indexed %s knowledge base chunks", indexed)
    return {"chunks_loaded": len(chunks), "chunks_indexed": indexed}


def ensure_kb_indexed() -> dict | None:
    """Bootstrap KB indexing on first run. Safe to call at startup."""
    try:
        existing = count_indexed_chunks()
        if existing > 0:
            logger.info("Knowledge base already indexed (%s chunks), skipping", existing)
            return None
        logger.info("No KB index found, running initial indexing...")
        result = run_full_reindex()
        logger.info(
            "Knowledge base auto-indexed: %s chunks from %s files",
            result["chunks_indexed"],
            result["chunks_loaded"],
        )
        return result
    except Exception as exc:
        logger.warning("KB auto-indexing failed (app will use mock fallback): %s", exc)
        return None
