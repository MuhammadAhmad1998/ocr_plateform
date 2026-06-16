import uuid

import pytest
from app.accounts.models import SubscriptionProfile, User
from app.core.security import create_access_token, hash_password


def _auth_headers(email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(email)}"}


def _create_user(db_session, email: str = "user@example.com", password: str = "password123") -> User:
    user = User(email=email, password_hash=hash_password(password), full_name="Test User")
    db_session.add(user)
    db_session.flush()
    db_session.add(SubscriptionProfile(user_id=user.id, quota_limit=50, quota_used=0))
    db_session.commit()
    return user


def test_health_endpoint_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_auth_me_without_token_returns_401(client):
    response = client.get("/api/v1/auth/me/")
    assert response.status_code == 401
    body = response.json()
    assert body["error"] == "AUTHENTICATION_ERROR"
    assert body["message"] == "Not authenticated"
    assert "request_id" in body


def test_auth_login_invalid_credentials_returns_401(client, db_session):
    _create_user(db_session)
    response = client.post(
        "/api/v1/auth/login/",
        json={"email": "user@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json()["error"] == "AUTHENTICATION_ERROR"


def test_auth_register_conflict_returns_409(client, db_session):
    _create_user(db_session)
    response = client.post(
        "/api/v1/auth/register/",
        json={"email": "user@example.com", "password": "password123"},
    )
    assert response.status_code == 409
    assert response.json()["error"] == "CONFLICT"


def test_auth_register_validation_error_returns_422(client):
    response = client.post(
        "/api/v1/auth/register/",
        json={"email": "not-an-email", "password": "short"},
    )
    assert response.status_code == 422
    body = response.json()
    assert body["error"] == "VALIDATION_ERROR"
    assert "details" in body


def test_advisor_session_not_found_returns_404(client, db_session):
    _create_user(db_session)
    response = client.get(
        f"/api/v1/advisor/session/{uuid.uuid4()}/",
        headers=_auth_headers("user@example.com"),
    )
    assert response.status_code == 404
    assert response.json()["error"] == "NOT_FOUND"


def test_demo_session_not_found_returns_404(client, db_session):
    _create_user(db_session)
    response = client.post(
        "/api/v1/demo/run/",
        headers=_auth_headers("user@example.com"),
        json={"session_id": str(uuid.uuid4())},
    )
    assert response.status_code == 404
    assert response.json()["error"] == "NOT_FOUND"


def test_billing_invalid_tier_returns_400(client, db_session):
    _create_user(db_session)
    response = client.post(
        "/api/v1/billing/checkout/",
        headers=_auth_headers("user@example.com"),
        json={"tier_slug": "does-not-exist"},
    )
    assert response.status_code == 400
    assert response.json()["error"] == "BAD_REQUEST"


def test_testing_model_not_found_returns_404(client, db_session):
    _create_user(db_session)
    response = client.post(
        "/api/v1/testing/run/",
        headers=_auth_headers("user@example.com"),
        data={"model_slug": "missing-model"},
        files={"file": ("test.png", b"not-a-real-image", "image/png")},
    )
    assert response.status_code == 404
    assert response.json()["error"] == "NOT_FOUND"


def test_advisor_upload_rejects_bad_type_returns_400(client, db_session):
    _create_user(db_session)
    response = client.post(
        "/api/v1/advisor/upload/",
        headers=_auth_headers("user@example.com"),
        files={"file": ("bad.exe", b"data", "application/octet-stream")},
    )
    assert response.status_code == 400
    assert response.json()["error"] == "BAD_REQUEST"


def test_response_includes_request_id_header(client):
    response = client.get("/api/v1/auth/me/", headers={"X-Request-ID": "custom-request-id"})
    assert response.status_code == 401
    assert response.headers.get("X-Request-ID") == "custom-request-id"
    assert response.json()["request_id"] == "custom-request-id"
