from pydantic import BaseModel


class DocumentResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    fingerprint: dict
    page_count: int
    preview_url: str | None = None


class DocumentListResponse(BaseModel):
    data: list[DocumentResponse]
    has_more: bool


class OcrJobCreate(BaseModel):
    document_id: str
    tier_slug: str | None = None
    webhook_url: str | None = None


class OcrJobResponse(BaseModel):
    id: str
    status: str
    job_type: str
    pages_processed: int
    result: dict | None = None
    error_message: str | None = None
    request_id: str | None = None
    created_at: str | None = None


class V2Envelope(BaseModel):
    object: str
    id: str | None = None
    created_at: str | None = None
    request_id: str | None = None
    data: dict
