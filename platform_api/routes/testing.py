"""Sandbox OCR runs — same behavior as ocr_platform /api/v1/testing/."""

import logging
import time

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from platform_api.database import get_db
from platform_api.exceptions import NotFoundError
from platform_api.models import Engine
from platform_api.ocr_bridge import get_ocr_platform_settings, run_ocr
from platform_api.seed import build_models_list

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/testing", tags=["testing"])
settings = get_ocr_platform_settings()

DEFAULT_VLM_QUESTION = (
    "Extract all text from this document. Return only the extracted text, preserving layout where possible."
)


@router.get("/models/")
def list_testing_models(db: Session = Depends(get_db)):
    return build_models_list(db)


@router.post("/run/")
async def run_testing_ocr(
    file: UploadFile = File(...),
    model_slug: str = Form(..., min_length=1),
    question: str = Form(DEFAULT_VLM_QUESTION),
    prompt: str = Form(""),
    enable_thinking: bool = Form(False),
    task: str = Form("ocr"),
    db: Session = Depends(get_db),
):
    from app.core.exceptions import AppException
    from app.core.inference_helpers import ensure_model_service_ready, map_inference_error
    from app.core.uploads import check_payload_size, is_pdf, validate_media_upload
    from app.got_ocr.service import got_ocr_service
    from app.paddle_ocr.service import paddle_ocr_service
    from app.qianfan_ocr.service import DEFAULT_PROMPT as QIANFAN_DEFAULT_PROMPT
    from app.qianfan_ocr.service import qianfan_ocr_service
    from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images
    from app.vlm.service import vlm_service

    content_type = file.content_type or "application/octet-stream"
    filename = validate_media_upload(file.filename, content_type)
    content = await file.read()
    check_payload_size(content)

    if model_slug == "vlm":
        return await _run_vlm(content, content_type, filename, question, enable_thinking)
    if model_slug == "paddle-ocr-vl":
        return await _run_paddle_ocr(content, content_type, filename, task)
    if model_slug == "qianfan-ocr":
        return await _run_qianfan_ocr(content, content_type, filename, prompt or QIANFAN_DEFAULT_PROMPT)
    if model_slug == "got-ocr2":
        return await _run_got_ocr(content, content_type, filename, prompt or "ocr")

    engine = (
        db.query(Engine)
        .filter(Engine.slug == model_slug, Engine.is_active.is_(True))
        .first()
    )
    if not engine:
        raise NotFoundError(f"Model '{model_slug}' not found")

    start = time.perf_counter()
    try:
        result = run_ocr(content, content_type, engine.adapter_type, file.filename or filename)
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="OCR processing") from exc

    elapsed_ms = int((time.perf_counter() - start) * 1000)
    return {
        "model_slug": engine.slug,
        "model_name": engine.display_name,
        "model_type": "ocr",
        "status": "completed",
        "filename": file.filename,
        "result": {
            "text": result.get("text", ""),
            "confidence": result.get("confidence"),
            "timing_ms": result.get("timing_ms", elapsed_ms),
            "layout": result.get("layout"),
        },
    }


