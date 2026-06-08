import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
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

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
ALLOWED_PDF_TYPES = {"application/pdf"}


def _validate_upload(filename: str | None, content_type: str) -> None:
    if not filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    lower_name = filename.lower()
    is_pdf = content_type in ALLOWED_PDF_TYPES or lower_name.endswith(".pdf")
    is_image = content_type in ALLOWED_IMAGE_TYPES or lower_name.endswith(
        (".png", ".jpg", ".jpeg", ".webp")
    )
    if not is_pdf and not is_image:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and image files (PNG, JPG, WEBP) are supported",
        )


def _validate_task(task: str) -> PaddleTaskType:
    if task not in PROMPTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid task '{task}'. Must be one of: {', '.join(PROMPTS)}",
        )
    return task  # type: ignore[return-value]


def _ensure_paddle_ocr_ready() -> None:
    if not settings.PADDLE_OCR_ENABLED:
        raise HTTPException(status_code=503, detail="PaddleOCR-VL service is disabled")
    try:
        paddle_ocr_service.load()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/recognize/", response_model=PaddleOCRResponse)
async def paddle_ocr_recognize(
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP)"),
    task: PaddleTaskType = Form("ocr", description="Recognition task: ocr, table, chart, formula"),
    max_new_tokens: int | None = Form(None, ge=1, le=4096, description="Max generation tokens"),
):
    """Run PaddleOCR-VL on a single uploaded image."""
    content_type = file.content_type or "application/octet-stream"
    _validate_upload(file.filename, content_type)
    _validate_task(task)

    if content_type in ALLOWED_PDF_TYPES or (file.filename and file.filename.lower().endswith(".pdf")):
        raise HTTPException(
            status_code=400,
            detail="Use POST /paddle-ocr/pdf/analyze/ for PDF uploads",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit",
        )

    _ensure_paddle_ocr_ready()

    try:
        image = image_bytes_to_pil(content)
        result, elapsed_ms = await paddle_ocr_service.recognize(
            image=image,
            task=task,
            max_new_tokens=max_new_tokens,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PaddleOCR-VL inference failed: {exc}") from exc

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
    _validate_upload(file.filename, content_type)
    _validate_task(task)

    if content_type not in ALLOWED_PDF_TYPES and not (
        file.filename and file.filename.lower().endswith(".pdf")
    ):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit",
        )

    _ensure_paddle_ocr_ready()
    total_start = time.perf_counter()

    try:
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
            max_new_tokens=max_new_tokens,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF analysis failed: {exc}") from exc

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
