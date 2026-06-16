import time

from fastapi import APIRouter, File, Form, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.exceptions import AppException
from app.core.inference_helpers import ensure_model_service_ready, map_inference_error, validate_pdf_images
from app.core.uploads import check_payload_size, reject_pdf_for_image_endpoint, require_pdf_only, validate_media_upload
from app.qianfan_ocr.schemas import (
    QianfanOCRPageResult,
    QianfanOCRPdfResponse,
    QianfanOCRResponse,
)
from app.qianfan_ocr.service import DEFAULT_PROMPT, qianfan_ocr_service
from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images

router = APIRouter(prefix="/qianfan-ocr", tags=["qianfan-ocr"])
settings = get_settings()


def _ensure_qianfan_ocr_ready() -> None:
    ensure_model_service_ready(
        enabled=settings.QIANFAN_OCR_ENABLED,
        service_name="Qianfan-OCR",
        load_fn=qianfan_ocr_service.load,
    )


@router.post("/recognize/", response_model=QianfanOCRResponse)
async def qianfan_ocr_recognize(
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP)"),
    prompt: str = Form(DEFAULT_PROMPT, description="Instruction for document parsing"),
    max_new_tokens: int | None = Form(None, ge=1, le=4096, description="Max generation tokens"),
):
    """Run Qianfan-OCR on a single uploaded image."""
    content_type = file.content_type or "application/octet-stream"
    validate_media_upload(file.filename, content_type)
    reject_pdf_for_image_endpoint(file.filename, content_type, endpoint="POST /qianfan-ocr/pdf/analyze/")

    content = await file.read()
    check_payload_size(content)
    _ensure_qianfan_ocr_ready()

    try:
        image = image_bytes_to_pil(content)
        result, elapsed_ms = await qianfan_ocr_service.recognize(
            image=image,
            prompt=prompt,
            max_new_tokens=max_new_tokens,
        )
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="Qianfan-OCR inference") from exc

    return QianfanOCRResponse(
        filename=file.filename,
        prompt=prompt,
        result=result,
        processing_time_ms=round(elapsed_ms, 2),
    )


@router.post("/pdf/analyze/")
async def qianfan_ocr_analyze_pdf(
    file: UploadFile = File(..., description="PDF file to analyze"),
    prompt: str = Form(DEFAULT_PROMPT, description="Instruction applied to every page"),
    max_new_tokens: int | None = Form(None, ge=1, le=4096, description="Max generation tokens"),
):
    """Convert each PDF page to an image and run Qianfan-OCR inference per page."""
    content_type = file.content_type or "application/octet-stream"
    validate_media_upload(file.filename, content_type)
    require_pdf_only(file.filename, content_type)

    content = await file.read()
    check_payload_size(content)
    _ensure_qianfan_ocr_ready()
    total_start = time.perf_counter()

    try:
        images = pdf_bytes_to_images(content, dpi=settings.QIANFAN_OCR_PDF_DPI)
        validate_pdf_images(images, max_pages=settings.QIANFAN_OCR_MAX_PDF_PAGES)
        page_results = await qianfan_ocr_service.analyze_pdf_pages(
            images=images,
            prompt=prompt,
            max_new_tokens=max_new_tokens,
        )
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="PDF analysis") from exc

    total_elapsed_ms = (time.perf_counter() - total_start) * 1000
    pages = [
        QianfanOCRPageResult(
            page_number=page_number,
            prompt=prompt,
            result=result,
            processing_time_ms=round(elapsed_ms, 2),
        )
        for page_number, result, elapsed_ms in sorted(page_results, key=lambda item: item[0])
    ]

    response = QianfanOCRPdfResponse(
        filename=file.filename or "document.pdf",
        total_pages=len(pages),
        prompt=prompt,
        pages=pages,
        total_processing_time_ms=round(total_elapsed_ms, 2),
    )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=response.model_dump(),
    )


@router.get("/health/")
def qianfan_ocr_health():
    return {
        "enabled": settings.QIANFAN_OCR_ENABLED,
        "loaded": qianfan_ocr_service.is_loaded,
        "model_id": settings.QIANFAN_OCR_MODEL_ID,
        "load_error": qianfan_ocr_service.load_error,
        "default_prompt": DEFAULT_PROMPT,
    }
