"""Authenticate AI Platform server calls to /internal/* endpoints."""

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import get_settings
from app.core.exceptions import AuthenticationError

_platform_security = HTTPBearer(auto_error=False)


def verify_platform_api_key(
    credentials: HTTPAuthorizationCredentials | None = Depends(_platform_security),
) -> None:
    settings = get_settings()
    if not settings.PLATFORM_API_KEY:
        raise AuthenticationError("Platform integration is not configured")

    if not credentials or credentials.credentials != settings.PLATFORM_API_KEY:
        raise AuthenticationError("Invalid platform API key")
