from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_SERVICE_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(_PROJECT_ROOT / ".env"),
            str(_SERVICE_ROOT / ".env"),
            ".env",
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "AI Service Platform — OCR API"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"
    API_V2_PREFIX: str = "/api/v2"

    DATABASE_URL: str = "postgresql://ocr:ocr@localhost:5432/ai_service_ocr"
    REDIS_URL: str = "redis://localhost:6379/1"

    PUBLIC_BASE_URL: str = "http://localhost:8004"
    STAGING_BASE_URL: str = "http://localhost:8004"

    CORS_ORIGINS: str = "*"
    MAX_UPLOAD_SIZE_MB: int = 10

    USE_LOCAL_STORAGE: bool = True
    LOCAL_STORAGE_PATH: str = "./storage"

    @property
    def cors_origins_list(self) -> list[str]:
        if self.CORS_ORIGINS.strip() == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
