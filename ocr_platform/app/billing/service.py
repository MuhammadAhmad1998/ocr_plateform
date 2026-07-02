"""Production-ready Stripe billing service.

Covers:
- Checkout Session creation (hosted Stripe Checkout)
- Customer Portal
- Webhook handling with full event suite and idempotency
  * checkout.session.completed     → activate subscription
  * customer.subscription.updated  → sync tier/status from Stripe price
  * customer.subscription.deleted  → downgrade to free, mark cancelled
  * invoice.paid                   → reset quota for billing period renewal
  * invoice.payment_failed         → set subscription status to past_due
"""

from __future__ import annotations

import hashlib
import logging
import secrets
import uuid

from sqlalchemy import exc as sa_exc
from sqlalchemy.orm import Session

from app.accounts.models import SubscriptionProfile, User
from app.billing.models import StripeEvent
from app.core.config import get_settings
from app.core.exceptions import BadRequestError, ExternalServiceError
from app.registry.models import Tier

logger = logging.getLogger(__name__)
settings = get_settings()

# Tiers that have a real Stripe price and require actual payment
_PAID_TIERS = {"basic", "pro", "enterprise"}


class BillingService:
    def __init__(self) -> None:
        self.stripe = None
        if settings.STRIPE_SECRET_KEY:
            import stripe

            stripe.api_key = settings.STRIPE_SECRET_KEY
            self.stripe = stripe

    # ── helpers ────────────────────────────────────────────────────────────

    def _frontend(self) -> str:
        """Return the configured frontend base URL (no trailing slash)."""
        return settings.FRONTEND_URL.rstrip("/")

    def _require_stripe(self) -> None:
        """Raise a service error when Stripe is not configured."""
        if not self.stripe:
            raise ExternalServiceError(
                "Payment provider is not configured on this server"
            )

    def _ensure_customer(self, db: Session, user: User) -> str:
        """Return the Stripe customer ID for *user*, creating one if needed."""
        sub = user.subscription
        if sub and sub.stripe_customer_id:
            return sub.stripe_customer_id

        customer = self.stripe.Customer.create(
            email=user.email,
            metadata={"user_id": str(user.id)},
        )
        if sub:
            sub.stripe_customer_id = customer.id
            db.commit()
        return customer.id

    def _tier_for_price(self, db: Session, price_id: str) -> Tier | None:
        """Look up a Tier by its Stripe price_id."""
        return db.query(Tier).filter(Tier.stripe_price_id == price_id).first()

    def _is_duplicate_event(self, db: Session, event_id: str, event_type: str) -> bool:
        """Return True and skip if this Stripe event was already processed."""
        try:
            db.add(StripeEvent(stripe_event_id=event_id, event_type=event_type))
            db.flush()
            return False
        except sa_exc.IntegrityError:
            db.rollback()
            logger.info("Stripe event %s already processed — skipping", event_id)
            return True

    # ── public API ─────────────────────────────────────────────────────────

    def create_checkout(self, db: Session, user: User, tier_slug: str) -> dict:
        if tier_slug not in _PAID_TIERS:
            raise BadRequestError(f"Tier '{tier_slug}' does not require a payment checkout")

        tier = db.query(Tier).filter(Tier.slug == tier_slug).first()
        if not tier:
            raise BadRequestError("Invalid tier")

        if not tier.stripe_price_id:
            raise BadRequestError(
                f"Tier '{tier_slug}' has no Stripe price configured. "
                "Set stripe_price_id via the admin panel before accepting payments."
            )

        if not self.stripe:
            # Dev fallback — mock redirect when Stripe is not wired up
            logger.warning("Stripe not configured — returning mock checkout URL")
            return {
                "checkout_url": f"{self._frontend()}/checkout?mock=true&tier={tier_slug}",
                "session_id": f"mock_{uuid.uuid4().hex}",
            }

        customer_id = self._ensure_customer(db, user)

        try:
            session = self.stripe.checkout.Session.create(
                customer=customer_id,
                mode="subscription",
                line_items=[{"price": tier.stripe_price_id, "quantity": 1}],
                success_url=f"{self._frontend()}/dashboard?checkout=success",
                cancel_url=f"{self._frontend()}/checkout?cancelled=true&tier={tier_slug}",
                metadata={"user_id": str(user.id), "tier_slug": tier_slug},
                allow_promotion_codes=True,
                billing_address_collection="auto",
            )
        except Exception as exc:
            logger.exception("Stripe checkout session creation failed: %s", exc)
            raise ExternalServiceError("Payment provider is temporarily unavailable") from exc

        return {"checkout_url": session.url, "session_id": session.id}

    def get_portal_url(self, db: Session, user: User) -> str:
        if not self.stripe:
            return f"{self._frontend()}/dashboard?portal=mock"

        if not user.subscription or not user.subscription.stripe_customer_id:
            raise BadRequestError("No active subscription or billing account found")

        try:
            session = self.stripe.billing_portal.Session.create(
                customer=user.subscription.stripe_customer_id,
                return_url=f"{self._frontend()}/dashboard",
            )
        except Exception as exc:
            logger.exception("Stripe portal session creation failed: %s", exc)
            raise ExternalServiceError("Payment provider is temporarily unavailable") from exc

        return session.url

    def handle_webhook(self, db: Session, payload: bytes, sig_header: str) -> dict:
        """Verify the Stripe signature and dispatch to the appropriate handler."""
        if not settings.STRIPE_WEBHOOK_SECRET or not self.stripe:
            # Dev: no webhook secret → accept and log but do not process
            logger.warning("Stripe webhook received but STRIPE_WEBHOOK_SECRET is not set — mock mode")
            return {"status": "mock_processed"}

        try:
            event = self.stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except self.stripe.error.SignatureVerificationError as exc:
            logger.warning("Stripe webhook signature verification failed: %s", exc)
            raise BadRequestError("Invalid webhook signature") from exc
        except Exception as exc:
            logger.exception("Stripe webhook payload parsing error: %s", exc)
            raise BadRequestError("Malformed webhook payload") from exc

        event_id = event["id"]
        event_type = event["type"]

        # Idempotency guard — Stripe retries on any non-2xx response
        if self._is_duplicate_event(db, event_id, event_type):
            return {"status": "already_processed"}

        obj = event["data"]["object"]

        try:
            if event_type == "checkout.session.completed":
                self._on_checkout_completed(db, obj)

            elif event_type in ("customer.subscription.created", "customer.subscription.updated"):
                self._on_subscription_updated(db, obj)

            elif event_type == "customer.subscription.deleted":
                self._on_subscription_deleted(db, obj)

            elif event_type == "invoice.paid":
                self._on_invoice_paid(db, obj)

            elif event_type == "invoice.payment_failed":
                self._on_invoice_payment_failed(db, obj)

            else:
                logger.debug("Unhandled Stripe event type: %s", event_type)

            db.commit()
        except Exception as exc:
            db.rollback()
            logger.exception("Error processing Stripe event %s (%s): %s", event_id, event_type, exc)
            raise ExternalServiceError("Webhook processing failed") from exc

        return {"status": "processed", "event_type": event_type}

    # ── webhook event handlers ─────────────────────────────────────────────

    def _on_checkout_completed(self, db: Session, session: dict) -> None:
        """Activate subscription after a successful checkout."""
        user_id_str = session.get("metadata", {}).get("user_id")
        tier_slug = session.get("metadata", {}).get("tier_slug")
        stripe_sub_id = session.get("subscription")

        if not user_id_str or not tier_slug:
            logger.warning("checkout.session.completed missing metadata — skipping")
            return

        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            logger.warning("checkout.session.completed invalid user_id: %s", user_id_str)
            return

        self._activate_subscription(db, user_id, tier_slug, stripe_sub_id)
        logger.info("Checkout completed: user=%s tier=%s sub=%s", user_id, tier_slug, stripe_sub_id)

    def _on_subscription_updated(self, db: Session, subscription: dict) -> None:
        """Sync tier and status when a Stripe subscription is created or updated.

        This handles plan upgrades/downgrades done through the Customer Portal.
        """
        stripe_sub_id = subscription.get("id")
        stripe_customer_id = subscription.get("customer")
        status = subscription.get("status", "active")

        # Derive tier from the subscription's current price
        items = subscription.get("items", {}).get("data", [])
        price_id = items[0]["price"]["id"] if items else None

        sub = (
            db.query(SubscriptionProfile)
            .filter(SubscriptionProfile.stripe_customer_id == stripe_customer_id)
            .first()
        )
        if not sub:
            logger.warning(
                "subscription.updated: no local subscription for customer %s", stripe_customer_id
            )
            return

        sub.stripe_subscription_id = stripe_sub_id
        sub.status = status

        if price_id:
            tier = self._tier_for_price(db, price_id)
            if tier:
                sub.tier_id = tier.id
                sub.quota_limit = tier.quota_limit
                logger.info(
                    "Subscription updated: customer=%s tier=%s status=%s",
                    stripe_customer_id,
                    tier.slug,
                    status,
                )
            else:
                logger.warning(
                    "subscription.updated: no tier matched price_id=%s for customer=%s",
                    price_id,
                    stripe_customer_id,
                )

    def _on_subscription_deleted(self, db: Session, subscription: dict) -> None:
        """Downgrade user to the free tier when their subscription is cancelled."""
        stripe_customer_id = subscription.get("customer")

        sub = (
            db.query(SubscriptionProfile)
            .filter(SubscriptionProfile.stripe_customer_id == stripe_customer_id)
            .first()
        )
        if not sub:
            logger.warning(
                "subscription.deleted: no local subscription for customer %s", stripe_customer_id
            )
            return

        free_tier = db.query(Tier).filter(Tier.slug == "free").first()
        sub.tier_id = free_tier.id if free_tier else None
        sub.quota_limit = free_tier.quota_limit if free_tier else 50
        sub.stripe_subscription_id = None
        sub.status = "canceled"
        logger.info(
            "Subscription cancelled: customer=%s — downgraded to free", stripe_customer_id
        )

    def _on_invoice_paid(self, db: Session, invoice: dict) -> None:
        """Reset monthly quota when a renewal invoice is paid."""
        stripe_customer_id = invoice.get("customer")
        stripe_sub_id = invoice.get("subscription")

        if not stripe_sub_id:
            # One-off invoice, not a subscription renewal
            return

        sub = (
            db.query(SubscriptionProfile)
            .filter(SubscriptionProfile.stripe_customer_id == stripe_customer_id)
            .first()
        )
        if not sub:
            logger.warning(
                "invoice.paid: no local subscription for customer %s", stripe_customer_id
            )
            return

        sub.quota_used = 0
        sub.status = "active"
        logger.info(
            "Invoice paid: customer=%s sub=%s — quota reset to 0", stripe_customer_id, stripe_sub_id
        )

    def _on_invoice_payment_failed(self, db: Session, invoice: dict) -> None:
        """Mark subscription as past_due when a renewal payment fails."""
        stripe_customer_id = invoice.get("customer")
        stripe_sub_id = invoice.get("subscription")

        if not stripe_sub_id:
            return

        sub = (
            db.query(SubscriptionProfile)
            .filter(SubscriptionProfile.stripe_customer_id == stripe_customer_id)
            .first()
        )
        if not sub:
            logger.warning(
                "invoice.payment_failed: no local subscription for customer %s",
                stripe_customer_id,
            )
            return

        sub.status = "past_due"
        logger.warning(
            "Invoice payment failed: customer=%s sub=%s — marked past_due",
            stripe_customer_id,
            stripe_sub_id,
        )

    def _activate_subscription(
        self,
        db: Session,
        user_id: uuid.UUID,
        tier_slug: str,
        stripe_sub_id: str | None,
    ) -> None:
        """Directly activate a subscription by tier slug (used at checkout completion)."""
        tier = db.query(Tier).filter(Tier.slug == tier_slug).first()
        sub = (
            db.query(SubscriptionProfile)
            .filter(SubscriptionProfile.user_id == user_id)
            .first()
        )
        if sub and tier:
            sub.tier_id = tier.id
            sub.quota_limit = tier.quota_limit
            sub.stripe_subscription_id = stripe_sub_id
            sub.status = "active"


def generate_api_key() -> tuple[str, str, str]:
    raw = f"ocr_{secrets.token_urlsafe(32)}"
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    prefix = raw[:12]
    return raw, key_hash, prefix


billing_service = BillingService()
