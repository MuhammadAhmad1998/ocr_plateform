"""Tests for RAG retriever mock path."""

from app.rag.retriever import RAGRetriever


def test_mock_retrieve_prefers_table_content(monkeypatch):
    retriever = RAGRetriever()
    monkeypatch.setattr(retriever, "_use_mock", lambda: True)

    chunks = retriever.retrieve(
        "invoice table extraction",
        fingerprint={"has_tables": True, "doc_type": "form"},
        phase="recommendation",
        top_k=3,
    )
    assert chunks
    combined = " ".join(chunk["content"].lower() for chunk in chunks)
    assert "table" in combined or "invoice" in combined


def test_format_context_includes_source_labels():
    retriever = RAGRetriever()
    text = retriever.format_context(
        [
            {
                "content": "Sample content",
                "metadata": {
                    "source_file": "Global/ocr_comparison_matrix.yaml",
                    "engine": "platform",
                    "category": "comparison",
                },
            }
        ]
    )
    assert "ocr_comparison_matrix.yaml" in text
    assert "Sample content" in text
