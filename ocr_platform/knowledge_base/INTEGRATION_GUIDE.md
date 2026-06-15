# Knowledge Base Integration Guide

Quick reference for integrating this KB with your RAG system.

## Step 1: Update RAG Retriever

**File:** `ocr_platform/app/rag/retriever.py`

### Current State
```python
MOCK_KNOWLEDGE = [
    {"content": "TrOCR models excel...", "metadata": {...}},
    # ... hardcoded list
]
```

### Target State
```python
import yaml
from pathlib import Path
from typing import List, Dict

class RAGRetriever:
    def __init__(self):
        self.kb_path = Path("knowledge_base/")
        self.documents: List[Dict] = []
        self.load_knowledge_base()
        if not USE_MOCK_RAG:
            self.init_pinecone()
    
    def load_knowledge_base(self):
        """Load all YAML and MD files from knowledge base"""
        # Global files
        for yaml_file in (self.kb_path / "Global").glob("*.yaml"):
            self._load_yaml(yaml_file, engine="platform", category="global")
        
        # Engine-specific files
        for engine_dir in ["GOT-OCR-2.0", "PaddleOCR", "Qianfan-OCR"]:
            engine_path = self.kb_path / engine_dir
            
            # Main files
            for yaml_file in engine_path.glob("*.yaml"):
                self._load_yaml(yaml_file, engine=engine_dir, category="profile")
            
            # Case studies
            for case_file in (engine_path / "case_studies").glob("*.yaml"):
                self._load_yaml(case_file, engine=engine_dir, category="case_study")
            
            # Technical summary
            tech_file = engine_path / "technical_summary.md"
            if tech_file.exists():
                self._load_markdown(tech_file, engine=engine_dir, category="technical")
    
    def _load_yaml(self, file_path: Path, engine: str, category: str):
        """Load and chunk a YAML file"""
        content = yaml.safe_load(file_path.read_text())
        
        # Extract metadata
        metadata = {
            "source_file": str(file_path),
            "engine": engine,
            "category": category,
            "confidence": content.get("confidence", "unknown"),
            "capability_tags": content.get("metadata", {}).get("capability_tags", []),
            "doc_types": self._extract_doc_types(content),
        }
        
        # Chunk if large (split by top-level keys)
        if category == "profile":
            for key, value in content.items():
                if isinstance(value, dict):
                    self.documents.append({
                        "content": f"{key}: {yaml.dump(value)}",
                        "metadata": {**metadata, "section": key}
                    })
        else:
            self.documents.append({
                "content": yaml.dump(content),
                "metadata": metadata
            })
    
    def _load_markdown(self, file_path: Path, engine: str, category: str):
        """Load and chunk a Markdown file"""
        content = file_path.read_text()
        
        # Split by headers
        sections = self._split_markdown_by_headers(content)
        
        for section_title, section_content in sections:
            self.documents.append({
                "content": section_content,
                "metadata": {
                    "source_file": str(file_path),
                    "engine": engine,
                    "category": category,
                    "section": section_title,
                    "confidence": "documented"
                }
            })
    
    def _extract_doc_types(self, content: dict) -> List[str]:
        """Extract document types from content"""
        doc_types = []
        # Look in various places
        if "use_cases" in content:
            # Parse use case strings for doc types
            pass
        return doc_types
    
    def retrieve(self, query: str, fingerprint: dict = None, phase: str = None, top_k: int = 5) -> List[dict]:
        """
        Retrieve relevant chunks
        
        Args:
            query: User message or search query
            fingerprint: Document fingerprint signals
            phase: Conversation phase (greeting, discovery, recommendation)
            top_k: Number of results
        """
        if USE_MOCK_RAG:
            return self._mock_retrieve(query)
        
        # Build metadata filters
        filters = {}
        if fingerprint:
            # Filter by doc_type if known
            if fingerprint.get("doc_type") != "unknown":
                filters["doc_types"] = fingerprint["doc_type"]
            
            # Filter by capabilities if detected
            required_caps = []
            if fingerprint.get("has_tables"):
                required_caps.append("tables")
            if fingerprint.get("has_equations"):
                required_caps.append("equations")
            if fingerprint.get("has_handwriting"):
                required_caps.append("handwriting")
            
            if required_caps:
                filters["capability_tags"] = {"$in": required_caps}
        
        if phase:
            filters["conversation_phase"] = phase
        
        # Query Pinecone with filters
        results = self._query_vector_db(query, filters, top_k)
        return results
    
    def _query_vector_db(self, query: str, filters: dict, top_k: int):
        """Query Pinecone/vector DB with semantic search"""
        # Embed query
        query_embedding = self._embed_text(query)
        
        # Query with filters
        results = self.pinecone_index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filters
        )
        
        return [
            {
                "content": match.metadata["content"],
                "metadata": match.metadata,
                "score": match.score
            }
            for match in results.matches
        ]
```

