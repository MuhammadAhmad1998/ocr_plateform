from pydantic import BaseModel, Field


class QianfanOCRResponse(BaseModel):
    filename: str | None = None
    prompt: str
    result: str
    processing_time_ms: float


class QianfanOCRPageResult(BaseModel):
    page_number: int = Field(ge=1)
    prompt: str
    result: str
    processing_time_ms: float


class QianfanOCRPdfResponse(BaseModel):
    filename: str
    total_pages: int = Field(ge=1)
    prompt: str
    pages: list[QianfanOCRPageResult]
    total_processing_time_ms: float
