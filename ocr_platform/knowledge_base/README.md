# OCR Knowledge Base

**Created:** June 15, 2026  
**Purpose:** RAG-grounded knowledge base for intelligent OCR engine selection and tier recommendation

## Overview

This knowledge base supports the Unified OCR Platform's intelligent advisor chatbot. It provides:
- **Platform tier capabilities** (Starter, Essential, Professional, Enterprise)
- **OCR engine profiles** (GOT-OCR 2.0, PaddleOCR-VL, Qianfan-OCR, Infinity-Parser2-Flash)
- **Routing rules** for tier + engine recommendations
- **Case studies** for grounded explanations
- **Technical references** for detailed understanding

## Structure

```
knowledge_base/
├── Global/                              # Platform-wide knowledge
│   ├── tier_capabilities.yaml          # Tier quotas, features, limitations
│   ├── platform_constraints.yaml       # Upload limits, rate limits, etc.
│   ├── fingerprint_signal_guide.yaml   # How to interpret document fingerprints
│   ├── ocr_comparison_matrix.yaml      # Side-by-side engine comparison
│   ├── ocr_selection_rules.yaml        # Deterministic routing logic
│   ├── question_generation_rules.yaml  # Conditional discovery questions
│   └── recommendation_templates.yaml   # How to explain recommendations
│
├── GOT-OCR-2.0/                        # 580M params, end-to-end
│   ├── capability_profile.yaml         # Strengths, benchmarks, use cases
│   ├── limitations.yaml                # Known weaknesses, when not to use
│   ├── supported_formats.yaml          # Input/output formats
│   ├── language_support.yaml           # Multi-lingual capabilities
│   ├── routing_guide.yaml              # When to route to GOT-OCR
│   ├── latency_cost_profile.yaml       # Performance characteristics
│   ├── technical_summary.md            # Deep dive with benchmarks
│   └── case_studies/                   # Atomic use case stories
│       ├── academic_paper_latex.yaml
│       └── interactive_form_extraction.yaml
│
├── PaddleOCR/                          # 0.9B params, SOTA tables
│   ├── capability_profile.yaml
│   ├── routing_guide.yaml
│   └── case_studies/
│       └── invoice_batch_processing.yaml
│
├── Qianfan-OCR/                        # 4B params, document intelligence
│   ├── capability_profile.yaml
│   ├── routing_guide.yaml
│   └── case_studies/
│       └── kie_medical_claims.yaml
│
└── Infinity-Parser2-Flash/             # 2B params, fast document parsing
    ├── capability_profile.yaml
    ├── limitations.yaml
    ├── supported_formats.yaml
    ├── language_support.yaml
    ├── routing_guide.yaml
    ├── latency_cost_profile.yaml
    ├── technical_summary.md
    └── case_studies/
        ├── financial_report_doc2json.yaml
        └── high_volume_markdown_rag.yaml
```

## Confidence Levels

All documents include confidence tags:

| Tag | Meaning | Source |
|-----|---------|--------|
| **verified** | From platform codebase | `ocr_platform/` files |
| **documented** | From official sources | Papers, model cards, docs |
| **heuristic** | Routing logic/best practices | Platform design decisions |
| **placeholder** | Needs benchmarking | TBD fields marked clearly |

## How the RAG System Uses This KB

### 1. Fingerprint Analysis
When a user uploads a document, the system extracts signals:
- `doc_type`: pdf, image, form, scientific, unknown
- `has_tables`: boolean
- `has_equations`: boolean
- `has_handwriting`: boolean
- `layout_complexity`: simple, scanned, complex
- `page_count`: integer
- `languages`: array

**KB Usage:** `Global/fingerprint_signal_guide.yaml` interprets these signals and maps to routing logic.

### 2. Discovery Questions
The advisor asks clarifying questions based on missing signals.

**KB Usage:** `Global/question_generation_rules.yaml` determines:
- Which questions to ask
- Which to skip (fingerprint already answered)
- Priority ordering

### 3. Engine Routing
The system scores engines based on document characteristics.

