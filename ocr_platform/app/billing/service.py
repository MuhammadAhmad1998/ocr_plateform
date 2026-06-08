import hashlib
import secrets
import uuid

from sqlalchemy.orm import Session

from app.accounts.models import SubscriptionProfile, User
from app.core.config import get_settings
from app.registry.models import Tier

settings = get_settings()


class BillingService:
    def __init__(self) -> None:
        self.stripe = None
        if settings.STRIPE_SECRET_KEY:
            import stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            self.stripe = stripe

    def create_checkout(self, db: Session, user: User, tier_slug: str) -> dict:
        tier = db.query(Tier).filter(Tier.slug == tier_slug).first()
        if not tier:
            raise ValueError("Invalid tier")

        if not self.stripe or not tier.stripe_price_id:
            return {
                "checkout_url": f"http://localhost:3000/checkout?mock=true&tier={tier_slug}",
                "session_id": f"mock_{uuid.uuid4().hex}",
            }

        sub = user.subscription
        customer_id = sub.stripe_customer_id if sub else None
        if not customer_id:
            customer = self.stripe.Customer.create(email=user.email, metadata={"user_id": str(user.id)})
            customer_id = customer.id
            if sub:
                sub.stripe_customer_id = customer_id
                db.commit()

        session = self.stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": tier.stripe_price_id, "quantity": 1}],
            success_url="http://localhost:3000/dashboard?checkout=success",
            cancel_url="http://localhost:3000/checkout?cancelled=true",
            metadata={"user_id": str(user.id), "tier_slug": tier_slug},
        )
        return {"checkout_url": session.url, "session_id": session.id}

    def get_portal_url(self, db: Session, user: User) -> str:
        if not self.stripe or not user.subscription or not user.subscription.stripe_customer_id:
            return "http://localhost:3000/dashboard?portal=mock"
        session = self.stripe.billing_portal.Session.create(
            customer=user.subscription.stripe_customer_id,
            return_url="http://localhost:3000/dashboard",
        )
        return session.url

    def handle_webhook(self, db: Session, payload: bytes, sig_header: str) -> dict:
        if not settings.STRIPE_WEBHOOK_SECRET or not self.stripe:
            return {"status": "mock_processed"}

        event = self.stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            user_id = session["metadata"].get("user_id")
            tier_slug = session["metadata"].get("tier_slug")
            if user_id and tier_slug:
                self._activate_subscription(db, uuid.UUID(user_id), tier_slug, session.get("subscription"))
        return {"status": "processed"}

    def _activate_subscription(
        self, db: Session, user_id: uuid.UUID, tier_slug: str, stripe_sub_id: str | None
    ) -> None:
        tier = db.query(Tier).filter(Tier.slug == tier_slug).first()
        sub = db.query(SubscriptionProfile).filter(SubscriptionProfile.user_id == user_id).first()
        if sub and tier:
            sub.tier_id = tier.id
            sub.quota_limit = tier.quota_limit
            sub.stripe_subscription_id = stripe_sub_id
            sub.status = "active"
            db.commit()


def generate_api_key() -> tuple[str, str, str]:
    raw = f"ocr_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    prefix = raw[:12]
    return raw, key_hash, prefix


billing_service = BillingService()
