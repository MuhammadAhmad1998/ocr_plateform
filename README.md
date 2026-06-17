# AI Service Platform — standalone OCR API backend

**This is NOT the Next.js frontend backend.**  
Open OCR API for development and integration testing (port **8004**).

| Service | Port | Purpose |
|---------|------|---------|
| `frontend/` + `ocr_platform/` | 8000 / 8003 | Your app (login, advisor, dashboard) |
| **`ai_service_platform/`** | **8004** | Open OCR API — **no authentication** |

## Quick start

```bash
cd ai_service_platform
python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt -r requirements-ocr-engine.txt

# IMPORTANT: use pymupdf for PDFs — never `pip install fitz` (wrong package)
pip uninstall -y fitz 2>/dev/null || true
pip install pymupdf

cp .env.example .env

bash run.sh
```

API docs: http://localhost:8004/docs

## Architecture

- **Own database** (`ai_service_ocr`) — separate from `ocr_platform`
- **No login, no API keys, no Stripe, no advisor UI**
- **OCR/ML engine** loaded from `../ocr_platform` at runtime (library only)
- **No connection** to the `frontend/` Next.js app

## Endpoints

All endpoints are open — no `Authorization` header required:

- Documents & OCR jobs (v1 + v2)
- Models & testing sandbox
- VLM, PaddleOCR, GOT-OCR, Qianfan-OCR
- Health (`/health`, `/health/ready`)

## Troubleshooting

**`ModuleNotFoundError: No module named 'frontend'`** when importing `fitz`  
→ Wrong PyPI package installed. Run:
```bash
pip uninstall -y fitz
pip install pymupdf
```