**KB Usage:**
- `Global/ocr_selection_rules.yaml` - Deterministic rules
- `{Engine}/routing_guide.yaml` - Per-engine decision trees
- `Global/ocr_comparison_matrix.yaml` - Feature matrix

### 4. Recommendation Explanation
The advisor explains *why* it recommends a specific tier + engine.

**KB Usage:**
- `{Engine}/capability_profile.yaml` - Strengths for this use case
- `Global/recommendation_templates.yaml` - Structured explanation format
- `{Engine}/case_studies/*.yaml` - Real-world examples

### 5. RAG Retrieval
The advisor retrieves relevant chunks based on:
- User message content
- Document fingerprint signals
- Conversation phase (greeting, discovery, recommendation)

**Metadata for retrieval:**
```yaml
metadata:
  engine: "paddle-ocr-vl"
  capability_tags: [tables, charts, formulas]
  doc_types: [form, invoice, scientific]
  languages: [en, zh]
  conversation_phase: discovery | recommendation
  source_type: routing_guide | case_study | limitation
  confidence: verified | documented | heuristic | placeholder
```

## Platform Integration

### Current Integration
The knowledge base is used by:
- `ocr_platform/app/advisor/service.py` - Advisor chatbot
- `ocr_platform/app/rag/retriever.py` - RAG retrieval system
- `ocr_platform/app/registry/service.py` - Engine scoring

### Migration from Mock to KB
**Current:** `ocr_platform/app/rag/retriever.py` uses `MOCK_KNOWLEDGE`

**TODO:** Update RAG retriever to:
1. Load YAML/MD files from this knowledge_base/ folder
2. Chunk documents with proper metadata
3. Embed and index in Pinecone (or vector store)
4. Retrieve based on query + fingerprint + phase

**Code changes needed:**
```python
# In ocr_platform/app/rag/retriever.py
class RAGRetriever:
    def __init__(self):
        self.kb_path = "knowledge_base/"
        self.load_knowledge_base()  # NEW: Load YAML/MD files
        self.index_documents()      # NEW: Create embeddings
    
    def retrieve(self, query: str, fingerprint: dict, phase: str) -> list[dict]:
        # NEW: Use semantic search with metadata filters
        # Filter by: engine, doc_type, capability_tags, phase
        pass
```

## Engine Comparison Quick Reference

| Aspect | GOT-OCR 2.0 | PaddleOCR-VL | Infinity-Parser2-Flash | Qianfan-OCR |
|--------|-------------|--------------|------------------------|-------------|
| **Size** | 580M ⚡ | 0.9B | 2B | 4B |
| **Speed** | Fastest | Fast | **Fast doc parsing** ⚡ | Moderate |
| **Tables** | Excellent | **SOTA** ⭐ | Excellent | Excellent |
| **Formulas** | Excellent | **SOTA** ⭐ | Excellent | Excellent |
| **Formatted Output** | **SOTA** ⭐ | Good | Excellent (doc2md) | Excellent |
| **Layout JSON + bbox** | No | Structured modes | **Native** ⭐ | Layout-as-Thought |
| **Interactive OCR** | **Unique** ⭐ | No | No | No |
| **Handwriting** | Moderate | Good | Moderate | **Excellent** ⭐ |
| **Languages** | Multi-lingual | 109 | EN/ZH primary | **192** ⭐ |
| **Layout Analysis** | Implicit | Explicit (2-stage) | Explicit (doc2json) | Layout-as-Thought |
| **KIE Tasks** | No | No | No | **SOTA** ⭐ |
| **Document Q&A** | No | No | Good (DocVQA) | **Unique** ⭐ |

### When to Use Each Engine

**GOT-OCR 2.0** → Formatted output, interactive OCR, speed, charts  
**PaddleOCR-VL** → Business documents, SOTA tables, invoices, seals  
**Infinity-Parser2-Flash** → Fast doc parsing, layout JSON, Markdown RAG pipelines, EN/ZH reports  
**Qianfan-OCR** → KIE, handwriting, document Q&A, complex layouts, 192 languages

## Tier Recommendation Logic

