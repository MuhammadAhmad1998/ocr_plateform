from __future__ import annotations

from sqlalchemy.orm import Session

from platform_api.models import Engine, Tier


class RegistryService:
    def get_tier_by_slug(self, db: Session, slug: str) -> Tier | None:
        return db.query(Tier).filter(Tier.slug == slug, Tier.is_active.is_(True)).first()

    def select_engine_for_document(self, db: Session, tier_slug: str, fingerprint: dict):
        tier = self.get_tier_by_slug(db, tier_slug)
        if not tier:
            return None
        engine = (
            db.query(Engine)
            .filter(Engine.tier_id == tier.id, Engine.is_active.is_(True))
            .first()
        )
        if not engine:
            return None

        class Match:
            pass

        m = Match()
        m.engine = engine
        m.tier = tier
        return m


registry = RegistryService()
