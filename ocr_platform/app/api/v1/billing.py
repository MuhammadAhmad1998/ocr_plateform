from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.accounts.models import User
from app.billing.schemas import CheckoutRequest, CheckoutResponse, PortalResponse
from app.billing.service import billing_service
from app.core.database import get_db
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/checkout/", response_model=CheckoutResponse)
def create_checkout(
    data: CheckoutRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = billing_service.create_checkout(db, user, data.tier_slug)
    return CheckoutResponse(**result)


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
