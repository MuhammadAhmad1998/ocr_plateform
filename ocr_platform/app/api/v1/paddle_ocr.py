import time

from fastapi import APIRouter, File, Form, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.exceptions import AppException, BadRequestError
from app.core.inference_helpers import ensure_model_service_ready, map_inference_error, validate_pdf_images
from app.core.uploads import check_payload_size, reject_pdf_for_image_endpoint, require_pdf_only, validate_media_upload
from app.paddle_ocr.schemas import (
    PaddleOCRPageResult,
    PaddleOCRPdfResponse,
    PaddleOCRResponse,
    PaddleTaskType,
)
from app.paddle_ocr.service import PROMPTS, paddle_ocr_service
from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images

router = APIRouter(prefix="/paddle-ocr", tags=["paddle-ocr"])
settings = get_settings()


def _validate_task(task: str) -> PaddleTaskType:
    if task not in PROMPTS:
        raise BadRequestError(f"Invalid task '{task}'. Must be one of: {', '.join(PROMPTS)}")
    return task  # type: ignore[return-value]


def _ensure_paddle_ocr_ready() -> None:
    ensure_model_service_ready(
        enabled=settings.PADDLE_OCR_ENABLED,
        service_name="PaddleOCR-VL",
        load_fn=paddle_ocr_service.load,
    )


@router.post("/recognize/", response_model=PaddleOCRResponse)
async def paddle_ocr_recognize(
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP)"),
    task: PaddleTaskType = Form("ocr", description="Recognition task: ocr, table, chart, formula, spotting, seal"),
    max_new_tokens: int | None = Form(None, ge=1, le=4096, description="Max generation tokens"),
):
    """Run PaddleOCR-VL on a single uploaded image."""
    content_type = file.content_type or "application/octet-stream"
    validate_media_upload(file.filename, content_type)
    _validate_task(task)
    reject_pdf_for_image_endpoint(file.filename, content_type, endpoint="POST /paddle-ocr/pdf/analyze/")

    content = await file.read()
    check_payload_size(content)
    _ensure_paddle_ocr_ready()

    try:
        image = image_bytes_to_pil(content)
        result, elapsed_ms = await paddle_ocr_service.recognize(
            image=image,
            task=task,
            max_new_tokens=max_new_tokens,
        )
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="PaddleOCR-VL inference") from exc

    return PaddleOCRResponse(
        filename=file.filename,
        task=task,
        result=result,
        processing_time_ms=round(elapsed_ms, 2),
    )


@router.post("/pdf/analyze/")
async def paddle_ocr_analyze_pdf(
    file: UploadFile = File(..., description="PDF file to analyze"),
    task: PaddleTaskType = Form("ocr", description="Recognition task applied to every page"),
    max_new_tokens: int | None = Form(None, ge=1, le=4096, description="Max generation tokens"),
):
    """Convert each PDF page to an image and run PaddleOCR-VL inference per page."""
    content_type = file.content_type or "application/octet-stream"
    validate_media_upload(file.filename, content_type)
    _validate_task(task)
    require_pdf_only(file.filename, content_type)

    content = await file.read()
    check_payload_size(content)
    _ensure_paddle_ocr_ready()
    total_start = time.perf_counter()

    try:
        images = pdf_bytes_to_images(content, dpi=settings.PADDLE_OCR_PDF_DPI)
        validate_pdf_images(images, max_pages=settings.PADDLE_OCR_MAX_PDF_PAGES)
        page_results = await paddle_ocr_service.analyze_pdf_pages(
            images=images,
            task=task,
            max_new_tokens=max_new_tokens,
        )
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="PDF analysis") from exc

    total_elapsed_ms = (time.perf_counter() - total_start) * 1000
    pages = [
        PaddleOCRPageResult(
            page_number=page_number,
            task=task,
            result=result,
            processing_time_ms=round(elapsed_ms, 2),
        )
        for page_number, result, elapsed_ms in sorted(page_results, key=lambda item: item[0])
    ]

    response = PaddleOCRPdfResponse(
        filename=file.filename or "document.pdf",
        total_pages=len(pages),
        task=task,
        pages=pages,
        total_processing_time_ms=round(total_elapsed_ms, 2),
    )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=response.model_dump(),
    )


@router.get("/health/")
def paddle_ocr_health():
    return {
        "enabled": settings.PADDLE_OCR_ENABLED,
        "loaded": paddle_ocr_service.is_loaded,
        "model_id": settings.PADDLE_OCR_MODEL_ID,
        "load_error": paddle_ocr_service.load_error,
        "supported_tasks": list(PROMPTS.keys()),
    }
