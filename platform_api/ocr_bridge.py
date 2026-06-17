"""OCR engine bridge — loads ML code from sibling ocr_platform at runtime only.

Standalone API service for the AI Platform marketplace. NOT connected to the
Next.js frontend. Reuses ../ocr_platform OCR/ML engine code as a library.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

_OCR_ENGINE_ROOT = Path(__file__).resolve().parents[2] / "ocr_platform"


def ensure_ocr_engine_path() -> Path:
    if not _OCR_ENGINE_ROOT.is_dir():
        raise RuntimeError(
            f"OCR engine not found at {_OCR_ENGINE_ROOT}. "
            "ai_service_platform expects the ocr_platform folder alongside it in the repo."
        )
    root = str(_OCR_ENGINE_ROOT)
    if root not in sys.path:
        sys.path.insert(0, root)
    return _OCR_ENGINE_ROOT


def _import_module(dotted: str):
    ensure_ocr_engine_path()
    return __import__(dotted, fromlist=["_"])


class _LazyStorage:
    def __getattr__(self, name: str) -> Any:
        return getattr(_import_module("app.core.storage").storage, name)


storage = _LazyStorage()


def fingerprint_document(content: bytes, content_type: str, filename: str) -> dict:
    mod = _import_module("app.advisor.fingerprint")
    return mod.fingerprint_document(content, content_type, filename)


def check_payload_size(content: bytes) -> None:
    _import_module("app.core.uploads").check_payload_size(content)


def validate_advisor_upload(filename: str | None, content_type: str) -> None:
    _import_module("app.core.uploads").validate_advisor_upload(filename, content_type)


def run_ocr(content: bytes, content_type: str, adapter_type: str, filename: str) -> dict:
    mod = _import_module("app.ocr_engine.adapters.base")
    return mod.run_ocr(content, content_type, adapter_type, filename)


def result_to_json(result: dict) -> bytes:
    mod = _import_module("app.ocr_engine.adapters.base")
    return mod.result_to_json(result)


def get_ocr_engine_settings():
    return _import_module("app.core.config").get_settings()


def get_ml_routers() -> list[Any]:
    ensure_ocr_engine_path()
    from app.api.v1 import got_ocr, paddle_ocr, qianfan_ocr, vlm

    return [vlm.router, paddle_ocr.router, got_ocr.router, qianfan_ocr.router]


def preload_ml_models() -> None:
    import logging

    settings = get_ocr_engine_settings()
    log = logging.getLogger(__name__)
    ensure_ocr_engine_path()

    if settings.VLM_ENABLED and settings.VLM_EAGER_LOAD:
        from app.vlm.service import vlm_service

        try:
            vlm_service.load()
            log.info("VLM model preloaded")
        except RuntimeError as exc:
            log.warning("VLM preload skipped: %s", exc)

    if settings.PADDLE_OCR_ENABLED and settings.PADDLE_OCR_EAGER_LOAD:
        from app.paddle_ocr.service import paddle_ocr_service

        try:
            paddle_ocr_service.load()
            log.info("PaddleOCR-VL preloaded")
        except RuntimeError as exc:
            log.warning("PaddleOCR preload skipped: %s", exc)

    if settings.QIANFAN_OCR_ENABLED and settings.QIANFAN_OCR_EAGER_LOAD:
        from app.qianfan_ocr.service import qianfan_ocr_service

        try:
            qianfan_ocr_service.load()
            log.info("Qianfan-OCR preloaded")
        except RuntimeError as exc:
            log.warning("Qianfan-OCR preload skipped: %s", exc)

    if settings.GOT_OCR_ENABLED and settings.GOT_OCR_EAGER_LOAD:
        from app.got_ocr.service import got_ocr_service

        try:
            got_ocr_service.load()
            log.info("GOT-OCR preloaded")
        except RuntimeError as exc:
            log.warning("GOT-OCR preload skipped: %s", exc)


ensure_ocr_platform_path = ensure_ocr_engine_path
get_ocr_platform_settings = get_ocr_engine_settings
