from pydantic import BaseModel


class DemoRunRequest(BaseModel):
    session_id: str
    webhook_url: str | None = None


class DemoRunResponse(BaseModel):
    job_id: str
    status: str
    request_id: str | None = None
    created_at: str | None = None


class OcrResultResponse(BaseModel):
    job_id: str
    status: str
    text: str | None = None
    layout: dict | None = None
    confidence: float | None = None
    timing_ms: int | None = None
    error: str | None = None


class OcrJobCreate(BaseModel):
    document_id: str
    tier_slug: str | None = None
    webhook_url: str | None = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "document_id": "550e8400-e29b-41d4-a716-446655440000",
                    "tier_slug": "basic",
                    "webhook_url": "https://example.com/hooks/ocr",
                }
            ]
        }
    }


class OcrJobResponse(BaseModel):
    id: str
    status: str
    job_type: str
    pages_processed: int
    result: dict | None = None
    error_message: str | None = None
    request_id: str | None = None
    created_at: str | None = None

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": "660e8400-e29b-41d4-a716-446655440001",
                    "status": "queued",
                    "job_type": "production",
                    "pages_processed": 0,
                    "result": None,
                    "error_message": None,
                    "request_id": "abc123def456",
                    "created_at": "2026-06-12T10:00:00+00:00",
                }
            ]
        },
    }
