from pydantic import BaseModel


class CheckoutRequest(BaseModel):
    tier_slug: str


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


class PortalResponse(BaseModel):
    portal_url: str
