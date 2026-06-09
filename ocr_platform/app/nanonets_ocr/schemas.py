from pydantic import BaseModel, Field


class NanonetsOCRResponse(BaseModel):
    filename: str | None = None
    prompt: str
    result: str
    processing_time_ms: float


class NanonetsOCRPageResult(BaseModel):
    page_number: int = Field(ge=1)
    prompt: str
    result: str
    processing_time_ms: float


class NanonetsOCRPdfResponse(BaseModel):
    filename: str
    total_pages: int = Field(ge=1)
    prompt: str
    pages: list[NanonetsOCRPageResult]
    total_processing_time_ms: float