async def _run_vlm(content, content_type, filename, question, enable_thinking):
    from app.core.exceptions import AppException
    from app.core.inference_helpers import ensure_model_service_ready, map_inference_error, validate_pdf_images
    from app.core.uploads import is_pdf
    from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images
    from app.vlm.service import vlm_service

    ensure_model_service_ready(enabled=settings.VLM_ENABLED, service_name="VLM", load_fn=vlm_service.load)
    total_start = time.perf_counter()
    try:
        if is_pdf(content_type, filename):
            images = pdf_bytes_to_images(content, dpi=settings.VLM_PDF_DPI)
            validate_pdf_images(images, max_pages=settings.VLM_MAX_PDF_PAGES)
            page_results = await vlm_service.analyze_pdf_pages(
                images=images, question=question, enable_thinking=enable_thinking
            )
            pages = [
                {"page_number": p, "text": a, "processing_time_ms": round(ms, 2)}
                for p, a, ms in sorted(page_results, key=lambda x: x[0])
            ]
            combined = "\n\n".join(f"--- Page {p['page_number']} ---\n{p['text']}" for p in pages)
            return {
                "model_slug": "vlm",
                "model_name": f"VLM ({settings.VLM_MODEL_ID})",
                "model_type": "vlm",
                "status": "completed",
                "filename": filename,
                "result": {
                    "text": combined,
                    "timing_ms": round((time.perf_counter() - total_start) * 1000, 2),
                    "pages": pages,
                    "question": question,
                },
            }
        image = image_bytes_to_pil(content)
        answer, elapsed_ms = await vlm_service.chat_with_image(
            image=image, question=question, enable_thinking=enable_thinking
        )
        return {
            "model_slug": "vlm",
            "model_name": f"VLM ({settings.VLM_MODEL_ID})",
            "model_type": "vlm",
            "status": "completed",
            "filename": filename,
            "result": {"text": answer, "timing_ms": round(elapsed_ms, 2), "question": question},
        }
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="VLM inference") from exc


async def _run_paddle_ocr(content, content_type, filename, task):
    from app.core.exceptions import AppException
    from app.core.inference_helpers import ensure_model_service_ready, map_inference_error, validate_pdf_images
    from app.core.uploads import is_pdf
    from app.paddle_ocr.service import paddle_ocr_service
    from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images

    ensure_model_service_ready(
        enabled=settings.PADDLE_OCR_ENABLED,
        service_name="PaddleOCR-VL",
        load_fn=paddle_ocr_service.load,
    )
    total_start = time.perf_counter()
    try:
        if is_pdf(content_type, filename):
            images = pdf_bytes_to_images(content, dpi=settings.PADDLE_OCR_PDF_DPI)
            validate_pdf_images(images, max_pages=settings.PADDLE_OCR_MAX_PDF_PAGES)
            page_results = await paddle_ocr_service.analyze_pdf_pages(images=images, task=task)
            pages = [
                {"page_number": p, "text": r, "processing_time_ms": round(ms, 2)}
                for p, r, ms in sorted(page_results, key=lambda x: x[0])
            ]
            combined = "\n\n".join(f"--- Page {p['page_number']} ---\n{p['text']}" for p in pages)
            return {
                "model_slug": "paddle-ocr-vl",
                "model_name": f"PaddleOCR-VL ({settings.PADDLE_OCR_MODEL_ID})",
                "model_type": "paddle_ocr",
                "status": "completed",
                "filename": filename,
                "result": {
                    "text": combined,
                    "timing_ms": round((time.perf_counter() - total_start) * 1000, 2),
                    "pages": pages,
                    "task": task,
                },
            }
        image = image_bytes_to_pil(content)
        result, elapsed_ms = await paddle_ocr_service.recognize(image=image, task=task)
        return {
            "model_slug": "paddle-ocr-vl",
            "model_name": f"PaddleOCR-VL ({settings.PADDLE_OCR_MODEL_ID})",
            "model_type": "paddle_ocr",
            "status": "completed",
            "filename": filename,
            "result": {"text": result, "timing_ms": round(elapsed_ms, 2), "task": task},
        }
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="PaddleOCR-VL inference") from exc


