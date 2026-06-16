from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.registry.models import Engine, Tier


@dataclass
class EngineMatch:
    engine: Engine
    score: float
    reasons: list[str]


class RegistryService:
    def get_tier_by_slug(self, db: Session, slug: str) -> Tier | None:
        return db.query(Tier).filter(Tier.slug == slug, Tier.is_active.is_(True)).first()

    def get_engine_by_slug(self, db: Session, slug: str) -> Engine | None:
        return db.query(Engine).filter(Engine.slug == slug, Engine.is_active.is_(True)).first()

    def list_tiers(self, db: Session) -> list[Tier]:
        return db.query(Tier).filter(Tier.is_active.is_(True)).order_by(Tier.quota_limit).all()

    def select_engine_for_document(
        self, db: Session, tier_slug: str, fingerprint: dict
    ) -> EngineMatch | None:
        tier = self.get_tier_by_slug(db, tier_slug)
        if not tier:
            return None

        engines = db.query(Engine).filter(Engine.tier_id == tier.id, Engine.is_active.is_(True)).all()
        if not engines:
            return None

        best: EngineMatch | None = None
        for engine in engines:
            score, reasons = self._score_engine(engine, fingerprint)
            if best is None or score > best.score:
                best = EngineMatch(engine=engine, score=score, reasons=reasons)
        return best

    def _score_engine(self, engine: Engine, fingerprint: dict) -> tuple[float, list[str]]:
        score = 0.0
        reasons: list[str] = []
        tags = set(engine.capability_tags or [])
        benchmarks = engine.benchmark_scores or {}

        doc_type = fingerprint.get("doc_type", "unknown")
        if doc_type in benchmarks:
            score += benchmarks[doc_type] * 10
            reasons.append(f"Strong benchmark for {doc_type}")

        if fingerprint.get("has_handwriting") and "handwriting" in tags:
            score += 30
            reasons.append("Handwriting capability")
        elif not fingerprint.get("has_handwriting") and "printed_text" in tags:
            score += 15
            reasons.append("Optimized for printed text")

        if fingerprint.get("has_equations") and "equations" in tags:
            score += 25
            reasons.append("Equation extraction support")

        if fingerprint.get("has_tables") and "tables" in tags:
            score += 20
            reasons.append("Table extraction support")

        complexity = fingerprint.get("layout_complexity", "simple")
        if complexity == "complex" and "multi_column" in tags:
            score += 20
            reasons.append("Multi-column layout handling")
        elif complexity == "simple" and engine.cost_profile == "low":
            score += 10
            reasons.append("Cost-efficient for simple documents")

        if fingerprint.get("doc_type") == "scientific" and "scientific_pdf" in tags:
            score += 25
            reasons.append("Scientific PDF specialist")

        if not reasons:
            reasons.append("General-purpose engine within tier")

        return score, reasons


registry_service = RegistryService()
