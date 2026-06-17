#!/usr/bin/env bash
# Standalone backend for AI Platform — NOT the Next.js frontend (port 3000).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# OCR ML code lives in sibling ocr_platform/ (engine library only — no UI).
export PYTHONPATH="${ROOT}/../ocr_platform:${PYTHONPATH:-}"
export DATABASE_URL="${DATABASE_URL:-postgresql://ocr:ocr@localhost:5432/ai_service_ocr}"
export LOCAL_STORAGE_PATH="${LOCAL_STORAGE_PATH:-${ROOT}/storage}"

PORT="${PORT:-8004}"
exec uvicorn platform_api.main:app --host 0.0.0.0 --port "$PORT" "$@"