```
User uploads document → Fingerprint extracted → Signals analyzed

IF has_handwriting:
    tier = "pro" or "enterprise"
    engines = [qianfan-ocr, trocr-handwritten]

ELSE IF has_equations:
    tier = "pro"
    engines = [paddle-ocr-vl, got-ocr2, qianfan-ocr]

ELSE IF has_tables AND doc_type == "form":
    tier = "basic"
    engines = [paddle-ocr-vl, donut-base]

ELSE IF layout_complexity == "complex":
    tier = "enterprise"
    engines = [qianfan-ocr, pix2struct]

ELSE:
    tier = "basic"
    engines = [trocr-base, paddle-ocr-vl]

THEN:
    Ask discovery questions to refine
    Score engines within tier
    Return recommendation with reasoning
```

## Adding New Content

### Adding a New Engine
1. Create folder: `knowledge_base/{Engine-Name}/`
2. Required files:
   - `capability_profile.yaml`
   - `routing_guide.yaml`
   - `case_studies/` folder with 2-3 atomic cases
3. Update:
   - `Global/ocr_comparison_matrix.yaml`
   - `Global/ocr_selection_rules.yaml`
4. Tag all content with confidence levels

### Adding a Case Study
1. Create: `{Engine}/case_studies/{use_case_slug}.yaml`
2. Use template structure:
   ```yaml
   case_id: unique_slug
   title: Brief title
   engine: engine-slug
   tier: recommended_tier
   user_profile: {...}
   document_characteristics: {...}
   why_{engine}: {...}
   workflow: {...}
   results: {...}
   tags: [...]
   confidence: high|medium|low
   ```
3. Include:
   - Concrete numbers (volume, accuracy)
   - Why this engine was chosen
   - Alternatives considered
   - Lessons learned

## Indexing

The backend automatically indexes this knowledge base on first startup when `USE_MOCK_RAG=false` is set in `.env`. The indexing process:

1. Walks all YAML and Markdown files in this directory
2. Chunks content by section with metadata (engine, category, capability tags)
3. Generates embeddings using `BAAI/bge-small-en-v1.5` (FastEmbed by default)
4. Stores vectors in PostgreSQL pgvector (`langchain_pg_embedding` table)

### When Indexing Runs

| Scenario | Behavior |
|----------|----------|
| **New machine, empty DB** | Auto-indexes on first `uvicorn` start (15-60s) |
| **Normal restarts** | Skipped — indexed chunks persist in Postgres |
| **After KB file edits** | Run `python scripts/index_kb.py` manually to rebuild |
| **`USE_MOCK_RAG=true`** | Indexing skipped — advisor uses mock fallback |

### Manual Reindexing

After editing KB files, force a rebuild:

```bash
cd ocr_platform
python scripts/index_kb.py
```

This clears the existing collection and re-indexes all files.

## Maintenance

### Regular Updates
- **Quarterly:** Update benchmarks if new papers published
- **Monthly:** Add case studies from real platform usage
- **As needed:** Update platform constraints when config changes

### Benchmarking TODOs
Mark with `TBD - benchmark needed`:
- Latency measurements on your GPU infrastructure
- Cost per page with your pricing model
- Accuracy on your representative documents

### Version Control
Track knowledge base in git alongside platform code:
```bash
git add knowledge_base/
git commit -m "Update: PaddleOCR v1.6 benchmarks"
```

## References

### Official Sources
- **GOT-OCR 2.0:** https://arxiv.org/abs/2409.01704
- **PaddleOCR-VL:** https://arxiv.org/abs/2606.03264
- **Qianfan-OCR:** https://arxiv.org/abs/2603.13398

### Platform Code
- Advisor: `ocr_platform/app/advisor/service.py`
- RAG: `ocr_platform/app/rag/retriever.py`
- Registry: `ocr_platform/app/registry/service.py`
- Fingerprinting: `ocr_platform/app/advisor/fingerprint.py`

## License & Attribution

This knowledge base synthesizes:
- **Verified facts** from open-source model papers and documentation
- **Platform-specific** configurations from codebase
- **Heuristic routing logic** designed for this platform

All model references cite original papers. Platform logic is proprietary to the Unified OCR Platform.
