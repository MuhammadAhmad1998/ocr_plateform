MOCK_KNOWLEDGE = [
    {
        "content": "TrOCR models excel at printed text recognition with transformer architecture. "
        "Best for clean scans and forms with high accuracy on English text.",
        "metadata": {"source_type": "research_paper", "capability_tags": ["printed_text", "forms"]},
    },
    {
        "content": "Nougat is designed for scientific PDFs with equations, multi-column layouts, "
        "and academic formatting. Handles LaTeX-style math notation effectively.",
        "metadata": {"source_type": "research_paper", "capability_tags": ["equations", "scientific_pdf", "multi_column"]},
    },
    {
        "content": "Professional tier supports equations, multi-language documents, and handwriting. "
        "Quota: 5,000 pages/month. Includes API access and priority processing.",
        "metadata": {"source_type": "tier_spec", "tier_id": "pro", "capability_tags": ["equations", "handwriting", "multi_language"]},
    },
    {
        "content": "Essential tier handles printed text and tables. Ideal for invoices, receipts, "
        "and business documents under 500 pages/month.",
        "metadata": {"source_type": "tier_spec", "tier_id": "basic", "capability_tags": ["printed_text", "tables"]},
    },
    {
        "content": "Starter tier provides basic PDF text extraction for evaluation. "
        "50 pages/month, no API access.",
        "metadata": {"source_type": "tier_spec", "tier_id": "free", "capability_tags": ["pdf_text"]},
    },
    {
        "content": "Handwriting recognition requires specialized models like TrOCR-handwritten. "
        "Print vs handwriting detection improves routing accuracy significantly.",
        "metadata": {"source_type": "research_paper", "capability_tags": ["handwriting"]},
    },
]


class RAGRetriever:
    def __init__(self) -> None:
        self.use_mock = True

    def retrieve(self, query: str, top_k: int = 5) -> list[dict]:
        query_lower = query.lower()
        scored = []
        for doc in MOCK_KNOWLEDGE:
            score = sum(1 for word in query_lower.split() if word in doc["content"].lower())
            tags = doc["metadata"].get("capability_tags", [])
            score += sum(2 for tag in tags if tag.replace("_", " ") in query_lower or tag in query_lower)
            if score > 0:
                scored.append((score, doc))
        scored.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored[:top_k]] or MOCK_KNOWLEDGE[:3]

    def format_context(self, chunks: list[dict]) -> str:
        parts = []
        for i, chunk in enumerate(chunks, 1):
            source = chunk["metadata"].get("source_type", "unknown")
            parts.append(f"[{i}] ({source}) {chunk['content']}")
        return "\n\n".join(parts)


rag_retriever = RAGRetriever()
