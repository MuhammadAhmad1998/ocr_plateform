from pydantic import BaseModel


class DemoRunRequest(BaseModel):
    session_id: str


class DemoRunResponse(BaseModel):
    job_id: str
    status: str


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


class OcrJobResponse(BaseModel):
    id: str
    status: str
    job_type: str
    pages_processed: int
    result: dict | None = None
    error_message: str | None = None

    model_config = {"from_attributes": True}
