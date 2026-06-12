from typing import Any

from pydantic import BaseModel, Field


class V2Envelope(BaseModel):
    object: str
    id: str | None = None
    created_at: str | None = None
    request_id: str | None = None
    data: dict[str, Any]

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "object": "ocr_job",
                    "id": "job_660e8400-e29b-41d4-a716-446655440001",
                    "created_at": "2026-06-12T10:00:00+00:00",
                    "request_id": "abc123def456",
                    "data": {
                        "status": "queued",
                        "job_type": "production",
                        "pages_processed": 0,
                        "result": None,
                        "error_message": None,
                    },
                }
            ]
        }
    }


class OcrJobCreateV2(BaseModel):
    document_id: str = Field(description="Document id (doc_<uuid> or raw uuid)")
    tier_slug: str | None = None
    webhook_url: str | None = None

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "document_id": "doc_550e8400-e29b-41d4-a716-446655440000",
                    "tier_slug": "basic",
                    "webhook_url": "https://example.com/hooks/ocr",
                }
            ]
        }
    }
