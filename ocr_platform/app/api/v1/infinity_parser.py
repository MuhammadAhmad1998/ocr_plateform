import time

from fastapi import APIRouter, File, Form, UploadFile, status
from fastapi.responses import JSONResponse

from app.core.config import get_settings
from app.core.exceptions import AppException, BadRequestError
from app.core.inference_helpers import ensure_model_service_ready, map_inference_error, validate_pdf_images
from app.core.uploads import check_payload_size, reject_pdf_for_image_endpoint, require_pdf_only, validate_media_upload
from app.infinity_parser.schemas import (
    InfinityParserPageResult,
    InfinityParserPdfResponse,
    InfinityParserResponse,
    InfinityTaskType,
)
from app.infinity_parser.service import TASK_PROMPTS, infinity_parser_service
from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images

router = APIRouter(prefix="/infinity-parser", tags=["infinity-parser"])
settings = get_settings()


def _validate_task(task_type: str, custom_prompt: str | None) -> InfinityTaskType:
    if task_type not in (*TASK_PROMPTS, "custom"):
        raise BadRequestError(
            f"Invalid task_type '{task_type}'. Must be one of: {', '.join(TASK_PROMPTS)}, custom"
        )
    if task_type == "custom" and not custom_prompt:
        raise BadRequestError("custom_prompt is required when task_type is 'custom'")
    return task_type  # type: ignore[return-value]


def _resolved_prompt(task_type: str, custom_prompt: str | None) -> str:
    if task_type == "custom":
        return custom_prompt or ""
    return TASK_PROMPTS[task_type]


def _ensure_infinity_parser_ready() -> None:
    ensure_model_service_ready(
        enabled=settings.INFINITY_PARSER_ENABLED,
        service_name="Infinity-Parser2-Flash",
        load_fn=infinity_parser_service.load,
    )


@router.post("/recognize/", response_model=InfinityParserResponse)
async def infinity_parser_recognize(
    file: UploadFile = File(..., description="Image file (PNG, JPG, WEBP)"),
    task_type: InfinityTaskType = Form("doc2md", description="doc2md, doc2json, or custom"),
    custom_prompt: str | None = Form(None, description="Required when task_type is custom"),
    max_new_tokens: int | None = Form(None, ge=1, le=32768, description="Max generation tokens"),
    enable_thinking: bool = Form(False, description="Enable model thinking mode"),
):
    """Run Infinity-Parser2-Flash on a single uploaded image."""
    content_type = file.content_type or "application/octet-stream"
    validate_media_upload(file.filename, content_type)
    _validate_task(task_type, custom_prompt)
    reject_pdf_for_image_endpoint(file.filename, content_type, endpoint="POST /infinity-parser/pdf/analyze/")

    content = await file.read()
    check_payload_size(content)
    _ensure_infinity_parser_ready()
    prompt = _resolved_prompt(task_type, custom_prompt)

    try:
        image = image_bytes_to_pil(content)
        result, elapsed_ms = await infinity_parser_service.recognize(
            image=image,
            task_type=task_type,
            custom_prompt=custom_prompt,
            max_new_tokens=max_new_tokens,
            enable_thinking=enable_thinking,
        )
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="Infinity-Parser2 inference") from exc

    return InfinityParserResponse(
        filename=file.filename,
        task_type=task_type,
        prompt=prompt,
        result=result,
        processing_time_ms=round(elapsed_ms, 2),
    )


@router.post("/pdf/analyze/")
async def infinity_parser_analyze_pdf(
    file: UploadFile = File(..., description="PDF file to analyze"),
    task_type: InfinityTaskType = Form("doc2md", description="doc2md, doc2json, or custom"),
    custom_prompt: str | None = Form(None, description="Required when task_type is custom"),
    max_new_tokens: int | None = Form(None, ge=1, le=32768, description="Max generation tokens"),
    enable_thinking: bool = Form(False, description="Enable model thinking mode"),
):
    """Convert each PDF page to an image and run Infinity-Parser2 inference per page."""
    content_type = file.content_type or "application/octet-stream"
    validate_media_upload(file.filename, content_type)
    _validate_task(task_type, custom_prompt)
    require_pdf_only(file.filename, content_type)

    content = await file.read()
    check_payload_size(content)
    _ensure_infinity_parser_ready()
    prompt = _resolved_prompt(task_type, custom_prompt)
    total_start = time.perf_counter()

    try:
        images = pdf_bytes_to_images(content, dpi=settings.INFINITY_PARSER_PDF_DPI)
        validate_pdf_images(images, max_pages=settings.INFINITY_PARSER_MAX_PDF_PAGES)
        page_results = await infinity_parser_service.analyze_pdf_pages(
            images=images,
            task_type=task_type,
            custom_prompt=custom_prompt,
            max_new_tokens=max_new_tokens,
            enable_thinking=enable_thinking,
        )
    except AppException:
        raise
    except Exception as exc:
        raise map_inference_error(exc, operation="PDF analysis") from exc

    total_elapsed_ms = (time.perf_counter() - total_start) * 1000
    pages = [
        InfinityParserPageResult(
            page_number=page_number,
            task_type=task_type,
            prompt=prompt,
            result=result,
            processing_time_ms=round(elapsed_ms, 2),
        )
        for page_number, result, elapsed_ms in sorted(page_results, key=lambda item: item[0])
    ]

    response = InfinityParserPdfResponse(
        filename=file.filename or "document.pdf",
        total_pages=len(pages),
        task_type=task_type,
        prompt=prompt,
        pages=pages,
        total_processing_time_ms=round(total_elapsed_ms, 2),
    )
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content=response.model_dump(),
    )


@router.get("/health/")
def infinity_parser_health():
    return {
        "enabled": settings.INFINITY_PARSER_ENABLED,
        "loaded": infinity_parser_service.is_loaded,
        "model_id": settings.INFINITY_PARSER_MODEL_ID,
        "load_error": infinity_parser_service.load_error,
        "supported_tasks": [*TASK_PROMPTS.keys(), "custom"],
        "default_task": "doc2md",
    }
