import json
import time

from fastapi import APIRouter, File, Form, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.exceptions import AppException, BadRequestError, ValidationError
from app.core.inference_helpers import ensure_model_service_ready, map_inference_error, validate_pdf_images
from app.core.uploads import (
    check_payload_size,
    is_pdf,
    reject_pdf_for_image_endpoint,
    require_pdf_only,
    validate_media_upload,
)
from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images
from app.vlm.schemas import (
    VLMChatResponse,
    VLMHistoryMessage,
    VLMMultiTurnRequest,
    VLMMultiTurnResponse,
    VLMPdfResponse,
    VLMPageResult,
)
from app.vlm.service import vlm_service

router = APIRouter(prefix="/vlm", tags=["vlm"])
settings = get_settings()


def _ensure_vlm_ready() -> None:
    ensure_model_service_ready(
        enabled=settings.VLM_ENABLED,
        service_name="VLM",
        load_fn=vlm_service.load,
    )


@router.post("/chat/", response_model=VLMChatResponse)
async def vlm_chat(
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP)"),
    question: str = Form(..., min_length=1, description="Question about the image"),
    enable_thinking: bool = Form(False, description="Enable model thinking mode"),
):
    """Ask a question about a single uploaded image."""
    content_type = file.content_type or "application/octet-stream"
    validate_media_upload(file.filename, content_type)
    reject_pdf_for_image_endpoint(file.filename, content_type, endpoint="POST /vlm/pdf/analyze/")

    content = await file.read()
    check_payload_size(content)
    _ensure_vlm_ready()

    try:
        image = image_bytes_to_pil(content)
        answer, elapsed_ms = await vlm_service.chat_with_image(
            image=image,
            question=question,
            enable_thinking=enable_thinking,
        )
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="VLM inference") from exc

    return VLMChatResponse(
        filename=file.filename,
        question=question,
        answer=answer,
        enable_thinking=enable_thinking,
        processing_time_ms=round(elapsed_ms, 2),
    )


@router.post("/chat/multi/", response_model=VLMMultiTurnResponse)
async def vlm_chat_multi_turn(
    file: UploadFile = File(..., description="Image file for multi-turn context"),
    payload: str = Form(
        ...,
        description='JSON body, e.g. {"question":"...", "history":[{"role":"user","content":"..."}], "enable_thinking": false}',
    ),
):
    """Multi-turn chat with image context (same image across turns)."""
    content_type = file.content_type or "application/octet-stream"
    validate_media_upload(file.filename, content_type)

    if is_pdf(content_type, file.filename or ""):
        raise BadRequestError("Multi-turn chat supports images only")

    try:
        data = VLMMultiTurnRequest.model_validate(json.loads(payload))
    except (json.JSONDecodeError, ValueError) as exc:
        raise ValidationError(f"Invalid payload JSON: {exc}") from exc

    content = await file.read()
    check_payload_size(content)
    _ensure_vlm_ready()

    try:
        image = image_bytes_to_pil(content)
        history = [item.model_dump() for item in data.history]
        answer, elapsed_ms = await vlm_service.chat_multi_turn(
            image=image,
            question=data.question,
            history=history,
            enable_thinking=data.enable_thinking,
        )
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="VLM inference") from exc

    updated_history = list(data.history) + [
        VLMHistoryMessage(role="user", content=data.question),
        VLMHistoryMessage(role="assistant", content=answer),
    ]

    return VLMMultiTurnResponse(
        question=data.question,
        answer=answer,
        history=updated_history,
        enable_thinking=data.enable_thinking,
        processing_time_ms=round(elapsed_ms, 2),
    )


@router.post("/pdf/analyze/")
async def vlm_analyze_pdf(
    file: UploadFile = File(..., description="PDF file to analyze"),
    question: str = Form(..., min_length=1, description="Question applied to every page"),
    enable_thinking: bool = Form(False, description="Enable model thinking mode"),
):
    """Convert each PDF page to an image and run VLM inference asynchronously per page."""
    content_type = file.content_type or "application/octet-stream"
    validate_media_upload(file.filename, content_type)
    require_pdf_only(file.filename, content_type)

    content = await file.read()
    check_payload_size(content)
    _ensure_vlm_ready()
    total_start = time.perf_counter()

    try:
        images = pdf_bytes_to_images(content, dpi=settings.VLM_PDF_DPI)
        validate_pdf_images(images, max_pages=settings.VLM_MAX_PDF_PAGES)
        page_results = await vlm_service.analyze_pdf_pages(
            images=images,
            question=question,
            enable_thinking=enable_thinking,
        )
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="PDF analysis") from exc

    total_elapsed_ms = (time.perf_counter() - total_start) * 1000
    pages = [
        VLMPageResult(
            page_number=page_number,
            question=question,
            answer=answer,
            processing_time_ms=round(elapsed_ms, 2),
        )
        for page_number, answer, elapsed_ms in sorted(page_results, key=lambda item: item[0])
    ]

    response = VLMPdfResponse(
        filename=file.filename or "document.pdf",
        total_pages=len(pages),
        question=question,
        enable_thinking=enable_thinking,
        pages=pages,
        total_processing_time_ms=round(total_elapsed_ms, 2),
    )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=response.model_dump(),
    )


@router.get("/health/")
def vlm_health():
    return {
        "enabled": settings.VLM_ENABLED,
        "loaded": vlm_service.is_loaded,
        "model_id": settings.VLM_MODEL_ID,
        "load_error": vlm_service.load_error,
    }
