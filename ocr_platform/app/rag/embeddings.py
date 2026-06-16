"""Embedding models for RAG (FastEmbed by default; HuggingFace optional on Linux/CUDA)."""

from __future__ import annotations

from functools import lru_cache

from langchain_core.embeddings import Embeddings

from app.core.config import get_settings


class FastEmbedEmbeddings(Embeddings):
    def __init__(self, model_name: str) -> None:
        from fastembed import TextEmbedding

        self._model = TextEmbedding(model_name=model_name)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [list(vec) for vec in self._model.embed(texts)]

    def embed_query(self, text: str) -> list[float]:
        return list(self._model.embed([text]))[0]


@lru_cache
def get_embedding_model() -> Embeddings:
    settings = get_settings()
    backend = settings.RAG_EMBEDDING_BACKEND.lower()

    if backend == "huggingface":
        from langchain_community.embeddings import HuggingFaceEmbeddings

        return HuggingFaceEmbeddings(
            model_name=settings.RAG_EMBEDDING_MODEL,
            model_kwargs={"device": settings.RAG_EMBEDDING_DEVICE},
            encode_kwargs={"normalize_embeddings": True},
        )

    return FastEmbedEmbeddings(model_name=settings.RAG_EMBEDDING_MODEL)
