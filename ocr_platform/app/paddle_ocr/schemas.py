from typing import Literal

from pydantic import BaseModel, Field

PaddleTaskType = Literal["ocr", "table", "chart", "formula"]


class PaddleOCRResponse(BaseModel):
    filename: str | None = None
    task: PaddleTaskType
    result: str
    processing_time_ms: float


class PaddleOCRPageResult(BaseModel):
    page_number: int = Field(ge=1)
    task: PaddleTaskType
    result: str
    processing_time_ms: float


class PaddleOCRPdfResponse(BaseModel):
    filename: str
    total_pages: int = Field(ge=1)
    task: PaddleTaskType
    pages: list[PaddleOCRPageResult]
    total_processing_time_ms: float
