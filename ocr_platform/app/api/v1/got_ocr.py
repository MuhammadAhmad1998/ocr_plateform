import time

from fastapi import APIRouter, File, Form, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.exceptions import AppException, BadRequestError
from app.core.inference_helpers import map_inference_error, validate_pdf_images
from app.core.uploads import check_payload_size, reject_pdf_for_image_endpoint, require_pdf_only, validate_media_upload
from app.got_ocr.schemas import (
    GotOCRPageResult,
    GotOCRPdfResponse,
    GotOCRResponse,
)
from app.got_ocr.service import got_ocr_service
from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images

router = APIRouter(prefix="/got-ocr", tags=["got-ocr"])
settings = get_settings()


def _validate_ocr_type(ocr_type: str) -> None:
    if ocr_type not in ("ocr", "format"):
        raise BadRequestError("ocr_type must be 'ocr' or 'format'")


@router.post("/recognize/", response_model=GotOCRResponse)
async def got_ocr_recognize(
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP)"),
    ocr_type: str = Form("ocr", description="OCR type: 'ocr' for plain text or 'format' for formatted output"),
):
    """Run GOT-OCR2.0 on a single uploaded image."""
    content_type = file.content_type or "application/octet-stream"
    validate_media_upload(file.filename, content_type)
    reject_pdf_for_image_endpoint(file.filename, content_type, endpoint="POST /got-ocr/pdf/analyze/")
    _validate_ocr_type(ocr_type)

    content = await file.read()
    check_payload_size(content)

    try:
        image = image_bytes_to_pil(content)
        result, elapsed_ms = await got_ocr_service.recognize(
            image=image,
            ocr_type=ocr_type,
        )
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="GOT-OCR inference") from exc

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
    validate_media_upload(file.filename, content_type)
    require_pdf_only(file.filename, content_type)
    _validate_ocr_type(ocr_type)

    content = await file.read()
    check_payload_size(content)
    total_start = time.perf_counter()

    try:
        images = pdf_bytes_to_images(content, dpi=settings.GOT_OCR_PDF_DPI)
        validate_pdf_images(images, max_pages=settings.GOT_OCR_MAX_PDF_PAGES)
        page_results = await got_ocr_service.analyze_pdf_pages(
            images=images,
            ocr_type=ocr_type,
        )
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="PDF analysis") from exc

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
