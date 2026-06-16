import pytest

from app.core.exceptions import BadRequestError, PayloadTooLargeError
from app.core.uploads import (
    check_payload_size,
    is_pdf,
    reject_pdf_for_image_endpoint,
    require_pdf_only,
    validate_advisor_upload,
    validate_filename,
    validate_media_upload,
    validate_pdf_page_count,
)


def test_validate_filename_rejects_empty():
    with pytest.raises(BadRequestError, match="No filename provided"):
        validate_filename(None)


def test_validate_media_upload_rejects_unknown_type():
    with pytest.raises(BadRequestError, match="Only PDF and image files"):
        validate_media_upload("file.exe", "application/octet-stream")


def test_validate_media_upload_accepts_png():
    assert validate_media_upload("scan.png", "image/png") == "scan.png"


def test_validate_advisor_upload_accepts_pdf():
    validate_advisor_upload("doc.pdf", "application/pdf")


def test_validate_advisor_upload_rejects_webp():
    with pytest.raises(BadRequestError, match="Only PDF, PNG, JPG allowed"):
        validate_advisor_upload("image.webp", "image/webp")


def test_check_payload_size_rejects_large_file():
    with pytest.raises(PayloadTooLargeError, match="exceeds"):
        check_payload_size(b"x" * (11 * 1024 * 1024), max_mb=10)


def test_validate_pdf_page_count():
    with pytest.raises(BadRequestError, match="no pages"):
        validate_pdf_page_count(0, 50)
    with pytest.raises(BadRequestError, match="exceeds maximum"):
        validate_pdf_page_count(51, 50)


def test_is_pdf_and_require_pdf_only():
    assert is_pdf("application/pdf", "doc.pdf") is True
    with pytest.raises(BadRequestError, match="Only PDF files are supported"):
        require_pdf_only("scan.png", "image/png")


def test_reject_pdf_for_image_endpoint():
    with pytest.raises(BadRequestError, match="for PDF uploads"):
        reject_pdf_for_image_endpoint("doc.pdf", "application/pdf", endpoint="POST /vlm/pdf/analyze/")
