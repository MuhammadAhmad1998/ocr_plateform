import logging
import time

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import AppException, NotFoundError
from app.core.inference_helpers import ensure_model_service_ready, map_inference_error, validate_pdf_images
from app.core.uploads import check_payload_size, is_pdf, validate_media_upload
from app.got_ocr.service import got_ocr_service
from app.ocr_engine.adapters.base import run_ocr
from app.paddle_ocr.service import paddle_ocr_service
from app.qianfan_ocr.service import DEFAULT_PROMPT as QIANFAN_DEFAULT_PROMPT
from app.qianfan_ocr.service import qianfan_ocr_service
from app.registry.models import Engine
from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images
from app.vlm.service import vlm_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/testing", tags=["testing"])
settings = get_settings()

DEFAULT_VLM_QUESTION = (
    "Extract all text from this document. Return only the extracted text, preserving layout where possible."
)


def build_models_list(db: Session) -> dict:
    engines = (
        db.query(Engine)
        .filter(Engine.is_active.is_(True))
        .order_by(Engine.display_name)
        .all()
    )

    models = [
        {
            "slug": engine.slug,
            "display_name": engine.display_name,
            "type": "ocr",
            "adapter_type": engine.adapter_type,
            "capability_tags": engine.capability_tags or [],
        }
        for engine in engines
    ]

    if settings.VLM_ENABLED:
        models.insert(
            0,
            {
                "slug": "vlm",
                "display_name": f"VLM ({settings.VLM_MODEL_ID})",
                "type": "vlm",
                "adapter_type": "vlm",
                "capability_tags": ["vision", "pdf", "images", "qa"],
            },
        )

    if settings.PADDLE_OCR_ENABLED:
        insert_at = 1 if settings.VLM_ENABLED else 0
        models.insert(
            insert_at,
            {
                "slug": "paddle-ocr-vl",
                "display_name": f"PaddleOCR-VL ({settings.PADDLE_OCR_MODEL_ID})",
                "type": "paddle_ocr",
                "adapter_type": "paddle_ocr",
                "capability_tags": ["vision", "pdf", "images", "ocr", "table", "chart", "formula", "spotting", "seal"],
            },
        )

    if settings.QIANFAN_OCR_ENABLED:
        insert_at = sum(
            1 for flag in (settings.VLM_ENABLED, settings.PADDLE_OCR_ENABLED) if flag
        )
        models.insert(
            insert_at,
            {
                "slug": "qianfan-ocr",
                "display_name": f"Qianfan-OCR ({settings.QIANFAN_OCR_MODEL_ID})",
                "type": "qianfan_ocr",
                "adapter_type": "qianfan_ocr",
                "capability_tags": ["vision", "pdf", "images", "ocr", "markdown"],
            },
        )

    if settings.GOT_OCR_ENABLED:
        insert_at = sum(
            1
            for flag in (
                settings.VLM_ENABLED,
                settings.PADDLE_OCR_ENABLED,
                settings.QIANFAN_OCR_ENABLED,
            )
            if flag
        )
        models.insert(
            insert_at,
            {
                "slug": "got-ocr2",
                "display_name": f"GOT-OCR 2.0 ({settings.GOT_OCR_MODEL_ID})",
                "type": "got_ocr",
                "adapter_type": "got-ocr2",
                "capability_tags": [
                    "vision",
                    "pdf",
                    "images",
                    "ocr",
                    "format",
                    "plain_text",
                ],
            },
        )

    return {"models": models}


