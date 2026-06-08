from pydantic import BaseModel, Field


class VLMChatResponse(BaseModel):
    filename: str | None = None
    question: str
    answer: str
    enable_thinking: bool = False
    processing_time_ms: float


class VLMPageResult(BaseModel):
    page_number: int = Field(ge=1)
    question: str
    answer: str
    processing_time_ms: float


class VLMPdfResponse(BaseModel):
    filename: str
    total_pages: int = Field(ge=1)
    question: str
    enable_thinking: bool = False
    pages: list[VLMPageResult]
    total_processing_time_ms: float


class VLMHistoryMessage(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str


class VLMMultiTurnRequest(BaseModel):
    question: str
    history: list[VLMHistoryMessage] = Field(default_factory=list)
    enable_thinking: bool = False


class VLMMultiTurnResponse(BaseModel):
    question: str
    answer: str
    history: list[VLMHistoryMessage]
    enable_thinking: bool = False
    processing_time_ms: float
