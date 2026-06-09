import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.qianfan_ocr.schemas import (
    QianfanOCRPageResult,
    QianfanOCRPdfResponse,
    QianfanOCRResponse,
)
from app.qianfan_ocr.service import DEFAULT_PROMPT, qianfan_ocr_service
from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images

router = APIRouter(prefix="/qianfan-ocr", tags=["qianfan-ocr"])
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


def _ensure_qianfan_ocr_ready() -> None:
    if not settings.QIANFAN_OCR_ENABLED:
        raise HTTPException(status_code=503, detail="Qianfan-OCR service is disabled")
    try:
        qianfan_ocr_service.load()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/recognize/", response_model=QianfanOCRResponse)
async def qianfan_ocr_recognize(
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP)"),
    prompt: str = Form(DEFAULT_PROMPT, description="Instruction for document parsing"),
    max_new_tokens: int | None = Form(None, ge=1, le=4096, description="Max generation tokens"),
):
    """Run Qianfan-OCR on a single uploaded image."""
    content_type = file.content_type or "application/octet-stream"
    _validate_upload(file.filename, content_type)

    if content_type in ALLOWED_PDF_TYPES or (file.filename and file.filename.lower().endswith(".pdf")):
        raise HTTPException(
            status_code=400,
            detail="Use POST /qianfan-ocr/pdf/analyze/ for PDF uploads",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit",
        )

    _ensure_qianfan_ocr_ready()

    try:
        image = image_bytes_to_pil(content)
        result, elapsed_ms = await qianfan_ocr_service.recognize(
            image=image,
            prompt=prompt,
            max_new_tokens=max_new_tokens,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Qianfan-OCR inference failed: {exc}") from exc

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
    _validate_upload(file.filename, content_type)

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

    _ensure_qianfan_ocr_ready()
    total_start = time.perf_counter()

    try:
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
            max_new_tokens=max_new_tokens,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF analysis failed: {exc}") from exc

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
