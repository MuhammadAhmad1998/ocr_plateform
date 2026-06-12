import logging
import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.accounts.models import ApiKey, SubscriptionProfile, User
from app.advisor.models import Document
from app.billing.service import generate_api_key
from app.core.config import Settings, get_settings
from app.core.rate_limit import tier_rate_limit
from app.core.security import create_access_token, hash_password
from app.registry.models import Tier

pytestmark = pytest.mark.usefixtures("mock_celery_ocr_task")


@pytest.fixture
def mock_celery_ocr_task():
    with patch("workers.celery_app.process_ocr_job_task") as mock_task:
        mock_task.delay.return_value = None
        yield mock_task


def _auth_headers(email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(email)}"}


def _create_user(
    db_session,
    email: str = "phase4@example.com",
    *,
    tier_slug: str = "free",
) -> User:
    user = User(email=email, password_hash=hash_password("password123"), full_name="Phase4 User")
    db_session.add(user)
    db_session.flush()

    tier = db_session.query(Tier).filter(Tier.slug == tier_slug).first()
    if not tier:
        tier = Tier(slug=tier_slug, public_name=tier_slug.title(), quota_limit=50)
        db_session.add(tier)
        db_session.flush()

    db_session.add(
        SubscriptionProfile(
            user_id=user.id,
            tier_id=tier.id,
            quota_limit=tier.quota_limit,
            quota_used=0,
        )
    )
    db_session.commit()
    return user


def _create_api_key(db_session, user: User, *, scopes: list[str] | None = None) -> tuple[str, ApiKey]:
    raw, key_hash, prefix = generate_api_key()
    api_key = ApiKey(
        user_id=user.id,
        key_hash=key_hash,
        key_prefix=prefix,
        name="Test Key",
        scopes=scopes or [],
    )
    db_session.add(api_key)
    db_session.commit()
    return raw, api_key


def _create_document(db_session, user: User) -> Document:
    doc = Document(
        user_id=user.id,
        filename="test.pdf",
        content_type="application/pdf",
        s3_key="uploads/test.pdf",
        page_count=1,
        fingerprint_json={"type": "pdf"},
    )
    db_session.add(doc)
    db_session.commit()
    return doc


def test_default_secret_key_logs_error_in_production_mode(caplog):
    from app.core.security_checks import validate_production_settings

    settings = Settings(
        DEBUG=False,
        SECRET_KEY="change-me-in-production-use-openssl-rand-hex-32",
        DEFAULT_SECRET_KEY="change-me-in-production-use-openssl-rand-hex-32",
    )

    with caplog.at_level(logging.ERROR):
        validate_production_settings(settings)

    assert any("SECRET_KEY is using the default value" in record.message for record in caplog.records)


def test_read_only_api_key_cannot_submit_job(client, db_session):
    user = _create_user(db_session, email="scope-write@example.com")
    raw_key, _ = _create_api_key(db_session, user, scopes=["ocr:read"])
    doc = _create_document(db_session, user)

    response = client.post(
        "/api/v1/ocr/jobs/",
        headers={"x-api-key": raw_key},
        json={"document_id": str(doc.id)},
    )
    assert response.status_code == 403
    assert response.json()["error"] == "AUTHORIZATION_ERROR"


def test_write_only_api_key_cannot_get_job(client, db_session):
    user = _create_user(db_session, email="scope-read@example.com")
    raw_key, _ = _create_api_key(db_session, user, scopes=["ocr:write"])
    doc = _create_document(db_session, user)

    create_response = client.post(
        "/api/v1/ocr/jobs/",
        headers={"x-api-key": raw_key},
        json={"document_id": str(doc.id)},
    )
    assert create_response.status_code == 202
    job_id = create_response.json()["id"]

    get_response = client.get(
        f"/api/v1/ocr/jobs/{job_id}/",
        headers={"x-api-key": raw_key},
    )
    assert get_response.status_code == 403
    assert get_response.json()["error"] == "AUTHORIZATION_ERROR"


def test_revoke_api_key_disables_access(client, db_session):
    user = _create_user(db_session, email="revoke@example.com")
    raw_key, api_key = _create_api_key(db_session, user)

    revoke_response = client.post(
        f"/api/v1/dashboard/api-keys/{api_key.id}/revoke/",
        headers=_auth_headers(user.email),
    )
    assert revoke_response.status_code == 200
    assert revoke_response.json()["is_active"] is False

    response = client.get(
        f"/api/v1/ocr/jobs/{uuid.uuid4()}/",
        headers={"x-api-key": raw_key},
    )
    assert response.status_code == 401


def test_ocr_job_submit_includes_quota_headers(client, db_session):
    user = _create_user(db_session, email="quota@example.com")
    doc = _create_document(db_session, user)

    response = client.post(
        "/api/v1/ocr/jobs/",
        headers=_auth_headers(user.email),
        json={"document_id": str(doc.id)},
    )
    assert response.status_code == 202
    assert response.headers.get("X-Quota-Used") == "1"
    assert response.headers.get("X-Quota-Limit") == "50"


def test_tier_rate_limit_differentiation():
    cfg = Settings(
        RATE_LIMIT_REQUESTS_FREE=10,
        RATE_LIMIT_REQUESTS_BASIC=20,
        RATE_LIMIT_REQUESTS_PRO=40,
        RATE_LIMIT_REQUESTS_ENTERPRISE=80,
    )
    assert tier_rate_limit(cfg, "free") == 10
    assert tier_rate_limit(cfg, "basic") == 20
    assert tier_rate_limit(cfg, "pro") == 40
    assert tier_rate_limit(cfg, "enterprise") == 80


def test_tier_rate_limit_header_reflects_subscription(client, db_session, monkeypatch):
    user = _create_user(db_session, email="tier-pro@example.com", tier_slug="pro")
    _create_document(db_session, user)

    class _TestSessionLocal:
        def __call__(self):
            return db_session

    monkeypatch.setattr("app.core.database.SessionLocal", _TestSessionLocal())

    def _limited(request):
        from app.core.rate_limit import _tier_slug_for_request, tier_rate_limit

        tier_slug = _tier_slug_for_request(request)
        limit = tier_rate_limit(get_settings(), tier_slug)
        return False, {
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "9999999999",
            "X-RateLimit-Tier": tier_slug,
        }

    monkeypatch.setattr("app.core.rate_limit.check_rate_limit", _limited)
    response = client.get(
        "/api/v1/vlm/health/",
        headers=_auth_headers(user.email),
    )
    assert response.status_code == 429
    assert response.headers.get("X-RateLimit-Tier") == "pro"
    assert response.headers.get("X-RateLimit-Limit") == "120"


def test_request_body_size_limit_returns_413(client, monkeypatch):
    monkeypatch.setattr("app.core.middleware.settings.MAX_UPLOAD_SIZE_MB", 1)
    response = client.post(
        "/api/v1/auth/login/",
        headers={"Content-Length": str(2 * 1024 * 1024)},
        json={"email": "a@b.com", "password": "x"},
    )
    assert response.status_code == 413
    assert response.json()["error"] == "PAYLOAD_TOO_LARGE"


def test_status_endpoint_is_public(client):
    mock_redis = MagicMock()
    mock_redis.ping.return_value = True

    with patch("redis.from_url", return_value=mock_redis):
        response = client.get("/api/v1/status/")

    assert response.status_code == 200
    body = response.json()
    assert body["version"] == "1.0.0"
    assert "uptime_seconds" in body
    assert "vlm" in body["models"]
    assert "database" in body["degraded"]
    assert "redis" in body["degraded"]
    assert "SECRET" not in str(body).upper()
