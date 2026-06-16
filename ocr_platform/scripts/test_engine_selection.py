"""Test script to verify engine selection logic and ensure TrOCR is never recommended."""

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.registry.service import registry_service


def test_engine_selection():
    """Test various scenarios to ensure correct engine selection."""
    db: Session = SessionLocal()
    
    test_cases = [
        {
            "name": "Simple printed document (Basic tier)",
            "tier": "basic",
            "fingerprint": {
                "has_tables": True,
                "has_equations": False,
                "has_handwriting": False,
                "doc_type": "invoice",
            },
            "expected_engines": ["paddle-ocr-vl"],
        },
        {
            "name": "Handwritten document (Pro tier)",
            "tier": "pro",
            "fingerprint": {
                "has_tables": False,
                "has_equations": False,
                "has_handwriting": True,
                "doc_type": "form",
            },
            "expected_engines": ["got-ocr2"],
        },
        {
            "name": "Scientific paper with equations (Pro tier)",
            "tier": "pro",
            "fingerprint": {
                "has_tables": True,
                "has_equations": True,
                "has_handwriting": False,
                "doc_type": "scientific",
            },
            "expected_engines": ["got-ocr2"],
        },
        {
            "name": "Medical document (Pro tier)",
            "tier": "pro",
            "fingerprint": {
                "has_tables": True,
                "has_equations": False,
                "has_handwriting": False,
                "doc_type": "medical",
            },
            "expected_engines": ["qianfan-ocr"],
        },
        {
            "name": "Simple document (Free tier)",
            "tier": "free",
            "fingerprint": {
                "has_tables": False,
                "has_equations": False,
                "has_handwriting": False,
                "doc_type": "unknown",
            },
            "expected_engines": ["paddle-ocr-free"],
        },
        {
            "name": "Complex document (Enterprise tier)",
            "tier": "enterprise",
            "fingerprint": {
                "has_tables": True,
                "has_equations": True,
                "has_handwriting": True,
                "doc_type": "complex",
                "layout_complexity": "complex",
            },
            "expected_engines": ["got-ocr2-enterprise", "qianfan-ocr-enterprise"],
        },
    ]
    
    print("🧪 Testing Engine Selection Logic\n")
    print("=" * 80)
    
    all_passed = True
    
    for test in test_cases:
        print(f"\n📋 Test: {test['name']}")
        print(f"   Tier: {test['tier']}")
        print(f"   Fingerprint: {test['fingerprint']}")
        
        match = registry_service.select_engine_for_document(
            db, test['tier'], test['fingerprint']
        )
        
        if match:
            print(f"   → Selected: {match.engine.display_name} ({match.engine.slug})")
            print(f"   → Score: {match.score}")
            print(f"   → Reasons: {', '.join(match.reasons)}")
            
            # Check if TrOCR was selected (should NEVER happen)
            if 'trocr' in match.engine.slug.lower():
                print(f"   ❌ FAIL: TrOCR was selected! This should NEVER happen!")
                all_passed = False
            elif match.engine.slug in test['expected_engines']:
                print(f"   ✅ PASS: Correct engine selected")
            else:
                print(f"   ⚠️  WARNING: Expected one of {test['expected_engines']}, got {match.engine.slug}")
        else:
            print(f"   ⚠️  WARNING: No engine match found for {test['tier']} tier")
    
    print("\n" + "=" * 80)
    
    # Check for any active TrOCR engines
    print("\n🔍 Checking for active TrOCR engines...")
    from app.registry.models import Engine
    trocr_engines = db.query(Engine).filter(
        Engine.slug.like('%trocr%'),
        Engine.is_active == True
    ).all()
    
    if trocr_engines:
        print(f"❌ CRITICAL: Found {len(trocr_engines)} active TrOCR engine(s)!")
        for eng in trocr_engines:
            print(f"   - {eng.display_name} ({eng.slug})")
        all_passed = False
    else:
        print("✅ No active TrOCR engines found")
    
    # List all active engines
    print("\n📊 All Active Engines:")
    active_engines = db.query(Engine).filter(Engine.is_active == True).all()
    for eng in active_engines:
        tier_name = eng.tier.public_name if eng.tier else "Unknown"
        print(f"   • {eng.display_name} ({eng.slug}) - {tier_name}")
    
    db.close()
    
    print("\n" + "=" * 80)
    if all_passed:
        print("✅ ALL TESTS PASSED - TrOCR is completely removed!")
    else:
        print("❌ SOME TESTS FAILED - Please review above")
    
    return all_passed


if __name__ == "__main__":
    success = test_engine_selection()
    exit(0 if success else 1)
