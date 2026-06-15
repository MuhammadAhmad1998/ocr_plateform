"""PostgreSQL pgvector store for knowledge base chunks."""

from __future__ import annotations

import logging
from functools import lru_cache

from langchain_community.vectorstores import PGVector
from langchain_core.documents import Document
from sqlalchemy import create_engine, text

from app.core.config import get_settings
from app.rag.chunking import KBChunk
from app.rag.embeddings import get_embedding_model

logger = logging.getLogger(__name__)


def _sqlalchemy_connection_string() -> str:
    settings = get_settings()
    url = settings.DATABASE_URL
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg2://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg2://", 1)
    return url


def ensure_pgvector_extension() -> None:
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    logger.info("pgvector extension ensured")


@lru_cache
def get_vector_store() -> PGVector:
    settings = get_settings()
    ensure_pgvector_extension()
    return PGVector(
        connection_string=_sqlalchemy_connection_string(),
        embedding_function=get_embedding_model(),
        collection_name=settings.RAG_COLLECTION_NAME,
        use_jsonb=True,
    )


def count_indexed_chunks() -> int:
    settings = get_settings()
    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    query = text(
        """
        SELECT COUNT(e.uuid)
        FROM langchain_pg_embedding e
        JOIN langchain_pg_collection c ON c.uuid = e.collection_id
        WHERE c.name = :collection_name
        """
    )
    with engine.connect() as conn:
        result = conn.execute(query, {"collection_name": settings.RAG_COLLECTION_NAME}).scalar()
    return int(result or 0)


def clear_collection() -> None:
    store = get_vector_store()
    store.delete_collection()
    get_vector_store.cache_clear()


def index_chunks(chunks: list[KBChunk]) -> int:
    if not chunks:
        return 0

    clear_collection()
    store = get_vector_store()
    documents = [
        Document(page_content=chunk.content, metadata=chunk.metadata)
        for chunk in chunks
    ]
    store.add_documents(documents)
    return len(documents)
