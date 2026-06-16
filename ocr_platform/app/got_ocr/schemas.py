from pydantic import BaseModel, Field


class GotOCRResponse(BaseModel):
    filename: str | None = None
    ocr_type: str
    result: str
    processing_time_ms: float


class GotOCRPageResult(BaseModel):
    page_number: int = Field(ge=1)
    ocr_type: str
    result: str
    processing_time_ms: float


class GotOCRPdfResponse(BaseModel):
    filename: str
    total_pages: int = Field(ge=1)
    ocr_type: str
    pages: list[GotOCRPageResult]
    total_processing_time_ms: float
