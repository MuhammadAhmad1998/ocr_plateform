from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.billing.schemas import CheckoutRequest, CheckoutResponse, PortalResponse
from app.billing.service import billing_service
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.idempotency import (
    check_idempotency,
    hash_request_body,
    normalize_idempotency_key,
    save_idempotency,
)

router = APIRouter(prefix="/billing", tags=["billing"])

CHECKOUT_ENDPOINT = "POST /api/v1/billing/checkout/"


@router.post("/checkout/", response_model=CheckoutResponse)
def create_checkout(
    data: CheckoutRequest,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    idempotency_key = normalize_idempotency_key(request.headers.get("Idempotency-Key"))
    request_body = data.model_dump()
    request_hash = hash_request_body(request_body)

    if idempotency_key:
        replay = check_idempotency(
            db,
            user_id=user.id,
            endpoint=CHECKOUT_ENDPOINT,
            key=idempotency_key,
            request_hash=request_hash,
        )
        if replay:
            body, status_code = replay
            return JSONResponse(content=body, status_code=status_code)

    result = billing_service.create_checkout(db, user, data.tier_slug)
    response = CheckoutResponse(**result)
    if idempotency_key:
        save_idempotency(
            db,
            user_id=user.id,
            endpoint=CHECKOUT_ENDPOINT,
            key=idempotency_key,
            request_hash=request_hash,
            response_body=response.model_dump(),
            status_code=200,
        )
    return response


@router.get("/portal/", response_model=PortalResponse)
def customer_portal(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    url = billing_service.get_portal_url(db, user)
    return PortalResponse(portal_url=url)


@router.post("/webhook/")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    result = billing_service.handle_webhook(db, payload, sig)
    return result
