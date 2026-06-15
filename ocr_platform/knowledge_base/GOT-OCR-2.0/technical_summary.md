# GOT-OCR 2.0 Technical Summary

**Confidence:** documented  
**Sources:** [ArXiv Paper](https://arxiv.org/abs/2409.01704), [HuggingFace Model Card](https://huggingface.co/ucaslcl/GOT-OCR2_0)

## Overview

GOT-OCR 2.0 (General OCR Theory) represents a paradigm shift from traditional OCR-1.0 systems to OCR-2.0. It's a unified, end-to-end vision-language model that treats all artificial optical signals—plain text, formulas, tables, charts, sheet music, geometric shapes—as "characters" and processes them through a single elegant architecture.

**Key Statistics:**
- **Parameters:** 580M (smallest among compared engines)
- **Architecture:** High-compression encoder + long-context decoder
- **Release:** September 2024 by UCAS & Stepfun AI
- **Input Resolution:** 1024×1024 standard, up to 2K+ with dynamic resolution
- **Output Context:** 8K max tokens

## Architecture Deep Dive

### Encoder (~80M parameters)
- **Input:** 1024×1024 images
- **Output:** 256×1024 dimension tokens
- **Compression Rate:** High compression to reduce token count
- **Training:** Decoupled pre-training before joint training

### Decoder (~500M parameters)
- **Context Length:** 8K tokens (sufficient for long documents)
- **Architecture:** Transformer-based language decoder
- **Training:** Joint training with encoder, then post-training for specialized capabilities

### Training Strategy (3 Stages)
1. **Decoupled Pre-training:** Encoder trained separately on visual understanding
2. **Joint Training:** Encoder and decoder trained together on OCR tasks
3. **Post-Training:** Decoder fine-tuned for specialized capabilities (interactive OCR, dynamic resolution, multi-page)

## Core Capabilities

### 1. Plain Document OCR
- **Performance:** F1=0.972 (English), F1=0.980 (Chinese) on Fox benchmark
- **Use Cases:** PDF text extraction, document digitization
- **Strength:** Excellent baseline OCR performance

### 2. Scene Text OCR
- **Performance:** Excellent across various scene text benchmarks
- **Use Cases:** Street signs, product labels, natural images
- **Strength:** Handles diverse fonts, angles, and lighting

### 3. Formatted Document OCR
- **Unique Strength:** Native Markdown, LaTeX, TikZ, SMILES, Kern output
- **Use Cases:** Academic papers, technical documentation, structured content
- **Strength:** Preserves document structure and formatting

### 4. Mathematical Formulas
- **Output:** LaTeX format
- **Performance:** Excellent on formula recognition benchmarks
- **Use Cases:** Scientific papers, textbooks, technical documents

### 5. Tables
- **Performance:** Excellent (though PaddleOCR-VL has slight edge)
- **Output:** Markdown or structured format
- **Strength:** Integrated into unified architecture

### 6. Charts and Plots
- **Performance:** AP@strict=0.747 on ChartQA, 0.133 on PlotQA
- **Strength:** Outperforms some chart-specific models
- **Use Cases:** Scientific visualizations, business reports

### 7. Interactive OCR (Unique Feature)
- **Coordinate-based:** Specify bounding box [x1,y1,x2,y2] for region extraction
- **Color-based:** Mark region with colored box
- **Performance:** F1=0.970 on fine-grained OCR (better than Fox)
- **Use Cases:** Targeted extraction, form field recognition, specific region processing

### 8. Multi-Page OCR
- **Feature:** Process multiple pages as a batch, not a loop
- **Benefit:** Maintains context and formatting across page breaks
- **Use Cases:** Books, long documents, academic papers

### 9. Dynamic Resolution
- **Feature:** Automatically crops ultra-high-res images (>2K) into patches
- **Process:** Encode all patches, decode together, merge results
- **Use Cases:** Two-page spreads, high-DPI scans, unusual aspect ratios

## Benchmarks (from ArXiv paper)

### Plain PDF OCR (Fox Benchmark)
| Metric | English | Chinese |
|--------|---------|---------|
| Edit Distance ↓ | 0.035 | 0.038 |
| F1-score ↑ | 0.972 | 0.980 |
| Precision ↑ | 0.971 | 0.982 |
| Recall ↑ | 0.973 | 0.978 |

### Fine-Grained OCR (Coordinate/Color-based)
| Task | GOT F1 | Fox F1 |
|------|--------|--------|
| Coordinate-based | 0.970 | 0.957 |
| Color-based | 0.965 | 0.955 |

### Chart OCR
| Benchmark | GOT AP@strict |
|-----------|---------------|
| ChartQA | 0.747 |
| PlotQA | 0.133 |

## Strengths

1. **Unified Architecture:** One model handles all OCR tasks
2. **Smallest Model:** 580M parameters = fastest inference
3. **Formatted Output:** Excellent Markdown, LaTeX, TikZ generation
4. **Interactive OCR:** Unique coordinate/color-based region extraction
5. **Multi-Page Processing:** Smart batching with context preservation
6. **Dynamic Resolution:** Handles ultra-high-res intelligently
7. **Versatile:** Text, formulas, tables, charts, diagrams, sheet music, molecules
8. **Fast Inference:** Smaller size enables high throughput

## Limitations

1. **Handwriting:** Moderate performance; not specialized for handwriting
2. **Language Coverage:** Multi-lingual but not quantified (unlike Qianfan's 192 or Paddle's 109)
3. **Explicit Layout:** End-to-end model doesn't provide bounding boxes by default
4. **KIE Tasks:** Not specialized for key information extraction (use Qianfan)
5. **SOTA Tables:** Good but PaddleOCR-VL has slight edge on table benchmarks

## When to Choose GOT-OCR 2.0

### Primary Use Cases ✅
- Documents requiring formatted output (Markdown, LaTeX)
- Interactive workflows with region-specific extraction
- Multi-page documents with cross-page formatting
- Chart and diagram extraction
- High-volume processing (speed matters)
- Mixed content (text + formulas + tables + charts)
- High-resolution scans needing dynamic cropping

### Avoid For ❌
- Primary handwriting content (use Qianfan or TrOCR-handwritten)
- SOTA table extraction (use PaddleOCR-VL)
- Key information extraction from forms (use Qianfan)
- Maximum language coverage (use Qianfan with 192 languages)
- Simple text-only (use TrOCR-Base for efficiency)

## Integration Notes

### Model Loading
```python
from transformers import AutoModel, AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained('ucaslcl/GOT-OCR2_0', trust_remote_code=True)
model = AutoModel.from_pretrained('ucaslcl/GOT-OCR2_0', trust_remote_code=True, device_map='cuda')
```

### OCR Modes
- **ocr:** Plain text extraction
- **format:** Markdown with structure
- **ocr_box:** Interactive with coordinates
- **ocr_color:** Interactive with color marking

### Platform Configuration
```bash
GOT_OCR_ENABLED=true
GOT_OCR_MODEL_ID=ucaslcl/GOT-OCR2_0
GOT_OCR_DEVICE=cuda
GOT_OCR_PDF_DPI=144
GOT_OCR_MAX_PDF_PAGES=50
GOT_OCR_EAGER_LOAD=false  # Set true for production
```

## Comparison Summary

| Aspect | GOT-OCR 2.0 | PaddleOCR-VL | Qianfan-OCR |
|--------|-------------|--------------|-------------|
| Size | 580M ✨ | 0.9B | 4B |
| Speed | Fastest ⚡ | Fast | Moderate |
| Tables | Excellent | SOTA ⭐ | Excellent |
| Formulas | Excellent | Excellent | Excellent |
| Formatted Output | SOTA ⭐ | Good | Excellent |
| Interactive OCR | Unique ⭐ | No | No |
| Handwriting | Moderate | Good | Excellent ⭐ |
| Languages | Multi-lingual | 109 | 192 ⭐ |
| Layout Analysis | Implicit | Explicit (2-stage) | Layout-as-Thought |
| KIE Tasks | No | No | SOTA ⭐ |

**Legend:** ✨ Best-in-class | ⭐ Top performer | ⚡ Performance advantage

## Recommended Tiers

- **Enterprise:** Primary recommendation (complex documents, formatted output)
- **Professional:** Secondary (scientific papers, charts, formulas)
- **Essential:** Not recommended (overkill for basic use cases)

## References

1. Wei, H., et al. (2024). "General OCR Theory: Towards OCR-2.0 via a Unified End-to-end Model." ArXiv:2409.01704
2. HuggingFace Model Card: https://huggingface.co/ucaslcl/GOT-OCR2_0
3. Stepfun AI: https://huggingface.co/stepfun-ai/GOT-OCR-2.0-hf
4. Transformers Documentation: https://huggingface.co/docs/transformers/en/model_doc/got_ocr2
