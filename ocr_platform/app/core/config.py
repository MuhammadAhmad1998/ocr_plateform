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
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    API_V2_PREFIX: str = "/api/v2"

    DEFAULT_SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"

    DATABASE_URL: str = "postgresql://ocr:ocr@localhost:5432/ocr_platform"
    REDIS_URL: str = "redis://localhost:6379/0"

    RATE_LIMIT_ENABLED: bool = False
    RATE_LIMIT_REQUESTS: int = 60
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_REQUESTS_FREE: int = 30
    RATE_LIMIT_REQUESTS_BASIC: int = 60
    RATE_LIMIT_REQUESTS_PRO: int = 120
    RATE_LIMIT_REQUESTS_ENTERPRISE: int = 300

    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    S3_BUCKET: str = "ocr-platform-uploads"
    USE_LOCAL_STORAGE: bool = True
    LOCAL_STORAGE_PATH: str = "./storage"

    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    LLM_PROVIDER: str = "openai"  # openai | groq
    LLM_MODEL: str = "gpt-4o-mini"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    PINECONE_API_KEY: str = ""
    PINECONE_INDEX: str = "ocr-knowledge"
    USE_MOCK_RAG: bool = True
    RAG_COLLECTION_NAME: str = "ocr_knowledge"
    RAG_EMBEDDING_BACKEND: str = "fastembed"  # fastembed | huggingface
    RAG_EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    RAG_EMBEDDING_DEVICE: str = "cpu"
    RAG_TOP_K: int = 5

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    # Base URL of the frontend — used for Stripe success/cancel/portal redirects
    FRONTEND_URL: str = "http://localhost:3000"

    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    # Allow private-LAN frontend origins in dev (http://192.168.x.x:3000, etc.)
    CORS_ALLOW_LAN: bool = True

    # AI Platform marketplace integration
    PLATFORM_API_KEY: str = ""
    REQUIRE_API_KEY: bool = False
    DISABLE_PUBLIC_AUTH: bool = False
    PUBLIC_BASE_URL: str = "http://localhost:8000"
    STAGING_BASE_URL: str = "http://localhost:8000"

    # Super Admin bootstrap
    SUPER_ADMIN_EMAIL: str = ""
    SUPER_ADMIN_PASSWORD: str = ""

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
    PADDLE_OCR_MODEL_ID: str = "PaddlePaddle/PaddleOCR-VL-1.6"
    PADDLE_OCR_TORCH_DTYPE: str = "bfloat16"
    PADDLE_OCR_DEVICE: str = "cuda"
    PADDLE_OCR_MAX_NEW_TOKENS: int = 512
    PADDLE_OCR_PDF_DPI: int = 144
    PADDLE_OCR_MAX_PDF_PAGES: int = 50
    PADDLE_OCR_EAGER_LOAD: bool = False
    # Spotting task: upscale small images and use more pixels for better accuracy
    PADDLE_OCR_SPOTTING_UPSCALE_THRESHOLD: int = 1500
    PADDLE_OCR_SPOTTING_MAX_PIXELS: int = 2048 * 28 * 28  # ~1.6M pixels
    PADDLE_OCR_DEFAULT_MAX_PIXELS: int = 1280 * 28 * 28    # ~1.0M pixels

    QIANFAN_OCR_ENABLED: bool = True  # Requires transformers>=5.8.0
    QIANFAN_OCR_MODEL_ID: str = "baidu/Qianfan-OCR"
    QIANFAN_OCR_TORCH_DTYPE: str = "bfloat16"
    QIANFAN_OCR_DEVICE: str = "auto"
    QIANFAN_OCR_MAX_NEW_TOKENS: int = 512
    QIANFAN_OCR_PDF_DPI: int = 144
    QIANFAN_OCR_MAX_PDF_PAGES: int = 50
    QIANFAN_OCR_EAGER_LOAD: bool = False

    GOT_OCR_ENABLED: bool = True
    GOT_OCR_MODEL_ID: str = "ucaslcl/GOT-OCR2_0"
    GOT_OCR_DEVICE: str = "cuda"
    GOT_OCR_PDF_DPI: int = 144
    GOT_OCR_MAX_PDF_PAGES: int = 50
    GOT_OCR_EAGER_LOAD: bool = False

    INFINITY_PARSER_ENABLED: bool = True
    INFINITY_PARSER_MODEL_ID: str = "infly/Infinity-Parser2-Flash"
    INFINITY_PARSER_TORCH_DTYPE: str = "bfloat16"
    INFINITY_PARSER_DEVICE: str = "auto"
    INFINITY_PARSER_MAX_NEW_TOKENS: int = 8192
    INFINITY_PARSER_MIN_PIXELS: int = 2048
    INFINITY_PARSER_MAX_PIXELS: int = 16777216
    INFINITY_PARSER_PDF_DPI: int = 144
    INFINITY_PARSER_MAX_PDF_PAGES: int = 50
    INFINITY_PARSER_EAGER_LOAD: bool = False

    # Model memory management
    AUTO_UNLOAD_MODELS: bool = True  # Automatically unload models when switching

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def cors_origin_regex(self) -> str | None:
        """Regex for LAN dev frontends when explicit CORS_ORIGINS is not enough."""
        if not self.CORS_ALLOW_LAN:
            return None
        return (
            r"https?://("
            r"localhost|127\.0\.0\.1"
            r"|192\.168\.\d{1,3}\.\d{1,3}"
            r"|10\.\d{1,3}\.\d{1,3}\.\d{1,3}"
            r"|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}"
            r")(:\d+)?"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
