#!/usr/bin/env python3
"""Index the OCR knowledge base into PostgreSQL pgvector.

The backend now auto-indexes on first startup when USE_MOCK_RAG=false.
This script is still useful for forcing a rebuild after KB file edits.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.rag.indexer import run_full_reindex

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


def main() -> int:
    result = run_full_reindex()
    print(
        f"Knowledge base indexed: {result['chunks_indexed']} chunks "
        f"(loaded {result['chunks_loaded']})"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
