"""Admin API endpoints for super admin users."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.accounts.models import ApiKey, SubscriptionProfile, User
from app.billing.models import StripeEvent
from app.core.config import get_settings
from app.core.database import get_db
from app.core.dependencies import require_super_admin
from app.core.exceptions import NotFoundError, ValidationError
from app.ocr_engine.models import OcrJob, UsageEvent
from app.registry.models import Tier

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_super_admin)])

_PAID_TIER_SLUGS = {"basic", "pro", "enterprise"}


@router.get("/stats/")
def get_platform_stats(db: Session = Depends(get_db)) -> dict[str, Any]:
    """Get platform-wide statistics."""
    total_users = db.query(func.count(User.id)).scalar()
    active_users = db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar()
    
    # Users by role
    regular_users = db.query(func.count(User.id)).filter(User.role == "user").scalar()
    super_admins = db.query(func.count(User.id)).filter(User.role == "super_admin").scalar()
    
    # Platform vs direct users
    platform_users = db.query(func.count(User.id)).filter(User.platform_account_id.isnot(None)).scalar()
    direct_users = db.query(func.count(User.id)).filter(User.platform_account_id.is_(None)).scalar()
    
    # Signups in last 7 days
    seven_days_ago = datetime.now(UTC) - timedelta(days=7)
    recent_signups = db.query(func.count(User.id)).filter(User.created_at >= seven_days_ago).scalar()
    
    # Jobs in last 24 hours
    twenty_four_hours_ago = datetime.now(UTC) - timedelta(hours=24)
    recent_jobs = db.query(func.count(OcrJob.id)).filter(OcrJob.created_at >= twenty_four_hours_ago).scalar()
    queued_jobs = db.query(func.count(OcrJob.id)).filter(OcrJob.status == "queued").scalar()
    running_jobs = db.query(func.count(OcrJob.id)).filter(OcrJob.status == "processing").scalar()
    failed_jobs = db.query(func.count(OcrJob.id)).filter(
        OcrJob.status == "failed",
        OcrJob.created_at >= twenty_four_hours_ago
    ).scalar()
    
    # Total pages processed this month
    first_of_month = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    pages_this_month = db.query(func.sum(UsageEvent.pages)).filter(
        UsageEvent.created_at >= first_of_month
    ).scalar() or 0
    
    # Users per tier
    tiers = db.query(Tier).all()
    users_by_tier = {}
    for tier in tiers:
        count = db.query(func.count(SubscriptionProfile.id)).filter(
            SubscriptionProfile.tier_id == tier.id
        ).scalar()
        users_by_tier[tier.slug] = {
            "name": tier.public_name,
            "count": count,
        }

    # Billing / Stripe summary
    settings = get_settings()
    paid_tiers = [t for t in tiers if t.slug in _PAID_TIER_SLUGS]
    paid_tiers_with_price = [t for t in paid_tiers if t.stripe_price_id]

    billing_summary = {
        "stripe_configured": bool(settings.STRIPE_SECRET_KEY),
        "webhook_configured": bool(settings.STRIPE_WEBHOOK_SECRET),
        "paid_tiers_total": len(paid_tiers),
        "paid_tiers_with_stripe_price": len(paid_tiers_with_price),
        "stripe_customers": db.query(func.count(SubscriptionProfile.id)).filter(
            SubscriptionProfile.stripe_customer_id.isnot(None)
        ).scalar(),
        "active_stripe_subscriptions": db.query(func.count(SubscriptionProfile.id)).filter(
            SubscriptionProfile.stripe_subscription_id.isnot(None),
            SubscriptionProfile.status == "active",
        ).scalar(),
        "past_due_subscriptions": db.query(func.count(SubscriptionProfile.id)).filter(
            SubscriptionProfile.status == "past_due"
        ).scalar(),
        "canceled_subscriptions": db.query(func.count(SubscriptionProfile.id)).filter(
            SubscriptionProfile.status.in_(["canceled", "cancelled"])
        ).scalar(),
        "webhook_events_processed": db.query(func.count(StripeEvent.id)).scalar(),
    }
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "regular_users": regular_users,
        "super_admins": super_admins,
        "platform_users": platform_users,
        "direct_users": direct_users,
        "signups_last_7_days": recent_signups,
        "jobs_last_24h": recent_jobs,
        "queued_jobs": queued_jobs,
        "running_jobs": running_jobs,
        "failed_jobs_24h": failed_jobs,
        "pages_this_month": pages_this_month,
        "users_by_tier": users_by_tier,
        "billing_summary": billing_summary,
    }


@router.get("/tiers/")
def list_tiers(db: Session = Depends(get_db)) -> dict[str, Any]:
    """List all tiers with Stripe price configuration and subscriber counts."""
    tiers = db.query(Tier).order_by(Tier.quota_limit).all()
    tier_data = []
    for tier in tiers:
        user_count = db.query(func.count(SubscriptionProfile.id)).filter(
            SubscriptionProfile.tier_id == tier.id
        ).scalar()
        tier_data.append({
            "slug": tier.slug,
            "name": tier.public_name,
            "description": tier.description,
            "quota_limit": tier.quota_limit,
            "is_active": tier.is_active,
            "stripe_price_id": tier.stripe_price_id,
            "stripe_configured": bool(tier.stripe_price_id),
            "is_paid_tier": tier.slug in _PAID_TIER_SLUGS,
            "user_count": user_count,
        })
    return {"tiers": tier_data}


@router.get("/users/")
def list_users(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    active_only: bool = Query(False),
    tier_slug: str | None = Query(None),
    search: str | None = Query(None),
) -> dict[str, Any]:
    """List all users with pagination and filters."""
    query = db.query(User)
    
    if active_only:
        query = query.filter(User.is_active.is_(True))
    
    if search:
        query = query.filter(
            (User.email.ilike(f"%{search}%")) | (User.full_name.ilike(f"%{search}%"))
        )
    
    if tier_slug:
        tier = db.query(Tier).filter(Tier.slug == tier_slug).first()
        if tier:
            user_ids = db.query(SubscriptionProfile.user_id).filter(
                SubscriptionProfile.tier_id == tier.id
            ).all()
            user_ids_list = [uid[0] for uid in user_ids]
            query = query.filter(User.id.in_(user_ids_list))
    
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    users_data = []
    for user in users:
        sub = user.subscription
        tier_info = None
        if sub and sub.tier_id:
            tier = db.query(Tier).filter(Tier.id == sub.tier_id).first()
            if tier:
                tier_info = {
                    "slug": tier.slug,
                    "name": tier.public_name,
                    "quota_used": sub.quota_used,
                    "quota_limit": sub.quota_limit,
                    "status": sub.status,
                    "has_stripe_customer": bool(sub.stripe_customer_id),
                    "has_stripe_subscription": bool(sub.stripe_subscription_id),
                }
        
        # Count API keys
        api_key_count = db.query(func.count(ApiKey.id)).filter(
            ApiKey.user_id == user.id,
            ApiKey.is_active.is_(True)
        ).scalar()
        
        # Jobs this month
        first_of_month = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        jobs_this_month = db.query(func.count(OcrJob.id)).filter(
            OcrJob.user_id == user.id,
            OcrJob.created_at >= first_of_month
        ).scalar()
        
        # Last active (latest job or API key usage)
        last_job = db.query(OcrJob.created_at).filter(OcrJob.user_id == user.id).order_by(
            OcrJob.created_at.desc()
        ).first()
        last_key_use = db.query(ApiKey.last_used_at).filter(
            ApiKey.user_id == user.id,
            ApiKey.last_used_at.isnot(None)
        ).order_by(ApiKey.last_used_at.desc()).first()
        
        last_active = None
        if last_job and last_key_use:
            last_active = max(last_job[0], last_key_use[0])
        elif last_job:
            last_active = last_job[0]
        elif last_key_use:
            last_active = last_key_use[0]
        
        users_data.append({
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "is_platform_user": user.platform_account_id is not None,
            "created_at": user.created_at.isoformat(),
            "tier": tier_info,
            "api_key_count": api_key_count,
            "jobs_this_month": jobs_this_month,
            "last_active": last_active.isoformat() if last_active else None,
        })
    
    return {
        "users": users_data,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/users/{user_id}")
def get_user_detail(user_id: str, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Get detailed information about a specific user."""
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise ValidationError("Invalid user ID format")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise NotFoundError("User not found")
    
    # Subscription info
    sub = user.subscription
    subscription_info = None
    if sub:
        tier = None
        if sub.tier_id:
            tier = db.query(Tier).filter(Tier.id == sub.tier_id).first()
        
        subscription_info = {
            "tier_slug": tier.slug if tier else None,
            "tier_name": tier.public_name if tier else None,
            "quota_used": sub.quota_used,
            "quota_limit": sub.quota_limit,
            "status": sub.status,
            "stripe_customer_id": sub.stripe_customer_id,
            "stripe_subscription_id": sub.stripe_subscription_id,
            "stripe_price_id": tier.stripe_price_id if tier else None,
            "updated_at": sub.updated_at.isoformat() if sub.updated_at else None,
        }
    
    # API keys
    api_keys = db.query(ApiKey).filter(ApiKey.user_id == user.id).all()
    api_keys_data = [
        {
            "id": str(key.id),
            "name": key.name,
            "key_prefix": key.key_prefix,
            "scopes": key.scopes,
            "is_active": key.is_active,
            "last_used_at": key.last_used_at.isoformat() if key.last_used_at else None,
            "created_at": key.created_at.isoformat(),
        }
        for key in api_keys
    ]
    
    # Recent jobs (last 20)
    recent_jobs = db.query(OcrJob).filter(OcrJob.user_id == user.id).order_by(
        OcrJob.created_at.desc()
    ).limit(20).all()
    
    recent_jobs_data = [
        {
            "id": str(job.id),
            "status": job.status,
            "job_type": job.job_type,
            "pages_processed": job.pages_processed,
            "compute_seconds": job.compute_seconds,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            "error_message": job.error_message,
        }
        for job in recent_jobs
    ]
    
    # Usage stats
    first_of_month = datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    jobs_this_month = db.query(func.count(OcrJob.id)).filter(
        OcrJob.user_id == user.id,
        OcrJob.created_at >= first_of_month
    ).scalar()
    
    pages_this_month = db.query(func.sum(UsageEvent.pages)).filter(
        UsageEvent.user_id == user.id,
        UsageEvent.created_at >= first_of_month
    ).scalar() or 0
    
    total_compute_seconds = db.query(func.sum(OcrJob.compute_seconds)).filter(
        OcrJob.user_id == user.id
    ).scalar() or 0
    
    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
        "is_platform_user": user.platform_account_id is not None,
        "platform_account_id": str(user.platform_account_id) if user.platform_account_id else None,
        "created_at": user.created_at.isoformat(),
        "subscription": subscription_info,
        "api_keys": api_keys_data,
        "recent_jobs": recent_jobs_data,
        "usage_stats": {
            "jobs_this_month": jobs_this_month,
            "pages_this_month": pages_this_month,
            "total_compute_seconds": total_compute_seconds,
        },
    }


