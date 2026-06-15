"""Script to deactivate TrOCR engines and other deprecated engines from the database."""

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.registry.models import Engine


def remove_trocr_engines():
    """Deactivate all TrOCR and other deprecated engines."""
    db: Session = SessionLocal()
    try:
        # List of engine slugs to deactivate
        deprecated_engines = [
            "trocr-base",
            "trocr-handwritten",
            "donut-base",
            "nougat-base",
            "pix2struct",
            "doctr",
        ]
        
        deactivated_count = 0
        for slug in deprecated_engines:
            engine = db.query(Engine).filter(Engine.slug == slug).first()
            if engine and engine.is_active:
                engine.is_active = False
                deactivated_count += 1
                print(f"✓ Deactivated engine: {engine.display_name} ({slug})")
            elif engine:
                print(f"  Already deactivated: {engine.display_name} ({slug})")
            else:
                print(f"  Engine not found: {slug}")
        
        db.commit()
        print(f"\n✅ Successfully deactivated {deactivated_count} engine(s)")
        
        # Show active engines
        active_engines = db.query(Engine).filter(Engine.is_active == True).all()
        if active_engines:
            print(f"\n📋 Active engines ({len(active_engines)}):")
            for engine in active_engines:
                tier_name = engine.tier.public_name if engine.tier else "Unknown"
                print(f"  • {engine.display_name} ({engine.slug}) - {tier_name} tier")
        else:
            print("\n⚠️  No active engines found! Run seed.py to add new engines.")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("🔧 Removing TrOCR and deprecated engines...\n")
    remove_trocr_engines()
