"""Tests for knowledge base chunking."""

from app.rag.chunking import load_knowledge_chunks


def test_load_knowledge_chunks_returns_sections():
    chunks = load_knowledge_chunks()
    assert len(chunks) > 20

    categories = {chunk.metadata["category"] for chunk in chunks}
    assert "routing" in categories
    assert "case_study" in categories
    assert "comparison" in categories

    engines = {chunk.metadata["engine"] for chunk in chunks}
    assert "paddle-ocr-vl" in engines
    assert "got-ocr2" in engines
    assert "qianfan-ocr" in engines


def test_case_study_chunks_are_atomic():
    chunks = load_knowledge_chunks()
    case_chunks = [c for c in chunks if c.metadata["category"] == "case_study"]
    assert case_chunks
    for chunk in case_chunks:
        assert "case_id" in chunk.content or chunk.metadata.get("section")