@router.patch("/users/{user_id}/activate")
def activate_user(user_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    """Activate a user account."""
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise ValidationError("Invalid user ID format")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise NotFoundError("User not found")
    
    user.is_active = True
    db.commit()
    
    return {"message": f"User {user.email} activated"}


@router.patch("/users/{user_id}/deactivate")
def deactivate_user(user_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    """Deactivate a user account."""
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise ValidationError("Invalid user ID format")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise NotFoundError("User not found")
    
    if user.role == "super_admin":
        raise ValidationError("Cannot deactivate a super admin")
    
    user.is_active = False
    db.commit()
    
    return {"message": f"User {user.email} deactivated"}


@router.patch("/users/{user_id}/quota")
def update_user_quota(
    user_id: str,
    quota_limit: int = Query(..., ge=0),
    db: Session = Depends(get_db)
) -> dict[str, str]:
    """Update a user's quota limit."""
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise ValidationError("Invalid user ID format")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise NotFoundError("User not found")
    
    sub = user.subscription
    if not sub:
        raise NotFoundError("User has no subscription profile")
    
    sub.quota_limit = quota_limit
    db.commit()
    
    return {"message": f"Quota limit updated to {quota_limit} for {user.email}"}


@router.patch("/users/{user_id}/tier")
def update_user_tier(
    user_id: str,
    tier_slug: str = Query(...),
    db: Session = Depends(get_db)
) -> dict[str, str]:
    """Update a user's tier."""
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise ValidationError("Invalid user ID format")
    
    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        raise NotFoundError("User not found")
    
    tier = db.query(Tier).filter(Tier.slug == tier_slug).first()
    if not tier:
        raise NotFoundError(f"Tier '{tier_slug}' not found")
    
    sub = user.subscription
    if not sub:
        raise NotFoundError("User has no subscription profile")
    
    sub.tier_id = tier.id
    sub.quota_limit = tier.quota_limit
    db.commit()
    
    return {"message": f"User {user.email} moved to tier {tier.public_name}"}


@router.delete("/users/{user_id}/api-keys/{key_id}")
def revoke_api_key(user_id: str, key_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    """Revoke a user's API key."""
    try:
        user_uuid = uuid.UUID(user_id)
        key_uuid = uuid.UUID(key_id)
    except ValueError:
        raise ValidationError("Invalid ID format")
    
    api_key = db.query(ApiKey).filter(
        ApiKey.id == key_uuid,
        ApiKey.user_id == user_uuid
    ).first()
    
    if not api_key:
        raise NotFoundError("API key not found")
    
    api_key.is_active = False
    db.commit()
    
    return {"message": f"API key {api_key.key_prefix}... revoked"}
