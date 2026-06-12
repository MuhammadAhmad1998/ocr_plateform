"""Shared upload validation helpers."""

from __future__ import annotations

from app.core.config import get_settings
from app.core.exceptions import BadRequestError, PayloadTooLargeError

settings = get_settings()

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/webp"}
ALLOWED_PDF_TYPES = {"application/pdf"}
ALLOWED_MEDIA_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_PDF_TYPES
ALLOWED_MEDIA_EXTENSIONS = (".pdf", ".png", ".jpg", ".jpeg", ".webp")

ALLOWED_ADVISOR_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}
ALLOWED_ADVISOR_EXTENSIONS = (".pdf", ".png", ".jpg", ".jpeg")


def validate_filename(filename: str | None, *, message: str = "No filename provided") -> str:
    if not filename:
        raise BadRequestError(message)
    return filename


def validate_media_upload(filename: str | None, content_type: str) -> str:
    """Validate PDF or image uploads used by OCR/VLM/testing endpoints."""
    name = validate_filename(filename)
    lower_name = name.lower()
    is_allowed = content_type in ALLOWED_MEDIA_TYPES or lower_name.endswith(ALLOWED_MEDIA_EXTENSIONS)
    if not is_allowed:
        raise BadRequestError("Only PDF and image files (PNG, JPG, WEBP) are supported")
    return lower_name


def validate_advisor_upload(filename: str | None, content_type: str) -> None:
    name = validate_filename(filename, message="No filename")
    lower_name = name.lower()
    if content_type not in ALLOWED_ADVISOR_TYPES and not lower_name.endswith(ALLOWED_ADVISOR_EXTENSIONS):
        raise BadRequestError("Only PDF, PNG, JPG allowed")


def check_payload_size(content: bytes, max_mb: int | None = None) -> None:
    limit_mb = max_mb if max_mb is not None else settings.MAX_UPLOAD_SIZE_MB
    max_bytes = limit_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise PayloadTooLargeError(f"File exceeds {limit_mb}MB limit")


def is_pdf(content_type: str, filename: str) -> bool:
    return content_type in ALLOWED_PDF_TYPES or filename.lower().endswith(".pdf")


def is_image(content_type: str, filename: str) -> bool:
    lower_name = filename.lower()
    return content_type in ALLOWED_IMAGE_TYPES or lower_name.endswith(
        (".png", ".jpg", ".jpeg", ".webp")
    )


def reject_pdf_for_image_endpoint(filename: str | None, content_type: str, *, endpoint: str) -> None:
    if is_pdf(content_type, filename or ""):
        raise BadRequestError(f"Use {endpoint} for PDF uploads")


def require_pdf_only(filename: str | None, content_type: str) -> None:
    if not is_pdf(content_type, filename or ""):
        raise BadRequestError("Only PDF files are supported")


def validate_pdf_page_count(page_count: int, max_pages: int) -> None:
    if page_count < 1:
        raise BadRequestError("PDF contains no pages")
    if page_count > max_pages:
        raise BadRequestError(f"PDF exceeds maximum of {max_pages} pages")
