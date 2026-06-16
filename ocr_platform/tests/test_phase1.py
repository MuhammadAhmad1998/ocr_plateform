import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.accounts.models import ApiKey, SubscriptionProfile, User
from app.advisor.models import Document
from app.billing.service import generate_api_key
from app.core.security import create_access_token, hash_password

pytestmark = pytest.mark.usefixtures("mock_celery_ocr_task")


@pytest.fixture
def mock_celery_ocr_task():
    with patch("workers.celery_app.process_ocr_job_task") as mock_task:
        mock_task.delay.return_value = None
        yield mock_task


def _auth_headers(email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(email)}"}


def _create_user(db_session, email: str = "apikey@example.com") -> User:
    user = User(email=email, password_hash=hash_password("password123"), full_name="API User")
    db_session.add(user)
    db_session.flush()
    db_session.add(SubscriptionProfile(user_id=user.id, quota_limit=50, quota_used=0))
    db_session.commit()
    return user


def _create_api_key(db_session, user: User) -> tuple[str, ApiKey]:
    raw, key_hash, prefix = generate_api_key()
    api_key = ApiKey(user_id=user.id, key_hash=key_hash, key_prefix=prefix, name="Test Key")
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


def test_ocr_job_accepts_x_api_key(client, db_session):
    user = _create_user(db_session)
    raw_key, _ = _create_api_key(db_session, user)
    doc = _create_document(db_session, user)

    response = client.post(
        "/api/v1/ocr/jobs/",
        headers={"x-api-key": raw_key},
        json={"document_id": str(doc.id)},
    )
    assert response.status_code == 202
    body = response.json()
    assert body["status"] == "queued"
    assert "id" in body


def test_ocr_job_accepts_bearer_api_key(client, db_session):
    user = _create_user(db_session, email="bearer-key@example.com")
    raw_key, _ = _create_api_key(db_session, user)
    doc = _create_document(db_session, user)

    response = client.post(
        "/api/v1/ocr/jobs/",
        headers={"Authorization": f"Bearer {raw_key}"},
        json={"document_id": str(doc.id)},
    )
    assert response.status_code == 202


def test_ocr_job_get_with_api_key(client, db_session):
    user = _create_user(db_session, email="get-key@example.com")
    raw_key, _ = _create_api_key(db_session, user)
    doc = _create_document(db_session, user)

    create_response = client.post(
        "/api/v1/ocr/jobs/",
        headers={"x-api-key": raw_key},
        json={"document_id": str(doc.id)},
    )
    job_id = create_response.json()["id"]

    get_response = client.get(
        f"/api/v1/ocr/jobs/{job_id}/",
        headers={"x-api-key": raw_key},
    )
    assert get_response.status_code == 200
    assert get_response.json()["id"] == job_id


def test_invalid_api_key_returns_401(client, db_session):
    _create_user(db_session, email="invalid-key@example.com")
    response = client.get(
        f"/api/v1/ocr/jobs/{uuid.uuid4()}/",
        headers={"x-api-key": "ocr_not_a_real_key"},
    )
    assert response.status_code == 401
    assert response.json()["error"] == "AUTHENTICATION_ERROR"


def test_rate_limit_returns_429(client, monkeypatch):
    def _blocked(_request):
        return False, {
            "X-RateLimit-Limit": "1",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "9999999999",
        }

    monkeypatch.setattr("app.core.rate_limit.check_rate_limit", _blocked)
    response = client.get("/api/v1/vlm/health/")
    assert response.status_code == 429
    assert response.json()["error"] == "RATE_LIMIT_EXCEEDED"
    assert response.headers.get("X-RateLimit-Limit") == "1"
    assert response.headers.get("X-RateLimit-Remaining") == "0"


def test_health_ready_ok(client):
    mock_redis = MagicMock()
    mock_redis.ping.return_value = True

    with patch("redis.from_url", return_value=mock_redis):
        response = client.get("/health/ready")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["checks"]["database"] == "ok"
    assert body["checks"]["redis"] == "ok"


def test_health_ready_redis_down_returns_503(client):
    with patch("redis.from_url", side_effect=ConnectionError("redis down")):
        response = client.get("/health/ready")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "not_ready"
    assert body["checks"]["redis"] == "error"


def test_inference_route_includes_processing_time_header(client, db_session):
    _create_user(db_session, email="timing@example.com")
    response = client.get(
        "/api/v1/vlm/health/",
        headers=_auth_headers("timing@example.com"),
    )
    assert response.status_code == 200
    assert "X-Processing-Time-Ms" in response.headers