@router.get("/models/")
def list_testing_models(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return build_models_list(db)


@router.post("/run/")
async def run_testing_ocr(
    file: UploadFile = File(...),
    model_slug: str = Form(..., min_length=1),
    question: str = Form(DEFAULT_VLM_QUESTION),
    prompt: str = Form(""),
    enable_thinking: bool = Form(False),
    task: str = Form("ocr"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content_type = file.content_type or "application/octet-stream"
    filename = validate_media_upload(file.filename, content_type)

    content = await file.read()
    check_payload_size(content)

    if model_slug == "vlm":
        return await _run_vlm(content, content_type, filename, question, enable_thinking)

    if model_slug == "paddle-ocr-vl":
        return await _run_paddle_ocr(content, content_type, filename, task)

    if model_slug == "qianfan-ocr":
        return await _run_qianfan_ocr(
            content,
            content_type,
            filename,
            prompt or QIANFAN_DEFAULT_PROMPT,
        )

    if model_slug == "got-ocr2":
        return await _run_got_ocr(
            content,
            content_type,
            filename,
            prompt or "ocr",
        )

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


async def _run_vlm(
    content: bytes,
    content_type: str,
    filename: str,
    question: str,
    enable_thinking: bool,
) -> dict:
    ensure_model_service_ready(
        enabled=settings.VLM_ENABLED,
        service_name="VLM",
        load_fn=vlm_service.load,
    )

    total_start = time.perf_counter()

    try:
        if is_pdf(content_type, filename):
            images = pdf_bytes_to_images(content, dpi=settings.VLM_PDF_DPI)
            validate_pdf_images(images, max_pages=settings.VLM_MAX_PDF_PAGES)

            page_results = await vlm_service.analyze_pdf_pages(
                images=images,
                question=question,
                enable_thinking=enable_thinking,
            )

            pages = [
                {
                    "page_number": page_number,
                    "text": answer,
                    "processing_time_ms": round(elapsed_ms, 2),
                }
                for page_number, answer, elapsed_ms in sorted(page_results, key=lambda item: item[0])
            ]
            combined_text = "\n\n".join(
                f"--- Page {page['page_number']} ---\n{page['text']}" for page in pages
            )
            total_elapsed_ms = (time.perf_counter() - total_start) * 1000

            return {
                "model_slug": "vlm",
                "model_name": f"VLM ({settings.VLM_MODEL_ID})",
                "model_type": "vlm",
                "status": "completed",
                "filename": filename,
                "result": {
                    "text": combined_text,
                    "timing_ms": round(total_elapsed_ms, 2),
                    "pages": pages,
                    "question": question,
                },
            }

        image = image_bytes_to_pil(content)
        answer, elapsed_ms = await vlm_service.chat_with_image(
            image=image,
            question=question,
            enable_thinking=enable_thinking,
        )

        return {
            "model_slug": "vlm",
            "model_name": f"VLM ({settings.VLM_MODEL_ID})",
            "model_type": "vlm",
            "status": "completed",
            "filename": filename,
            "result": {
                "text": answer,
                "timing_ms": round(elapsed_ms, 2),
                "question": question,
            },
        }
    except AppException:
        raise
    except Exception as exc:
        logger.exception("VLM inference failed")
        raise map_inference_error(exc, operation="VLM inference") from exc


async def _run_paddle_ocr(
    content: bytes,
    content_type: str,
    filename: str,
    task: str,
) -> dict:
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

            page_results = await paddle_ocr_service.analyze_pdf_pages(
                images=images,
                task=task,
            )

            pages = [
                {
                    "page_number": page_number,
                    "text": result,
                    "processing_time_ms": round(elapsed_ms, 2),
                }
                for page_number, result, elapsed_ms in sorted(page_results, key=lambda item: item[0])
            ]
            combined_text = "\n\n".join(
                f"--- Page {page['page_number']} ---\n{page['text']}" for page in pages
            )
            total_elapsed_ms = (time.perf_counter() - total_start) * 1000

            return {
                "model_slug": "paddle-ocr-vl",
                "model_name": f"PaddleOCR-VL ({settings.PADDLE_OCR_MODEL_ID})",
                "model_type": "paddle_ocr",
                "status": "completed",
                "filename": filename,
                "result": {
                    "text": combined_text,
                    "timing_ms": round(total_elapsed_ms, 2),
                    "pages": pages,
                    "task": task,
                },
            }

        image = image_bytes_to_pil(content)
        result, elapsed_ms = await paddle_ocr_service.recognize(
            image=image,
            task=task,
        )

        return {
            "model_slug": "paddle-ocr-vl",
            "model_name": f"PaddleOCR-VL ({settings.PADDLE_OCR_MODEL_ID})",
            "model_type": "paddle_ocr",
            "status": "completed",
            "filename": filename,
            "result": {
                "text": result,
                "timing_ms": round(elapsed_ms, 2),
                "task": task,
            },
        }
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="PaddleOCR-VL inference") from exc


async def _run_qianfan_ocr(
    content: bytes,
    content_type: str,
    filename: str,
    prompt: str,
) -> dict:
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

            page_results = await qianfan_ocr_service.analyze_pdf_pages(
                images=images,
                prompt=prompt,
            )

            pages = [
                {
                    "page_number": page_number,
                    "text": result,
                    "processing_time_ms": round(elapsed_ms, 2),
                }
                for page_number, result, elapsed_ms in sorted(page_results, key=lambda item: item[0])
            ]
            combined_text = "\n\n".join(
                f"--- Page {page['page_number']} ---\n{page['text']}" for page in pages
            )
            total_elapsed_ms = (time.perf_counter() - total_start) * 1000

            return {
                "model_slug": "qianfan-ocr",
                "model_name": f"Qianfan-OCR ({settings.QIANFAN_OCR_MODEL_ID})",
                "model_type": "qianfan_ocr",
                "status": "completed",
                "filename": filename,
                "result": {
                    "text": combined_text,
                    "timing_ms": round(total_elapsed_ms, 2),
                    "pages": pages,
                    "prompt": prompt,
                },
            }

        image = image_bytes_to_pil(content)
        result, elapsed_ms = await qianfan_ocr_service.recognize(
            image=image,
            prompt=prompt,
        )

        return {
            "model_slug": "qianfan-ocr",
            "model_name": f"Qianfan-OCR ({settings.QIANFAN_OCR_MODEL_ID})",
            "model_type": "qianfan_ocr",
            "status": "completed",
            "filename": filename,
            "result": {
                "text": result,
                "timing_ms": round(elapsed_ms, 2),
                "prompt": prompt,
            },
        }
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="Qianfan-OCR inference") from exc


async def _run_got_ocr(
    content: bytes,
    content_type: str,
    filename: str,
    ocr_type: str,
) -> dict:
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

            page_results = await got_ocr_service.analyze_pdf_pages(
                images=images,
                ocr_type=ocr_type,
            )

            pages = [
                {
                    "page_number": page_number,
                    "text": result,
                    "processing_time_ms": round(elapsed_ms, 2),
                }
                for page_number, result, elapsed_ms in sorted(page_results, key=lambda item: item[0])
            ]
            combined_text = "\n\n".join(
                f"--- Page {page['page_number']} ---\n{page['text']}" for page in pages
            )
            total_elapsed_ms = (time.perf_counter() - total_start) * 1000

            return {
                "model_slug": "got-ocr2",
                "model_name": f"GOT-OCR 2.0 ({settings.GOT_OCR_MODEL_ID})",
                "model_type": "got_ocr",
                "status": "completed",
                "filename": filename,
                "result": {
                    "text": combined_text,
                    "timing_ms": round(total_elapsed_ms, 2),
                    "pages": pages,
                    "ocr_type": ocr_type,
                },
            }

        image = image_bytes_to_pil(content)
        result, elapsed_ms = await got_ocr_service.recognize(
            image=image,
            ocr_type=ocr_type,
        )

        return {
            "model_slug": "got-ocr2",
            "model_name": f"GOT-OCR 2.0 ({settings.GOT_OCR_MODEL_ID})",
            "model_type": "got_ocr",
            "status": "completed",
            "filename": filename,
            "result": {
                "text": result,
                "timing_ms": round(elapsed_ms, 2),
                "ocr_type": ocr_type,
            },
        }
    except AppException:
        raise
    except Exception as exc:
        logger.exception("GOT-OCR inference failed")
        raise map_inference_error(exc, operation="GOT-OCR inference") from exc