async def _run_qianfan_ocr(content, content_type, filename, prompt):
    from app.core.exceptions import AppException
    from app.core.inference_helpers import ensure_model_service_ready, map_inference_error, validate_pdf_images
    from app.core.uploads import is_pdf
    from app.qianfan_ocr.service import qianfan_ocr_service
    from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images

    ensure_model_service_ready(
        enabled=settings.QIANFAN_OCR_ENABLED,
        service_name="Qianfan-OCR",
        load_fn=qianfan_ocr_service.load,
    )
    total_start = time.perf_counter()
    try:
        if is_pdf(content_type, filename):
            images = pdf_bytes_to_images(content, dpi=settings.QIANFAN_OCR_PDF_DPI)
            validate_pdf_images(images, max_pages=settings.QIANFAN_OCR_MAX_PDF_PAGES)
            page_results = await qianfan_ocr_service.analyze_pdf_pages(images=images, prompt=prompt)
            pages = [
                {"page_number": p, "text": r, "processing_time_ms": round(ms, 2)}
                for p, r, ms in sorted(page_results, key=lambda x: x[0])
            ]
            combined = "\n\n".join(f"--- Page {p['page_number']} ---\n{p['text']}" for p in pages)
            return {
                "model_slug": "qianfan-ocr",
                "model_name": f"Qianfan-OCR ({settings.QIANFAN_OCR_MODEL_ID})",
                "model_type": "qianfan_ocr",
                "status": "completed",
                "filename": filename,
                "result": {
                    "text": combined,
                    "timing_ms": round((time.perf_counter() - total_start) * 1000, 2),
                    "pages": pages,
                    "prompt": prompt,
                },
            }
        image = image_bytes_to_pil(content)
        result, elapsed_ms = await qianfan_ocr_service.recognize(image=image, prompt=prompt)
        return {
            "model_slug": "qianfan-ocr",
            "model_name": f"Qianfan-OCR ({settings.QIANFAN_OCR_MODEL_ID})",
            "model_type": "qianfan_ocr",
            "status": "completed",
            "filename": filename,
            "result": {"text": result, "timing_ms": round(elapsed_ms, 2), "prompt": prompt},
        }
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="Qianfan-OCR inference") from exc


async def _run_got_ocr(content, content_type, filename, ocr_type):
    from app.core.exceptions import AppException
    from app.core.inference_helpers import ensure_model_service_ready, map_inference_error, validate_pdf_images
    from app.core.uploads import is_pdf
    from app.got_ocr.service import got_ocr_service
    from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images

    ensure_model_service_ready(
        enabled=settings.GOT_OCR_ENABLED,
        service_name="GOT-OCR",
        load_fn=got_ocr_service.load,
    )
    total_start = time.perf_counter()
    try:
        if is_pdf(content_type, filename):
            images = pdf_bytes_to_images(content, dpi=settings.GOT_OCR_PDF_DPI)
            validate_pdf_images(images, max_pages=settings.GOT_OCR_MAX_PDF_PAGES)
            page_results = await got_ocr_service.analyze_pdf_pages(images=images, ocr_type=ocr_type)
            pages = [
                {"page_number": p, "text": r, "processing_time_ms": round(ms, 2)}
                for p, r, ms in sorted(page_results, key=lambda x: x[0])
            ]
            combined = "\n\n".join(f"--- Page {p['page_number']} ---\n{p['text']}" for p in pages)
            return {
                "model_slug": "got-ocr2",
                "model_name": f"GOT-OCR 2.0 ({settings.GOT_OCR_MODEL_ID})",
                "model_type": "got_ocr",
                "status": "completed",
                "filename": filename,
                "result": {
                    "text": combined,
                    "timing_ms": round((time.perf_counter() - total_start) * 1000, 2),
                    "pages": pages,
                    "ocr_type": ocr_type,
                },
            }
        image = image_bytes_to_pil(content)
        result, elapsed_ms = await got_ocr_service.recognize(image=image, ocr_type=ocr_type)
        return {
            "model_slug": "got-ocr2",
            "model_name": f"GOT-OCR 2.0 ({settings.GOT_OCR_MODEL_ID})",
            "model_type": "got_ocr",
            "status": "completed",
            "filename": filename,
            "result": {"text": result, "timing_ms": round(elapsed_ms, 2), "ocr_type": ocr_type},
        }
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="GOT-OCR inference") from exc
