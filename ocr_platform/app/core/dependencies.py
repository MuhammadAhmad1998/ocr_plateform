import hashlib

from fastapi import Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.accounts.models import ApiKey, User
from app.core.database import get_db
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import decode_token

security = HTTPBearer(auto_error=False)

VALID_API_KEY_SCOPES = frozenset({"ocr:read", "ocr:write"})
DEFAULT_API_KEY_SCOPES = ["ocr:read", "ocr:write"]


def _set_request_user(request: Request, user: User) -> None:
    request.state.user_id = str(user.id)


def _user_from_jwt(token: str, db: Session) -> User | None:
    payload = decode_token(token)
    if not payload:
        return None
    if payload.get("type") != "access":
        raise AuthenticationError("Invalid token")
    user = db.query(User).filter(User.email == payload.get("sub")).first()
    if not user:
        raise AuthenticationError("User not found")
    if not user.is_active:
        raise AuthenticationError("Account is inactive")
    return user


def _user_from_api_key(raw_key: str, db: Session) -> tuple[User, ApiKey]:
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()
    api_key = (
        db.query(ApiKey)
        .filter(ApiKey.key_hash == key_hash, ApiKey.is_active.is_(True))
        .first()
    )
    if not api_key:
        raise AuthenticationError("Invalid API key")
    user = db.query(User).filter(User.id == api_key.user_id).first()
    if not user:
        raise AuthenticationError("User not found")
    if not user.is_active:
        raise AuthenticationError("Account is inactive")
    return user, api_key


def _effective_api_key_scopes(api_key: ApiKey) -> list[str]:
    if not api_key.scopes:
        return list(DEFAULT_API_KEY_SCOPES)
    return list(api_key.scopes)


def require_api_key_scope(request: Request, scope: str) -> None:
    """Enforce scope when the request was authenticated with an API key."""
    api_key = getattr(request.state, "api_key", None)
    if api_key is None:
        return
    scopes = _effective_api_key_scopes(api_key)
    if scope not in scopes:
        raise AuthorizationError(f"API key missing required scope: {scope}")


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise AuthenticationError("Not authenticated")
    user = _user_from_jwt(credentials.credentials, db)
    if not user:
        raise AuthenticationError("Invalid token")
    _set_request_user(request, user)
    return user


def get_current_user_or_api_key(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    x_api_key: str | None = Header(None, alias="x-api-key"),
    db: Session = Depends(get_db),
) -> User:
    bearer_token = credentials.credentials if credentials else None
    api_key_value = (x_api_key or "").strip() or bearer_token

    if bearer_token:
        user = _user_from_jwt(bearer_token, db)
        if user:
            request.state.auth_method = "jwt"
            _set_request_user(request, user)
            return user

    if api_key_value:
        user, api_key = _user_from_api_key(api_key_value, db)
        request.state.auth_method = "api_key"
        request.state.api_key = api_key
        _set_request_user(request, user)
        return user

    raise AuthenticationError("Not authenticated")
