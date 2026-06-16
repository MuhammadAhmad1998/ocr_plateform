import io
import uuid

import pytest

from app.accounts.models import ApiKey, SubscriptionProfile, User
from app.advisor.models import Document
from app.billing.service import generate_api_key
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


def _api_key_headers(raw_key: str) -> dict[str, str]:
    return {"x-api-key": raw_key}


def _create_user(db_session, email: str = "v2@example.com") -> User:
    user = User(email=email, password_hash=hash_password("password123"), full_name="V2 User")
    db_session.add(user)
    db_session.flush()
    db_session.add(SubscriptionProfile(user_id=user.id, quota_limit=50, quota_used=0))
    db_session.commit()
    return user


def _create_api_key(db_session, user: User) -> tuple[str, ApiKey]:
    raw, key_hash, prefix = generate_api_key()
    api_key = ApiKey(
        user_id=user.id,
        key_hash=key_hash,
        key_prefix=prefix,
        name="V2 Test Key",
        scopes=["ocr:read", "ocr:write"],
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
    db_session.refresh(doc)
    return doc


def _ensure_engine(db_session):
    tier = db_session.query(Tier).filter(Tier.slug == "basic").first()
    if not tier:
        tier = Tier(slug="basic", public_name="Basic", quota_limit=100)
        db_session.add(tier)
        db_session.flush()
    if not db_session.query(Engine).filter(Engine.slug == "v2-engine").first():
        db_session.add(
            Engine(
                slug="v2-engine",
                tier_id=tier.id,
                display_name="V2 Engine",
                adapter_type="trocr-base",
                capability_tags=["printed_text"],
                benchmark_scores={"form": 0.9},
                cost_profile="low",
            )
        )
        db_session.commit()


def test_v2_submit_job_envelope_with_prefixed_ids(client, db_session):
    user = _create_user(db_session)
    raw_key, _ = _create_api_key(db_session, user)
    doc = _create_document(db_session, user)
    _ensure_engine(db_session)

    response = client.post(
        "/api/v2/ocr/jobs/",
        headers=_api_key_headers(raw_key),
        json={"document_id": f"doc_{doc.id}", "tier_slug": "basic"},
    )

    assert response.status_code == 202
    body = response.json()
    assert body["object"] == "ocr_job"
    assert body["id"].startswith("job_")
    assert body["data"]["status"] == "queued"
    assert body["data"]["job_type"] == "production"
    assert "created_at" in body
    assert body["request_id"] is not None


def test_v2_get_job_accepts_prefixed_id(client, db_session):
    user = _create_user(db_session, email="v2-get@example.com")
    raw_key, _ = _create_api_key(db_session, user)
    doc = _create_document(db_session, user)
    _ensure_engine(db_session)

    create_response = client.post(
        "/api/v2/ocr/jobs/",
        headers=_api_key_headers(raw_key),
        json={"document_id": str(doc.id), "tier_slug": "basic"},
    )
    job_id = create_response.json()["id"]

    get_response = client.get(
        f"/api/v2/ocr/jobs/{job_id}/",
        headers=_api_key_headers(raw_key),
    )

    assert get_response.status_code == 200
    body = get_response.json()
    assert body["object"] == "ocr_job"
    assert body["id"] == job_id


def test_v2_job_accepts_jwt_auth(client, db_session):
    user = _create_user(db_session, email="v2-jwt@example.com")
    doc = _create_document(db_session, user)
    _ensure_engine(db_session)

    response = client.post(
        "/api/v2/ocr/jobs/",
        headers=_auth_headers(user.email),
        json={"document_id": f"doc_{doc.id}"},
    )

    assert response.status_code == 202
    assert response.json()["object"] == "ocr_job"


def test_v2_get_document_envelope(client, db_session):
    user = _create_user(db_session, email="v2-doc@example.com")
    doc = _create_document(db_session, user)

    response = client.get(
        f"/api/v2/documents/doc_{doc.id}/",
        headers=_auth_headers(user.email),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["object"] == "document"
    assert body["id"] == f"doc_{doc.id}"
    assert body["data"]["filename"] == "test.pdf"
    assert body["data"]["page_count"] == 1


def test_v2_get_document_not_found(client, db_session):
    user = _create_user(db_session, email="v2-doc404@example.com")

    response = client.get(
        f"/api/v2/documents/doc_{uuid.uuid4()}/",
        headers=_auth_headers(user.email),
    )

    assert response.status_code == 404
    body = response.json()
    assert body["error"] == "NOT_FOUND"


def test_v2_upload_document_envelope(client, db_session):
    user = _create_user(db_session, email="v2-upload@example.com")
    file_content = b"%PDF-1.4 minimal"

    response = client.post(
        "/api/v2/documents/",
        headers=_auth_headers(user.email),
        files={"file": ("invoice.pdf", io.BytesIO(file_content), "application/pdf")},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["object"] == "document"
    assert body["id"].startswith("doc_")
    assert body["data"]["filename"] == "invoice.pdf"


def test_v2_upload_document_with_api_key(client, db_session):
    user = _create_user(db_session, email="v2-upload-key@example.com")
    raw_key, _ = _create_api_key(db_session, user)
    file_content = b"%PDF-1.4 minimal"

    response = client.post(
        "/api/v2/documents/",
        headers=_api_key_headers(raw_key),
        files={"file": ("scan.pdf", io.BytesIO(file_content), "application/pdf")},
    )

    assert response.status_code == 201
    assert response.json()["object"] == "document"


def test_v2_list_documents_envelope(client, db_session):
    user = _create_user(db_session, email="v2-list@example.com")
    _create_document(db_session, user)

    response = client.get(
        "/api/v2/documents/",
        headers=_auth_headers(user.email),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["object"] == "document_list"
    assert body["id"] is None
    assert "items" in body["data"]
    assert "has_more" in body["data"]
    assert len(body["data"]["items"]) >= 1
    assert body["data"]["items"][0]["object"] == "document"


def test_v2_models_envelope(client, db_session):
    user = _create_user(db_session, email="v2-models@example.com")
    _ensure_engine(db_session)

    response = client.get(
        "/api/v2/models/",
        headers=_api_key_headers(_create_api_key(db_session, user)[0]),
    )

    assert response.status_code == 200
    body = response.json()
    assert body["object"] == "model_catalog"
    assert "models" in body["data"]
    assert isinstance(body["data"]["models"], list)


def test_v1_ocr_jobs_unchanged(client, db_session):
    """Regression guard: v1 response shape must not change."""
    user = _create_user(db_session, email="v1-regression@example.com")
    raw_key, _ = _create_api_key(db_session, user)
    doc = _create_document(db_session, user)
    _ensure_engine(db_session)

    response = client.post(
        "/api/v1/ocr/jobs/",
        headers=_api_key_headers(raw_key),
        json={"document_id": str(doc.id)},
    )

    assert response.status_code == 202
    body = response.json()
    assert "object" not in body
    assert "id" in body
    assert not str(body["id"]).startswith("job_")
    assert "status" in body
