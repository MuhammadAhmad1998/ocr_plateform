import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.got_ocr.schemas import (
    GotOCRPageResult,
    GotOCRPdfResponse,
    GotOCRResponse,
)
from app.got_ocr.service import got_ocr_service
from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images

router = APIRouter(prefix="/got-ocr", tags=["got-ocr"])
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


def _ensure_got_ocr_ready() -> None:
    if not settings.GOT_OCR_ENABLED:
        raise HTTPException(status_code=503, detail="GOT-OCR service is disabled")
    try:
        got_ocr_service.load()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/recognize/", response_model=GotOCRResponse)
async def got_ocr_recognize(
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP)"),
    ocr_type: str = Form("ocr", description="OCR type: 'ocr' for plain text or 'format' for formatted output"),
):
    """Run GOT-OCR2.0 on a single uploaded image."""
    content_type = file.content_type or "application/octet-stream"
    _validate_upload(file.filename, content_type)

    if content_type in ALLOWED_PDF_TYPES or (file.filename and file.filename.lower().endswith(".pdf")):
        raise HTTPException(
            status_code=400,
            detail="Use POST /got-ocr/pdf/analyze/ for PDF uploads",
        )

    if ocr_type not in ("ocr", "format"):
        raise HTTPException(
            status_code=400,
            detail="ocr_type must be 'ocr' or 'format'",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit",
        )

    try:
        image = image_bytes_to_pil(content)
        result, elapsed_ms = await got_ocr_service.recognize(
            image=image,
            ocr_type=ocr_type,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"GOT-OCR inference failed: {exc}") from exc

    return GotOCRResponse(
        filename=file.filename,
        ocr_type=ocr_type,
        result=result,
        processing_time_ms=round(elapsed_ms, 2),
    )


@router.post("/pdf/analyze/")
async def got_ocr_analyze_pdf(
    file: UploadFile = File(..., description="PDF file to analyze"),
    ocr_type: str = Form("ocr", description="OCR type: 'ocr' for plain text or 'format' for formatted output"),
):
    """Convert each PDF page to an image and run GOT-OCR inference per page."""
    content_type = file.content_type or "application/octet-stream"
    _validate_upload(file.filename, content_type)

    if content_type not in ALLOWED_PDF_TYPES and not (
        file.filename and file.filename.lower().endswith(".pdf")
    ):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    if ocr_type not in ("ocr", "format"):
        raise HTTPException(
            status_code=400,
            detail="ocr_type must be 'ocr' or 'format'",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit",
        )

    total_start = time.perf_counter()

    try:
        images = pdf_bytes_to_images(content, dpi=settings.GOT_OCR_PDF_DPI)
        if not images:
            raise HTTPException(status_code=400, detail="PDF contains no pages")

        if len(images) > settings.GOT_OCR_MAX_PDF_PAGES:
            raise HTTPException(
                status_code=400,
                detail=f"PDF exceeds maximum of {settings.GOT_OCR_MAX_PDF_PAGES} pages",
            )

        page_results = await got_ocr_service.analyze_pdf_pages(
            images=images,
            ocr_type=ocr_type,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF analysis failed: {exc}") from exc

    total_elapsed_ms = (time.perf_counter() - total_start) * 1000
    pages = [
        GotOCRPageResult(
            page_number=page_number,
            ocr_type=ocr_type,
            result=result,
            processing_time_ms=round(elapsed_ms, 2),
        )
        for page_number, result, elapsed_ms in sorted(page_results, key=lambda item: item[0])
    ]

    response = GotOCRPdfResponse(
        filename=file.filename or "document.pdf",
        total_pages=len(pages),
        ocr_type=ocr_type,
        pages=pages,
        total_processing_time_ms=round(total_elapsed_ms, 2),
    )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=response.model_dump(),
    )


@router.get("/health/")
def got_ocr_health():
    return {
        "enabled": settings.GOT_OCR_ENABLED,
        "loaded": got_ocr_service.is_loaded,
        "model_id": settings.GOT_OCR_MODEL_ID,
        "load_error": got_ocr_service.load_error,
    }