## Step 2: Update Advisor Service

**File:** `ocr_platform/app/advisor/service.py`

### Enhanced Context Building
```python
def build_messages(self, db: Session, session: ChatSession, user_message: str) -> list[dict]:
    history = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
        .all()
    )
    
    # Extract fingerprint and phase
    fingerprint = session.document.fingerprint_json if session.document else {}
    phase = self._determine_phase(history)
    
    # Retrieve relevant KB chunks with filters
    rag_query = f"{user_message} document: {json.dumps(fingerprint)}"
    chunks = rag_retriever.retrieve(
        query=rag_query,
        fingerprint=fingerprint,
        phase=phase,
        top_k=5
    )
    context = rag_retriever.format_context(chunks)
    
    # Build messages
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT + f"\n\nKnowledge base:\n{context}"},
    ]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": user_message})
    
    return messages

def _determine_phase(self, history: list) -> str:
    """Determine conversation phase based on history"""
    msg_count = len([m for m in history if m.role == "user"])
    
    if msg_count == 0:
        return "greeting"
    elif msg_count <= 2:
        return "discovery"
    elif msg_count == 3:
        return "recommendation"
    else:
        return "clarification"
```

## Step 3: Embedding Strategy

### Option A: Embed on Startup
```python
# In ocr_platform/app/main.py

@app.on_event("startup")
async def startup_event():
    """Load and embed knowledge base on startup"""
    if not settings.USE_MOCK_RAG:
        logger.info("Loading knowledge base...")
        rag_retriever.load_knowledge_base()
        
        logger.info("Embedding documents...")
        rag_retriever.embed_all_documents()
        
        logger.info(f"Knowledge base ready: {len(rag_retriever.documents)} chunks")
```

### Option B: Pre-compute Embeddings
```bash
# Run once to generate embeddings
python scripts/embed_knowledge_base.py

# Outputs: knowledge_base/embeddings.pkl or uploads to Pinecone
```

## Step 4: Testing the Integration

### Test Script
```python
# tests/test_kb_integration.py

def test_kie_document_routing():
    """Test that KIE documents route to Qianfan"""
    fingerprint = {
        "doc_type": "form",
        "has_tables": True,
    }
    
    query = "Need to extract invoice fields"
    chunks = rag_retriever.retrieve(query, fingerprint, phase="discovery")
    
    # Should retrieve Qianfan KIE capability
    assert any("qianfan" in chunk["metadata"]["engine"].lower() for chunk in chunks)
    assert any("kie" in chunk["content"].lower() for chunk in chunks)

def test_table_heavy_routing():
    """Test that table-heavy docs prefer PaddleOCR"""
    fingerprint = {
        "doc_type": "form",
        "has_tables": True,
        "layout_complexity": "moderate"
    }
    
    query = "Process invoice with complex tables"
    chunks = rag_retriever.retrieve(query, fingerprint, phase="recommendation")
    
    # Should retrieve PaddleOCR table capability
    assert any("paddle" in chunk["metadata"]["engine"].lower() for chunk in chunks)
    assert any("table" in chunk["content"].lower() for chunk in chunks)

def test_formatted_output_routing():
    """Test that formatted output needs route to GOT"""
    fingerprint = {
        "doc_type": "scientific",
        "has_equations": True
    }
    
    query = "Need Markdown output with LaTeX formulas"
    chunks = rag_retriever.retrieve(query, fingerprint, phase="recommendation")
    
    # Should retrieve GOT formatted output capability
    assert any("got" in chunk["metadata"]["engine"].lower() for chunk in chunks)
    assert any("markdown" in chunk["content"].lower() or "latex" in chunk["content"].lower() for chunk in chunks)
```

