from pydantic import BaseModel, Field


class SessionCreate(BaseModel):
    document_id: str | None = None


class SessionResponse(BaseModel):
    id: str
    phase: str
    document_id: str | None
    demo_run_count: int
    recommendation: dict | None = None

    model_config = {"from_attributes": True}


class MessageRequest(BaseModel):
    session_id: str
    content: str = Field(min_length=1, max_length=4000)


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    metadata: dict | None = None

    model_config = {"from_attributes": True}


class DocumentResponse(BaseModel):
    id: str
    filename: str
    content_type: str
    fingerprint: dict
    page_count: int
    preview_url: str | None = None

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "examples": [
                {
                    "id": "550e8400-e29b-41d4-a716-446655440000",
                    "filename": "invoice.pdf",
                    "content_type": "application/pdf",
                    "fingerprint": {"type": "pdf", "page_count": 2},
                    "page_count": 2,
                    "preview_url": "http://localhost:8000/storage/uploads/abc_invoice.pdf",
                }
            ]
        },
    }


class DocumentListResponse(BaseModel):
    data: list[DocumentResponse]
    has_more: bool

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "data": [
                        {
                            "id": "550e8400-e29b-41d4-a716-446655440000",
                            "filename": "invoice.pdf",
                            "content_type": "application/pdf",
                            "fingerprint": {"type": "pdf", "page_count": 2},
                            "page_count": 2,
                            "preview_url": "http://localhost:8000/storage/uploads/abc_invoice.pdf",
                        }
                    ],
                    "has_more": False,
                }
            ]
        },
    }


class RecommendationPayload(BaseModel):
    primary_tier: str
    alternative_tier: str
    primary_reasons: list[str]
    alternative_reasons: list[str]
    selected_engine: str
    demo_tier: str
