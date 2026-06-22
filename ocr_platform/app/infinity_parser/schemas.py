from typing import Literal

from pydantic import BaseModel, Field

InfinityTaskType = Literal["doc2md", "doc2json", "custom"]


class InfinityParserResponse(BaseModel):
    filename: str | None = None
    task_type: InfinityTaskType
    prompt: str
    result: str
    processing_time_ms: float


class InfinityParserPageResult(BaseModel):
    page_number: int = Field(ge=1)
    task_type: InfinityTaskType
    prompt: str
    result: str
    processing_time_ms: float


class InfinityParserPdfResponse(BaseModel):
    filename: str
    total_pages: int = Field(ge=1)
    task_type: InfinityTaskType
    prompt: str
    pages: list[InfinityParserPageResult]
    total_processing_time_ms: float
