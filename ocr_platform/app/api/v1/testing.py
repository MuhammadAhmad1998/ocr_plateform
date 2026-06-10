import logging
import time

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.ocr_engine.adapters.base import run_ocr
from app.registry.models import Engine
from app.nanonets_ocr.service import DEFAULT_PROMPT as NANONETS_DEFAULT_PROMPT
from app.nanonets_ocr.service import nanonets_ocr_service
from app.paddle_ocr.service import paddle_ocr_service
from app.qianfan_ocr.service import DEFAULT_PROMPT as QIANFAN_DEFAULT_PROMPT
from app.qianfan_ocr.service import qianfan_ocr_service
from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images
from app.vlm.service import vlm_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/testing", tags=["testing"])
settings = get_settings()

ALLOWED_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}
ALLOWED_EXTENSIONS = (".pdf", ".png", ".jpg", ".jpeg", ".webp")

DEFAULT_VLM_QUESTION = (
    "Extract all text from this document. Return only the extracted text, preserving layout where possible."
)


def _validate_file(filename: str | None, content_type: str) -> str:
    if not filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    lower_name = filename.lower()
    is_allowed = content_type in ALLOWED_TYPES or lower_name.endswith(ALLOWED_EXTENSIONS)
    if not is_allowed:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and image files (PNG, JPG, WEBP) are supported",
        )
    return lower_name


def _is_pdf(content_type: str, filename: str) -> bool:
    return content_type == "application/pdf" or filename.endswith(".pdf")


@router.get("/models/")
def list_testing_models(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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
                "capability_tags": ["vision", "pdf", "images", "ocr", "table", "chart", "formula"],
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

    if settings.NANONETS_OCR_ENABLED:
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
                "slug": "nanonets-ocr2-3b",
                "display_name": f"Nanonets OCR 2 3B ({settings.NANONETS_OCR_MODEL_ID})",
                "type": "nanonets_ocr",
                "adapter_type": "nanonets-ocr2-3b",
                "capability_tags": [
                    "vision",
                    "pdf",
                    "images",
                    "ocr",
                    "tables",
                    "equations",
                    "handwriting",
                    "html",
                    "latex",
                ],
            },
        )

    return {"models": models}


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
    filename = _validate_file(file.filename, content_type)

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit",
        )

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

    if model_slug == "nanonets-ocr2-3b":
        return await _run_nanonets_ocr(
            content,
            content_type,
            filename,
            prompt or NANONETS_DEFAULT_PROMPT,
        )

    engine = (
        db.query(Engine)
        .filter(Engine.slug == model_slug, Engine.is_active.is_(True))
        .first()
    )
    if not engine:
        raise HTTPException(status_code=404, detail=f"Model '{model_slug}' not found")

    start = time.perf_counter()
    try:
        result = run_ocr(content, content_type, engine.adapter_type, file.filename or filename)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {exc}") from exc

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
    if not settings.VLM_ENABLED:
        raise HTTPException(status_code=503, detail="VLM service is disabled")

    try:
        vlm_service.load()
    except RuntimeError as exc:
        logger.exception("VLM service load failed")
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    total_start = time.perf_counter()

    try:
        if _is_pdf(content_type, filename):
            images = pdf_bytes_to_images(content, dpi=settings.VLM_PDF_DPI)
            if not images:
                raise HTTPException(status_code=400, detail="PDF contains no pages")
            if len(images) > settings.VLM_MAX_PDF_PAGES:
                raise HTTPException(
                    status_code=400,
                    detail=f"PDF exceeds maximum of {settings.VLM_MAX_PDF_PAGES} pages",
                )

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
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("VLM inference failed with exception")
        raise HTTPException(status_code=500, detail=f"VLM inference failed: {exc}") from exc


