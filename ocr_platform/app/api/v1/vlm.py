import time

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
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


def _ensure_vlm_ready() -> None:
    if not settings.VLM_ENABLED:
        raise HTTPException(status_code=503, detail="VLM service is disabled")
    try:
        vlm_service.load()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/chat/", response_model=VLMChatResponse)
async def vlm_chat(
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP)"),
    question: str = Form(..., min_length=1, description="Question about the image"),
    enable_thinking: bool = Form(False, description="Enable model thinking mode"),
):
    """Ask a question about a single uploaded image."""
    content_type = file.content_type or "application/octet-stream"
    _validate_upload(file.filename, content_type)

    if content_type in ALLOWED_PDF_TYPES or (file.filename and file.filename.lower().endswith(".pdf")):
        raise HTTPException(
            status_code=400,
            detail="Use POST /vlm/pdf/analyze/ for PDF uploads",
        )

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit",
        )

    _ensure_vlm_ready()

    try:
        image = image_bytes_to_pil(content)
        answer, elapsed_ms = await vlm_service.chat_with_image(
            image=image,
            question=question,
            enable_thinking=enable_thinking,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"VLM inference failed: {exc}") from exc

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
    import json

    content_type = file.content_type or "application/octet-stream"
    _validate_upload(file.filename, content_type)

    if content_type in ALLOWED_PDF_TYPES or (file.filename and file.filename.lower().endswith(".pdf")):
        raise HTTPException(status_code=400, detail="Multi-turn chat supports images only")

    try:
        data = VLMMultiTurnRequest.model_validate(json.loads(payload))
    except (json.JSONDecodeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=f"Invalid payload JSON: {exc}") from exc

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit",
        )

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
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"VLM inference failed: {exc}") from exc

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
    """
    Convert each PDF page to an image and run VLM inference asynchronously per page.
    Returns a structured JSON report for all pages.
    """
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

    _ensure_vlm_ready()
    total_start = time.perf_counter()

    try:
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
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF analysis failed: {exc}") from exc

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
