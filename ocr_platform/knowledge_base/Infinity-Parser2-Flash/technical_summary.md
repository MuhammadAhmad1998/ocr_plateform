# Infinity-Parser2-Flash Technical Summary

**Confidence:** documented  
**Sources:** [HuggingFace Model Card](https://huggingface.co/infly/Infinity-Parser2-Flash), [Platform Service](ocr_platform/app/infinity_parser/service.py)

## Overview

Infinity-Parser2-Flash is infly's speed-optimized document understanding model. It unifies layout analysis, element parsing, table/chart/formula recognition, and Markdown conversion in a single 2B-parameter vision-language architecture. On the Planet OCR platform it powers the **Professional** and **Enterprise** tiers as `infinity-parser2-flash` and `infinity-parser2-flash-enterprise`.

**Key Statistics:**
- **Parameters:** 2B
- **Model ID:** `infly/Infinity-Parser2-Flash`
- **Throughput:** 3.68× faster than Infinity-Parser-7B (1,624 vs 441 tokens/sec)
- **Task modes:** `doc2md`, `doc2json`, `custom`
- **Platform max tokens:** 8,192 (configurable)

## Architecture

Infinity-Parser2 builds on a Qwen-VL-style image-text-to-text stack:
- **Processor:** `AutoProcessor` with chat template and optional `enable_thinking`
- **Vision:** `qwen-vl-utils` with configurable `min_pixels` / `max_pixels`
- **Generation:** Temperature 0.0, deterministic parsing output

### Platform Task Prompts

| Task | Purpose |
|------|---------|
| `doc2md` | Transform document contents into Markdown |
| `doc2json` | Emit JSON with bbox, category, and formatted text per layout element |
| `custom` | User-supplied prompt (less reliable for production) |

### Layout Categories (doc2json)

`header`, `title`, `text`, `figure`, `table`, `formula`, `figure_caption`, `table_caption`, `formula_caption`, `figure_footnote`, `table_footnote`, `page_footnote`, `footer`

Text formatting per category:
- **figure** → empty string
- **formula** → LaTeX
- **table** → HTML
- **other** → Markdown

## Benchmarks (Flash vs Pro where noted)

### Document Parsing

| Benchmark | Flash | Pro |
|-----------|-------|-----|
| olmOCR-bench | 86.0 | 87.6 |
| ParseBench | 72.2 | 74.3 |
| OmniDocBench-v1.6 | 91.98 | 93.95 |

### Element Parsing

| Benchmark | Flash |
|-----------|-------|
| OmniDocBench-v1.5-TextBlock | 93.53 |
| PubTabNet (val) | 92.41 |
| UniMERNet | 96.5 |

### Charts & VQA

| Benchmark | Flash |
|-----------|-------|
| Chart2Table | 80.49 |
| Chart2Json | 67.66 |
| DocVQA (val) | 93.16 |
| InfoVQA (val) | 75.94 |

## Strengths

1. **Speed:** Flash variant for low-latency document parsing at scale
2. **Layout JSON:** Native bbox + category output for downstream pipelines
3. **Markdown conversion:** One-shot doc2md for RAG and CMS workflows
4. **Tables & formulas:** 92.41% PubTabNet, 96.5% UniMERNet
5. **Multi-column layouts:** Reading-order recovery for reports and newspapers
6. **EN/ZH focus:** Strong on English and Chinese business documents

## Limitations

1. **Languages:** Primarily English and Chinese; multilingual degradation documented
2. **Handwriting:** Not a primary strength
3. **Text styling:** No bold/italic/strikethrough capture
4. **Rotation:** Weaker on multi-oriented table elements
5. **KIE:** Layout structure ≠ semantic invoice field extraction (use Qianfan)
6. **Interactive OCR:** No GOT-style coordinate-guided region mode

## When to Choose Infinity-Parser2-Flash

### Primary Use Cases ✅
- Fast PDF/image → Markdown pipelines
- Layout-aware JSON with bounding boxes
- Financial and business reports (EN/ZH)
- Multi-column documents with reading-order needs
- Academic papers needing LaTeX formulas
- High-volume document parsing on Pro tier

### Avoid For ❌
- Handwriting-heavy documents
- Global multilingual (use Qianfan or PaddleOCR)
- Interactive region OCR (use GOT-OCR 2.0)
- Dedicated KIE from invoices/receipts (use Qianfan)
- Maximum accuracy regardless of speed (Pro variant or Qianfan)

## Platform Integration

### API
```
POST /api/v1/infinity-parser/recognize/     # Single image
POST /api/v1/infinity-parser/pdf/analyze/   # PDF (per-page)
GET  /api/v1/infinity-parser/health/
```

### Configuration
```bash
INFINITY_PARSER_ENABLED=true
INFINITY_PARSER_MODEL_ID=infly/Infinity-Parser2-Flash
INFINITY_PARSER_TORCH_DTYPE=bfloat16
INFINITY_PARSER_MAX_NEW_TOKENS=8192
INFINITY_PARSER_PDF_DPI=144
INFINITY_PARSER_MAX_PDF_PAGES=50
INFINITY_PARSER_EAGER_LOAD=false
```

### Dependencies
- `transformers` with `trust_remote_code=True`
- `qwen-vl-utils` (required)

## Comparison Summary

| Aspect | Infinity-Parser2-Flash | PaddleOCR-VL | GOT-OCR 2.0 | Qianfan-OCR |
|--------|------------------------|--------------|-------------|-------------|
| Size | 2B | 0.9B | 580M | 4B |
| Doc parsing speed | **Fastest class** ⚡ | Fast | Fast | Moderate |
| Layout JSON + bbox | **Native** ⭐ | Structured modes | No (interactive only) | Layout-as-Thought |
| Markdown output | **Excellent** | Good | **Excellent** | Excellent |
| Tables | Excellent | **SOTA** ⭐ | Excellent | Excellent |
| Formulas | Excellent | Excellent | Excellent | Excellent |
| Handwriting | Moderate | Good | Moderate | **Excellent** ⭐ |
| Languages | EN/ZH primary | 109 | Multi-lingual | **192** ⭐ |
| KIE | No | No | No | **SOTA** ⭐ |
| Interactive OCR | No | No | **Unique** ⭐ | No |

## Recommended Tiers

- **Professional:** Primary engine for document parsing, layout, tables (`infinity-parser2-flash`)
- **Enterprise:** Extended parsing at scale with chart/chemical/VQA tags (`infinity-parser2-flash-enterprise`)
- **Essential/Basic:** Not available — requires Pro or Enterprise

## References

1. HuggingFace: https://huggingface.co/infly/Infinity-Parser2-Flash
2. Dataset: Infinity-Doc2-5M
3. Platform adapter: `ocr_platform/app/ocr_engine/adapters/base.py` (InfinityParserAdapter)
