import time

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.ocr_engine.adapters.base import run_ocr
from app.registry.models import Engine
from app.vlm.pdf_utils import image_bytes_to_pil, pdf_bytes_to_images
from app.vlm.service import vlm_service

router = APIRouter(prefix="/testing", tags=["testing"])
settings = get_settings()

ALLOWED_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}
ALLOWED_EXTENSIONS = (".pdf", ".png", ".jpg", ".jpeg", ".webp")

DEFAULT_VLM_QUESTION = (
    "Extract all text from this document. Return only the extracted text, preserving layout where possible."
)


def _validate_file(filename: str | None, content_type: str) -> str:
    if not filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    lower_name = filename.lower()
    is_allowed = content_type in ALLOWED_TYPES or lower_name.endswith(ALLOWED_EXTENSIONS)
    if not is_allowed:
        raise HTTPException(
            status_code=400,
            detail="Only PDF and image files (PNG, JPG, WEBP) are supported",
        )
    return lower_name


def _is_pdf(content_type: str, filename: str) -> bool:
    return content_type == "application/pdf" or filename.endswith(".pdf")


@router.get("/models/")
def list_testing_models(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    engines = (
        db.query(Engine)
        .filter(Engine.is_active.is_(True))
        .order_by(Engine.display_name)
        .all()
    )

    models = [
        {
            "slug": engine.slug,
            "display_name": engine.display_name,
            "type": "ocr",
            "adapter_type": engine.adapter_type,
            "capability_tags": engine.capability_tags or [],
        }
        for engine in engines
    ]

    if settings.VLM_ENABLED:
        models.insert(
            0,
            {
                "slug": "vlm",
                "display_name": f"VLM ({settings.VLM_MODEL_ID})",
                "type": "vlm",
                "adapter_type": "vlm",
                "capability_tags": ["vision", "pdf", "images", "qa"],
            },
        )

    return {"models": models}


@router.post("/run/")
async def run_testing_ocr(
    file: UploadFile = File(...),
    model_slug: str = Form(..., min_length=1),
    question: str = Form(DEFAULT_VLM_QUESTION),
    enable_thinking: bool = Form(False),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    content_type = file.content_type or "application/octet-stream"
    filename = _validate_file(file.filename, content_type)

    content = await file.read()
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds {settings.MAX_UPLOAD_SIZE_MB}MB limit",
        )

    if model_slug == "vlm":
        return await _run_vlm(content, content_type, filename, question, enable_thinking)

    engine = (
        db.query(Engine)
        .filter(Engine.slug == model_slug, Engine.is_active.is_(True))
        .first()
    )
    if not engine:
        raise HTTPException(status_code=404, detail=f"Model '{model_slug}' not found")

    start = time.perf_counter()
    try:
        result = run_ocr(content, content_type, engine.adapter_type, file.filename or filename)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {exc}") from exc

    elapsed_ms = int((time.perf_counter() - start) * 1000)

    return {
        "model_slug": engine.slug,
        "model_name": engine.display_name,
        "model_type": "ocr",
        "status": "completed",
        "filename": file.filename,
        "result": {
            "text": result.get("text", ""),
            "confidence": result.get("confidence"),
            "timing_ms": result.get("timing_ms", elapsed_ms),
            "layout": result.get("layout"),
        },
    }


async def _run_vlm(
    content: bytes,
    content_type: str,
    filename: str,
    question: str,
    enable_thinking: bool,
) -> dict:
    if not settings.VLM_ENABLED:
        raise HTTPException(status_code=503, detail="VLM service is disabled")

    try:
        vlm_service.load()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    total_start = time.perf_counter()

    try:
        if _is_pdf(content_type, filename):
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

            pages = [
                {
                    "page_number": page_number,
                    "text": answer,
                    "processing_time_ms": round(elapsed_ms, 2),
                }
                for page_number, answer, elapsed_ms in sorted(page_results, key=lambda item: item[0])
            ]
            combined_text = "\n\n".join(
                f"--- Page {page['page_number']} ---\n{page['text']}" for page in pages
            )
            total_elapsed_ms = (time.perf_counter() - total_start) * 1000

            return {
                "model_slug": "vlm",
                "model_name": f"VLM ({settings.VLM_MODEL_ID})",
                "model_type": "vlm",
                "status": "completed",
                "filename": filename,
                "result": {
                    "text": combined_text,
                    "timing_ms": round(total_elapsed_ms, 2),
                    "pages": pages,
                    "question": question,
                },
            }

        image = image_bytes_to_pil(content)
        answer, elapsed_ms = await vlm_service.chat_with_image(
            image=image,
            question=question,
            enable_thinking=enable_thinking,
        )

        return {
            "model_slug": "vlm",
            "model_name": f"VLM ({settings.VLM_MODEL_ID})",
            "model_type": "vlm",
            "status": "completed",
            "filename": filename,
            "result": {
                "text": answer,
                "timing_ms": round(elapsed_ms, 2),
                "question": question,
            },
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"VLM inference failed: {exc}") from exc
