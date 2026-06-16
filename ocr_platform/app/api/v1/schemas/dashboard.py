from pydantic import BaseModel


class UsageResponse(BaseModel):
    quota_used: int
    quota_limit: int
    tier_slug: str | None
    tier_name: str | None
    jobs_this_month: int


class ApiKeyCreate(BaseModel):
    name: str = "Default"
    scopes: list[str] | None = None


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    scopes: list[str]
    is_active: bool
    created_at: str

    model_config = {"from_attributes": True}


class ApiKeyCreatedResponse(ApiKeyResponse):
    key: str


class JobHistoryItem(BaseModel):
    id: str
    status: str
    job_type: str
    pages_processed: int
    created_at: str
    completed_at: str | None
