from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_PROJECT_ROOT = Path(__file__).resolve().parents[3]
_OCR_PLATFORM_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(_PROJECT_ROOT / ".env"),
            str(_OCR_PLATFORM_ROOT / ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Unified OCR Platform"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    DATABASE_URL: str = "postgresql://ocr:ocr@localhost:5432/ocr_platform"
    REDIS_URL: str = "redis://localhost:6379/0"

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET: str = "ocr-platform-uploads"
    USE_LOCAL_STORAGE: bool = True
    LOCAL_STORAGE_PATH: str = "./storage"

    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4o-mini"

    PINECONE_API_KEY: str = ""
    PINECONE_INDEX: str = "ocr-knowledge"
    USE_MOCK_RAG: bool = True

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""

    CORS_ORIGINS: str = "http://localhost:3000"

    MAX_UPLOAD_SIZE_MB: int = 10
    DEMO_RUNS_PER_SESSION: int = 1
    UPLOADS_PER_SESSION: int = 1

    VLM_ENABLED: bool = True
    VLM_MODEL_ID: str = "openbmb/MiniCPM-V-4_5"
    VLM_ATTN_IMPLEMENTATION: str = "sdpa"
    VLM_TORCH_DTYPE: str = "bfloat16"
    VLM_DEVICE: str = "cuda"
    VLM_PDF_DPI: int = 144
    VLM_MAX_PDF_PAGES: int = 50
    VLM_EAGER_LOAD: bool = False

    PADDLE_OCR_ENABLED: bool = True
    PADDLE_OCR_MODEL_ID: str = "PaddlePaddle/PaddleOCR-VL"
    PADDLE_OCR_TORCH_DTYPE: str = "bfloat16"
    PADDLE_OCR_DEVICE: str = "cuda"
    PADDLE_OCR_MAX_NEW_TOKENS: int = 1024
    PADDLE_OCR_PDF_DPI: int = 144
    PADDLE_OCR_MAX_PDF_PAGES: int = 50
    PADDLE_OCR_EAGER_LOAD: bool = False

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
