import io
import uuid

import pytest

from app.accounts.models import SubscriptionProfile, User
from app.advisor.models import Document
from app.core.security import create_access_token, hash_password
from app.registry.models import Engine, Tier

pytestmark = pytest.mark.usefixtures("mock_celery_ocr_task")


@pytest.fixture
def mock_celery_ocr_task():
    from unittest.mock import patch

    with patch("workers.celery_app.process_ocr_job_task") as mock_task:
        mock_task.delay.return_value = None
        yield mock_task


def _auth_headers(email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(email)}"}


def _create_user(db_session, email: str = "phase3@example.com") -> User:
    user = User(email=email, password_hash=hash_password("password123"), full_name="Phase3 User")
    db_session.add(user)
    db_session.flush()
    db_session.add(SubscriptionProfile(user_id=user.id, quota_limit=50, quota_used=0))
    db_session.commit()
    return user


def _create_document(db_session, user: User, filename: str = "doc.pdf") -> Document:
    doc = Document(
        user_id=user.id,
        filename=filename,
        content_type="application/pdf",
        s3_key=f"uploads/{filename}",
        page_count=1,
        fingerprint_json={"type": "pdf"},
    )
    db_session.add(doc)
    db_session.commit()
    db_session.refresh(doc)
    return doc


def _ensure_engine(db_session):
    tier = db_session.query(Tier).filter(Tier.slug == "free").first()
    if not tier:
        tier = Tier(slug="free", public_name="Starter", description="Free", quota_limit=50)
        db_session.add(tier)
        db_session.flush()
    if not db_session.query(Engine).filter(Engine.slug == "test-engine").first():
        db_session.add(
            Engine(
                slug="test-engine",
                tier_id=tier.id,
                display_name="Test Engine",
                adapter_type="trocr-base",
                capability_tags=["printed_text"],
                benchmark_scores={"form": 0.9},
                cost_profile="low",
            )
        )
        db_session.commit()


def test_models_alias_matches_testing_models(client, db_session):
    user = _create_user(db_session)
    _ensure_engine(db_session)
    headers = _auth_headers(user.email)

    legacy = client.get("/api/v1/testing/models/", headers=headers)
    alias = client.get("/api/v1/models/", headers=headers)

    assert legacy.status_code == 200
    assert alias.status_code == 200
    assert legacy.json() == alias.json()


def test_legacy_models_route_has_deprecation_header(client, db_session):
    user = _create_user(db_session)
    _ensure_engine(db_session)

    response = client.get("/api/v1/testing/models/", headers=_auth_headers(user.email))

    assert response.status_code == 200
    assert response.headers.get("Deprecation") == "true"
    assert "/api/v1/models/" in response.headers.get("Link", "")


def test_documents_upload_alias_matches_advisor_upload(client, db_session):
    user = _create_user(db_session)
    headers = _auth_headers(user.email)
    file_content = b"%PDF-1.4 minimal"

    legacy = client.post(
        "/api/v1/advisor/upload/",
        headers=headers,
        files={"file": ("sample.pdf", io.BytesIO(file_content), "application/pdf")},
    )
    alias = client.post(
        "/api/v1/documents/",
        headers=headers,
        files={"file": ("sample.pdf", io.BytesIO(file_content), "application/pdf")},
    )

    assert legacy.status_code == 201
    assert alias.status_code == 201

    legacy_body = legacy.json()
    alias_body = alias.json()
    assert set(legacy_body.keys()) == set(alias_body.keys())
    assert legacy_body["filename"] == alias_body["filename"] == "sample.pdf"
    assert legacy_body["content_type"] == alias_body["content_type"] == "application/pdf"
    assert legacy_body["page_count"] == alias_body["page_count"]


def test_legacy_upload_route_has_deprecation_header(client, db_session):
    user = _create_user(db_session)
    file_content = b"%PDF-1.4 minimal"
    files = {"file": ("sample.pdf", io.BytesIO(file_content), "application/pdf")}

    response = client.post(
        "/api/v1/advisor/upload/",
        headers=_auth_headers(user.email),
        files=files,
    )

    assert response.status_code == 201
    assert response.headers.get("Deprecation") == "true"
    assert "/api/v1/documents/" in response.headers.get("Link", "")


def test_get_document_returns_metadata(client, db_session):
    user = _create_user(db_session)
    doc = _create_document(db_session, user)

    response = client.get(
        f"/api/v1/documents/{doc.id}/",
        headers=_auth_headers(user.email),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == str(doc.id)
    assert body["filename"] == "doc.pdf"


def test_get_document_not_found(client, db_session):
    user = _create_user(db_session)

    response = client.get(
        f"/api/v1/documents/{uuid.uuid4()}/",
        headers=_auth_headers(user.email),
    )

    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "NOT_FOUND"
    assert "request_id" in body


def test_list_documents_pagination(client, db_session):
    user = _create_user(db_session)
    doc1 = _create_document(db_session, user, "a.pdf")
    doc2 = _create_document(db_session, user, "b.pdf")

    page1 = client.get(
        "/api/v1/documents/?limit=1",
        headers=_auth_headers(user.email),
    )
    assert page1.status_code == 200
    body1 = page1.json()
    assert len(body1["data"]) == 1
    assert body1["has_more"] is True

    page2 = client.get(
        f"/api/v1/documents/?limit=1&starting_after={body1['data'][0]['id']}",
        headers=_auth_headers(user.email),
    )
    assert page2.status_code == 200
    body2 = page2.json()
    assert len(body2["data"]) == 1
    assert body2["data"][0]["id"] != body1["data"][0]["id"]
    assert body2["has_more"] is False