## Step 5: Monitoring and Maintenance

### Log Retrieval Quality
```python
def retrieve(self, query: str, fingerprint: dict = None, phase: str = None, top_k: int = 5):
    results = self._query_vector_db(query, filters, top_k)
    
    # Log for quality monitoring
    logger.info(
        "RAG retrieval",
        extra={
            "query": query,
            "fingerprint": fingerprint,
            "phase": phase,
            "num_results": len(results),
            "top_scores": [r["score"] for r in results[:3]],
            "engines": [r["metadata"]["engine"] for r in results],
        }
    )
    
    return results
```

### Track Recommendation Accuracy
```python
# In advisor service after recommendation
def track_recommendation(session: ChatSession, recommendation: dict, user_feedback: str = None):
    """Track recommendation for KB improvement"""
    log_event(
        "recommendation_made",
        {
            "session_id": session.id,
            "fingerprint": session.document.fingerprint_json,
            "recommended_tier": recommendation["primary_tier"],
            "recommended_engine": recommendation["primary_engine"],
            "user_feedback": user_feedback,  # If user accepts/rejects
        }
    )
```

## Step 6: Gradual Rollout

### Phase 1: Shadow Mode
- RAG retrieval runs but doesn't affect recommendations
- Compare RAG context vs mock context
- Validate retrieval quality

### Phase 2: Hybrid Mode
- Use RAG for explanations, mock for routing
- Monitor explanation quality
- A/B test with users

### Phase 3: Full RAG
- RAG for both retrieval and routing
- Mock only as fallback
- Monitor recommendation accuracy

## Configuration

### Environment Variables
```bash
# .env
USE_MOCK_RAG=false
PINECONE_API_KEY=your_key
PINECONE_INDEX=ocr-knowledge
RAG_TOP_K=5
RAG_EMBEDDING_MODEL=text-embedding-3-small
```

### Settings
```python
# ocr_platform/app/core/config.py

class Settings(BaseSettings):
    # RAG
    USE_MOCK_RAG: bool = True
    PINECONE_API_KEY: str = ""
    PINECONE_INDEX: str = "ocr-knowledge"
    RAG_TOP_K: int = 5
    RAG_EMBEDDING_MODEL: str = "text-embedding-3-small"
```

## Quick Start Commands

```bash
# 1. Load knowledge base (one-time)
python scripts/load_kb.py

# 2. Generate embeddings
python scripts/embed_kb.py

# 3. Test retrieval
python scripts/test_retrieval.py --query "invoice table extraction"

# 4. Run tests
pytest tests/test_kb_integration.py -v

# 5. Start with RAG enabled
USE_MOCK_RAG=false uvicorn app.main:app --reload
```

## Troubleshooting

### Issue: No results returned
**Check:**
1. Knowledge base loaded? `len(rag_retriever.documents)`
2. Embeddings generated?
3. Pinecone connection working?
4. Filters too restrictive?

### Issue: Poor retrieval quality
**Try:**
1. Adjust `top_k` parameter
2. Tune metadata filters
3. Add more context to query
4. Review embedding model choice

### Issue: Wrong engine recommended
**Debug:**
1. Check what chunks were retrieved
2. Verify fingerprint signals
3. Review routing rules in KB
4. Check confidence scores

## Performance Tips

1. **Cache embeddings** - Don't re-embed on every request
2. **Batch queries** - If processing multiple documents
3. **Index optimization** - Pinecone has different index types
4. **Metadata indexing** - Ensure filters are indexed
5. **Chunk size** - Balance between context and precision

---

**Ready to integrate?** Start with Phase 1 (shadow mode) and gradually roll out!
