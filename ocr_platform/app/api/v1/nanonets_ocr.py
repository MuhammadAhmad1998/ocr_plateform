import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.nanonets_ocr.schemas import (
    NanonetsOCRPageResult,
    NanonetsOCRPdfResponse,
    NanonetsOCRResponse,
)
from app.nanonets_ocr.service import DEFAULT_PROMPT, nanonets_ocr_service
from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images

router = APIRouter(prefix="/nanonets-ocr", tags=["nanonets-ocr"])
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


def _ensure_nanonets_ocr_ready() -> None:
    if not settings.NANONETS_OCR_ENABLED:
        raise HTTPException(status_code=503, detail="Nanonets OCR service is disabled")
    try:
        nanonets_ocr_service.load()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/recognize/", response_model=NanonetsOCRResponse)
async def nanonets_ocr_recognize(
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP)"),
    prompt: str = Form(DEFAULT_PROMPT, description="Instruction for document parsing"),
    max_new_tokens: int | None = Form(None, ge=1, le=32768, description="Max generation tokens"),
):
    """Run Nanonets OCR 2 3B on a single uploaded image."""
    content_type = file.content_type or "application/octet-stream"
    _validate_upload(file.filename, content_type)

    if content_type in ALLOWED_PDF_TYPES or (file.filename and file.filename.lower().endswith(".pdf")):
        raise HTTPException(
            status_code=400,
            detail="Use POST /nanonets-ocr/pdf/analyze/ for PDF uploads",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit",
        )

    _ensure_nanonets_ocr_ready()

    try:
        image = image_bytes_to_pil(content)
        result, elapsed_ms = await nanonets_ocr_service.recognize(
            image=image,
            prompt=prompt,
            max_new_tokens=max_new_tokens,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Nanonets OCR inference failed: {exc}") from exc

    return NanonetsOCRResponse(
        filename=file.filename,
        prompt=prompt,
        result=result,
        processing_time_ms=round(elapsed_ms, 2),
    )


@router.post("/pdf/analyze/")
async def nanonets_ocr_analyze_pdf(
    file: UploadFile = File(..., description="PDF file to analyze"),
    prompt: str = Form(DEFAULT_PROMPT, description="Instruction applied to every page"),
    max_new_tokens: int | None = Form(None, ge=1, le=32768, description="Max generation tokens"),
):
    """Convert each PDF page to an image and run Nanonets OCR inference per page."""
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

    _ensure_nanonets_ocr_ready()
    total_start = time.perf_counter()

    try:
        native_pages = nanonets_ocr_service.extract_pdf_text(content)
        if native_pages:
            pages = [
                NanonetsOCRPageResult(
                    page_number=page_number,
                    prompt=prompt,
                    result=page_text,
                    processing_time_ms=0.0,
                )
                for page_number, page_text in enumerate(native_pages, start=1)
            ]
            response = NanonetsOCRPdfResponse(
                filename=file.filename or "document.pdf",
                total_pages=len(pages),
                prompt=prompt,
                pages=pages,
                total_processing_time_ms=round((time.perf_counter() - total_start) * 1000, 2),
            )
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content=response.model_dump(),
            )

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
            max_new_tokens=max_new_tokens,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF analysis failed: {exc}") from exc

    total_elapsed_ms = (time.perf_counter() - total_start) * 1000
    pages = [
        NanonetsOCRPageResult(
            page_number=page_number,
            prompt=prompt,
            result=result,
            processing_time_ms=round(elapsed_ms, 2),
        )
        for page_number, result, elapsed_ms in sorted(page_results, key=lambda item: item[0])
    ]

    response = NanonetsOCRPdfResponse(
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
def nanonets_ocr_health():
    return {
        "enabled": settings.NANONETS_OCR_ENABLED,
        "loaded": nanonets_ocr_service.is_loaded,
        "model_id": settings.NANONETS_OCR_MODEL_ID,
        "load_error": nanonets_ocr_service.load_error,
        "default_prompt": DEFAULT_PROMPT,
    }
