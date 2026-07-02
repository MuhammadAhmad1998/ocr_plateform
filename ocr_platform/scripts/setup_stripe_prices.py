#!/usr/bin/env python3
"""Create Stripe Products/Prices for paid tiers and save stripe_price_id in the DB.

Usage (from ocr_platform/):
    .venv/bin/python scripts/setup_stripe_prices.py

Idempotent — safe to re-run. Skips tiers that already have a valid stripe_price_id.
"""

from __future__ import annotations

import sys

import stripe

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.registry.models import Tier

# slug → (display name, monthly price in USD cents)
PAID_TIERS: dict[str, tuple[str, int]] = {
    "basic": ("Planet OCR Essential", 2900),       # $29/mo
    "pro": ("Planet OCR Professional", 9900),    # $99/mo
}


def _metadata_get(obj, key: str) -> str | None:
    if not obj:
        return None
    try:
        return obj.get(key)  # type: ignore[attr-defined]
    except AttributeError:
        return getattr(obj, key, None)


def _find_price_for_tier(stripe_api, slug: str) -> str | None:
    """Return an existing active monthly price ID for this tier slug, if any."""
    products = stripe_api.Product.list(active=True, limit=100)
    for product in products.auto_paging_iter():
        if _metadata_get(product.metadata, "tier_slug") != slug:
            continue
        prices = stripe_api.Price.list(product=product.id, active=True, limit=10)
        for price in prices.data:
            if price.recurring and price.recurring.interval == "month":
                return price.id
    return None


def _create_product_and_price(stripe_api, slug: str, name: str, amount_cents: int) -> str:
    product = stripe_api.Product.create(
        name=name,
        metadata={"tier_slug": slug, "platform": "planet-ocr"},
    )
    price = stripe_api.Price.create(
        product=product.id,
        unit_amount=amount_cents,
        currency="usd",
        recurring={"interval": "month"},
        metadata={"tier_slug": slug},
    )
    return price.id


def main() -> int:
    settings = get_settings()
    if not settings.STRIPE_SECRET_KEY:
        print("ERROR: STRIPE_SECRET_KEY is not set in .env", file=sys.stderr)
        return 1

    stripe.api_key = settings.STRIPE_SECRET_KEY
    db = SessionLocal()

    try:
        for slug, (name, amount_cents) in PAID_TIERS.items():
            tier = db.query(Tier).filter(Tier.slug == slug).first()
            if not tier:
                print(f"SKIP  {slug}: tier not found in database — run seed first")
                continue

            if tier.stripe_price_id:
                try:
                    stripe.Price.retrieve(tier.stripe_price_id)
                    print(f"OK    {slug}: already configured → {tier.stripe_price_id}")
                    continue
                except stripe.error.InvalidRequestError:
                    print(f"WARN  {slug}: stored price {tier.stripe_price_id!r} invalid — recreating")

            price_id = _find_price_for_tier(stripe, slug)
            if not price_id:
                price_id = _create_product_and_price(stripe, slug, name, amount_cents)
                print(f"CREATE {slug}: new Stripe price → {price_id} (${amount_cents / 100:.0f}/mo)")
            else:
                print(f"LINK  {slug}: found existing Stripe price → {price_id}")

            tier.stripe_price_id = price_id

        db.commit()
        print("\nDone. Paid tiers are ready for checkout.")
        return 0
    except stripe.error.StripeError as exc:
        print(f"ERROR: Stripe API failed: {exc}", file=sys.stderr)
        db.rollback()
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
