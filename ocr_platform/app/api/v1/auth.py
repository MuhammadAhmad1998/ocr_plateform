import uuid

from fastapi import APIRouter, Depends, status

from app.core.config import get_settings
from app.core.exceptions import AuthorizationError
from sqlalchemy.orm import Session

from app.accounts.models import SubscriptionProfile, User
from app.accounts.schemas import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserResponse
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import AuthenticationError, ConflictError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.registry.models import Tier

router = APIRouter(prefix="/auth", tags=["auth"])


def _ensure_public_auth_enabled() -> None:
    if get_settings().DISABLE_PUBLIC_AUTH:
        raise AuthorizationError("Public authentication is disabled for this deployment")


@router.post("/register/", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    _ensure_public_auth_enabled()
    if db.query(User).filter(User.email == data.email).first():
        raise ConflictError("Email already registered")

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
    )
    db.add(user)
    db.flush()

    free_tier = db.query(Tier).filter(Tier.slug == "free").first()
    sub = SubscriptionProfile(
        user_id=user.id,
        tier_id=free_tier.id if free_tier else None,
        quota_limit=free_tier.quota_limit if free_tier else 50,
    )
    db.add(sub)
    db.commit()

    return TokenResponse(
        access_token=create_access_token(user.email),
        refresh_token=create_refresh_token(user.email),
    )


@router.post("/login/", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    _ensure_public_auth_enabled()
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise AuthenticationError("Invalid credentials")
    return TokenResponse(
        access_token=create_access_token(user.email),
        refresh_token=create_refresh_token(user.email),
    )


@router.post("/refresh/", response_model=TokenResponse)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    _ensure_public_auth_enabled()
    payload = decode_token(data.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise AuthenticationError("Invalid refresh token")
    email = payload.get("sub")
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise AuthenticationError("User not found")
    return TokenResponse(
        access_token=create_access_token(user.email),
        refresh_token=create_refresh_token(user.email),
    )


@router.get("/me/", response_model=UserResponse)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = user.subscription
    tier_info = None
    if sub and sub.tier_id:
        tier = db.query(Tier).filter(Tier.id == sub.tier_id).first()
        if tier:
            tier_info = {
                "slug": tier.slug,
                "public_name": tier.public_name,
                "quota_limit": sub.quota_limit,
                "quota_used": sub.quota_used,
            }
    return UserResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        subscription=tier_info,
    )