async def _run_paddle_ocr(
    content: bytes,
    content_type: str,
    filename: str,
    task: str,
) -> dict:
    if not settings.PADDLE_OCR_ENABLED:
        raise HTTPException(status_code=503, detail="PaddleOCR-VL service is disabled")

    try:
        paddle_ocr_service.load()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    total_start = time.perf_counter()

    try:
        if _is_pdf(content_type, filename):
            images = pdf_bytes_to_images(content, dpi=settings.PADDLE_OCR_PDF_DPI)
            if not images:
                raise HTTPException(status_code=400, detail="PDF contains no pages")
            if len(images) > settings.PADDLE_OCR_MAX_PDF_PAGES:
                raise HTTPException(
                    status_code=400,
                    detail=f"PDF exceeds maximum of {settings.PADDLE_OCR_MAX_PDF_PAGES} pages",
                )

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
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PaddleOCR-VL inference failed: {exc}") from exc


async def _run_qianfan_ocr(
    content: bytes,
    content_type: str,
    filename: str,
    prompt: str,
) -> dict:
    if not settings.QIANFAN_OCR_ENABLED:
        raise HTTPException(status_code=503, detail="Qianfan-OCR service is disabled")

    try:
        qianfan_ocr_service.load()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    total_start = time.perf_counter()

    try:
        if _is_pdf(content_type, filename):
            images = pdf_bytes_to_images(content, dpi=settings.QIANFAN_OCR_PDF_DPI)
            if not images:
                raise HTTPException(status_code=400, detail="PDF contains no pages")
            if len(images) > settings.QIANFAN_OCR_MAX_PDF_PAGES:
                raise HTTPException(
                    status_code=400,
                    detail=f"PDF exceeds maximum of {settings.QIANFAN_OCR_MAX_PDF_PAGES} pages",
                )

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
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Qianfan-OCR inference failed: {exc}") from exc


async def _run_nanonets_ocr(
    content: bytes,
    content_type: str,
    filename: str,
    prompt: str,
) -> dict:
    if not settings.NANONETS_OCR_ENABLED:
        raise HTTPException(status_code=503, detail="Nanonets OCR service is disabled")

    total_start = time.perf_counter()

    try:
        native_pages = nanonets_ocr_service.extract_pdf_text(content) if _is_pdf(content_type, filename) else None
        if native_pages:
            total_elapsed_ms = (time.perf_counter() - total_start) * 1000
            pages = [
                {
                    "page_number": page_number,
                    "text": page_text,
                    "processing_time_ms": 0.0,
                }
                for page_number, page_text in enumerate(native_pages, start=1)
            ]
            combined_text = "\n\n".join(
                f"--- Page {page['page_number']} ---\n{page['text']}" for page in pages
            )

            return {
                "model_slug": "nanonets-ocr2-3b",
                "model_name": f"Nanonets OCR 2 3B ({settings.NANONETS_OCR_MODEL_ID})",
                "model_type": "nanonets_ocr",
                "status": "completed",
                "filename": filename,
                "result": {
                    "text": combined_text,
                    "timing_ms": round(total_elapsed_ms, 2),
                    "pages": pages,
                    "prompt": prompt,
                },
            }

        if _is_pdf(content_type, filename):
            images = pdf_bytes_to_images(content, dpi=settings.NANONETS_OCR_PDF_DPI)
            if not images:
                raise HTTPException(status_code=400, detail="PDF contains no pages")
            if len(images) > settings.NANONETS_OCR_MAX_PDF_PAGES:
                raise HTTPException(
                    status_code=400,
                    detail=f"PDF exceeds maximum of {settings.NANONETS_OCR_MAX_PDF_PAGES} pages",
                )

            page_results = await nanonets_ocr_service.analyze_pdf_pages(
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
                "model_slug": "nanonets-ocr2-3b",
                "model_name": f"Nanonets OCR 2 3B ({settings.NANONETS_OCR_MODEL_ID})",
                "model_type": "nanonets_ocr",
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
        result, elapsed_ms = await nanonets_ocr_service.recognize(
            image=image,
            prompt=prompt,
        )

        return {
            "model_slug": "nanonets-ocr2-3b",
            "model_name": f"Nanonets OCR 2 3B ({settings.NANONETS_OCR_MODEL_ID})",
            "model_type": "nanonets_ocr",
            "status": "completed",
            "filename": filename,
            "result": {
                "text": result,
                "timing_ms": round(elapsed_ms, 2),
                "prompt": prompt,
            },
        }
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Nanonets OCR inference failed: {exc}") from exc
