"""Integration tests for AI Platform marketplace key provisioning."""

from __future__ import annotations

import io
import uuid
from unittest.mock import patch

import bcrypt
import pytest

from app.accounts.models import ApiKey, User
from app.core.config import get_settings
from app.core.security import hash_password

PLATFORM_SECRET = "test-platform-secret-for-integration"


@pytest.fixture
def platform_settings(monkeypatch):
    monkeypatch.setenv("PLATFORM_API_KEY", PLATFORM_SECRET)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def mock_celery_ocr_task():
    with patch("workers.celery_app.process_ocr_job_task") as mock_task:
        mock_task.delay.return_value = None
        yield mock_task


def _platform_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {PLATFORM_SECRET}"}


def _bcrypt_hash(plain_key: str) -> str:
    return bcrypt.hashpw(plain_key.encode(), bcrypt.gensalt()).decode()


def _provision_payload(
  plain_key: str,
  *,
  platform_key_id: uuid.UUID | None = None,
  platform_account_id: uuid.UUID | None = None,
  quota_limit: int = 100,
) -> dict:
    platform_key_id = platform_key_id or uuid.uuid4()
    platform_account_id = platform_account_id or uuid.uuid4()
    return {
        "platform_key_id": str(platform_key_id),
        "plain_key": plain_key,
        "key_prefix": plain_key[:12],
        "key_hash": _bcrypt_hash(plain_key),
        "platform_tenant_id": str(uuid.uuid4()),
        "platform_account_id": str(platform_account_id),
        "platform_user_id": str(uuid.uuid4()),
        "platform_subscription_id": str(uuid.uuid4()),
        "user_email": "developer@company.com",
        "user_full_name": "Jane Developer",
        "account_type": "company",
        "company_name": "Acme Corp",
        "service_slug": "ocr",
        "key_name": "Production Key",
        "scopes": ["ocr:read", "ocr:write"],
        "quota_limit": quota_limit,
        "quota_unit": "pages",
        "plan_slug": "professional",
    }


def test_provision_requires_platform_secret(client, platform_settings):
    response = client.post("/internal/v1/keys/provision", json=_provision_payload("ak_live_testkey1234567890"))
    assert response.status_code == 401


def test_provision_create_and_inference_flow(
    client, db_session, platform_settings, mock_celery_ocr_task, monkeypatch
):
    monkeypatch.setattr(
        "app.api.v1.advisor.storage.upload",
        lambda content, folder, filename, content_type: "uploads/test.pdf",
    )
    monkeypatch.setattr(
        "app.api.v1.advisor.fingerprint_document",
        lambda content, content_type, filename: {"type": "pdf", "page_count": 1},
    )

    plain_key = "ak_live_testkey1234567890"
    platform_key_id = uuid.uuid4()
    payload = _provision_payload(plain_key, platform_key_id=platform_key_id)

    provision = client.post(
        "/internal/v1/keys/provision",
        json=payload,
        headers=_platform_headers(),
    )
    assert provision.status_code == 201
    body = provision.json()
    assert body["status"] == "active"
    assert "ocr_key_id" in body

    api_key = db_session.query(ApiKey).filter(ApiKey.platform_key_id == platform_key_id).first()
    assert api_key is not None
    assert api_key.key_source == "platform"
    assert api_key.user_email == "developer@company.com"
    assert api_key.quota_limit == 100

    auth = {"Authorization": f"Bearer {plain_key}"}

    upload = client.post(
        "/api/v1/documents/",
        headers=auth,
        files={"file": ("sample.pdf", io.BytesIO(b"%PDF-1.4 test"), "application/pdf")},
    )
    assert upload.status_code == 201
    document_id = upload.json()["id"]

    job = client.post(
        "/api/v1/ocr/jobs/",
        headers={**auth, "Content-Type": "application/json"},
        json={"document_id": document_id, "tier_slug": "basic"},
    )
    assert job.status_code == 202
    assert job.headers.get("X-Quota-Used") == "1"
    assert job.headers.get("X-Quota-Limit") == "100"

    job_id = job.json()["id"]
    status_resp = client.get(f"/api/v1/ocr/jobs/{job_id}/", headers=auth)
    assert status_resp.status_code == 200

    revoke = client.post(
        f"/internal/v1/keys/{platform_key_id}/revoke",
        headers=_platform_headers(),
    )
    assert revoke.status_code == 200
    assert revoke.json()["status"] == "revoked"

    denied = client.get(f"/api/v1/ocr/jobs/{job_id}/", headers=auth)
    assert denied.status_code == 401


def test_provision_duplicate_returns_conflict(client, db_session, platform_settings):
    plain_key = "ak_live_duplicatekey123456"
    platform_key_id = uuid.uuid4()
    payload = _provision_payload(plain_key, platform_key_id=platform_key_id)

    first = client.post("/internal/v1/keys/provision", json=payload, headers=_platform_headers())
    assert first.status_code == 201

    second = client.post("/internal/v1/keys/provision", json=payload, headers=_platform_headers())
    assert second.status_code == 409


def test_x_api_key_header_works(client, db_session, platform_settings):
    plain_key = "ak_live_headerkey12345678"
    payload = _provision_payload(plain_key)
    provision = client.post("/internal/v1/keys/provision", json=payload, headers=_platform_headers())
    assert provision.status_code == 201

    response = client.get("/api/v2/models/", headers={"x-api-key": plain_key})
    assert response.status_code == 200
    assert response.json()["object"] == "model_catalog"


def test_patch_account_quota(client, db_session, platform_settings):
    plain_key = "ak_live_quotaupdate123456"
    account_id = uuid.uuid4()
    payload = _provision_payload(plain_key, platform_account_id=account_id, quota_limit=50)
    provision = client.post("/internal/v1/keys/provision", json=payload, headers=_platform_headers())
    assert provision.status_code == 201

    patch = client.patch(
        f"/internal/v1/accounts/{account_id}/quota",
        headers=_platform_headers(),
        json={"quota_limit": 500, "quota_unit": "pages", "plan_slug": "enterprise"},
    )
    assert patch.status_code == 200
    assert patch.json()["keys_updated"] == 1
    assert patch.json()["quota_limit"] == 500

    api_key = db_session.query(ApiKey).filter(ApiKey.platform_account_id == account_id).first()
    assert api_key.quota_limit == 500


def test_local_jwt_flow_still_works(client, db_session):
    """Frontend JWT path must remain available when REQUIRE_API_KEY is false."""
    from app.accounts.models import SubscriptionProfile
    from app.registry.models import Tier

    tier = db_session.query(Tier).filter(Tier.slug == "free").first()
    user = User(
        email="frontend@example.com",
        password_hash=hash_password("password123"),
        full_name="Frontend User",
    )
    db_session.add(user)
    db_session.flush()
    db_session.add(
        SubscriptionProfile(user_id=user.id, tier_id=tier.id if tier else None, quota_limit=50)
    )
    db_session.commit()

    login = client.post(
        "/api/v1/auth/login/",
        json={"email": "frontend@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = client.get("/api/v1/auth/me/", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "frontend@example.com"


def test_disable_public_auth_blocks_register(client, monkeypatch):
    monkeypatch.setenv("DISABLE_PUBLIC_AUTH", "true")
    get_settings.cache_clear()

    response = client.post(
        "/api/v1/auth/register/",
        json={"email": "blocked@example.com", "password": "password123"},
    )
    assert response.status_code == 403

    get_settings.cache_clear()
