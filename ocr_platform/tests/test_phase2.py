import uuid
from unittest.mock import MagicMock, patch

import pytest

from app.accounts.models import ApiKey, SubscriptionProfile, User
from app.advisor.models import ChatSession, Document
from app.billing.service import generate_api_key
from app.core.idempotency import IdempotencyKey
from app.core.security import create_access_token, hash_password
from app.ocr_engine.models import OcrJob
from app.registry.models import Engine, Tier
from app.webhooks.models import WebhookDelivery

pytestmark = pytest.mark.usefixtures("mock_celery_ocr_task")


@pytest.fixture
def mock_celery_ocr_task():
    with patch("workers.celery_app.process_ocr_job_task") as mock_task:
        mock_task.delay.return_value = None
        yield mock_task


def _auth_headers(email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(email)}"}


def _create_user(db_session, email: str = "phase2@example.com") -> User:
    user = User(email=email, password_hash=hash_password("password123"), full_name="Phase2 User")
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


def _ensure_tier_and_engine(db_session):
    tier = db_session.query(Tier).filter(Tier.slug == "basic").first()
    if not tier:
        tier = Tier(slug="basic", public_name="Essential", description="Basic", quota_limit=500)
        db_session.add(tier)
        db_session.flush()

    engine = db_session.query(Engine).filter(Engine.slug == "trocr-base").first()
    if not engine:
        engine = Engine(
            slug="trocr-base",
            tier_id=tier.id,
            display_name="TrOCR Base",
            adapter_type="trocr-base",
            capability_tags=["printed_text"],
            benchmark_scores={"form": 0.9},
            cost_profile="low",
        )
        db_session.add(engine)
    db_session.commit()
    return tier, engine


def test_idempotency_replay_returns_same_ocr_job(client, db_session):
    user = _create_user(db_session)
    raw_key, _ = _create_api_key(db_session, user)
    doc = _create_document(db_session, user)
    headers = {"x-api-key": raw_key, "Idempotency-Key": "ocr-job-key-001"}
    payload = {"document_id": str(doc.id)}

    first = client.post("/api/v1/ocr/jobs/", headers=headers, json=payload)
    second = client.post("/api/v1/ocr/jobs/", headers=headers, json=payload)

    assert first.status_code == 202
    assert second.status_code == 202
    assert first.json()["id"] == second.json()["id"]
    assert db_session.query(IdempotencyKey).count() == 1


def test_idempotency_conflict_on_different_body(client, db_session):
    user = _create_user(db_session, email="idem-conflict@example.com")
    raw_key, _ = _create_api_key(db_session, user)
    doc = _create_document(db_session, user)
    headers = {"x-api-key": raw_key, "Idempotency-Key": "ocr-job-key-conflict"}

    client.post(
        "/api/v1/ocr/jobs/",
        headers=headers,
        json={"document_id": str(doc.id), "tier_slug": "basic"},
    )
    response = client.post(
        "/api/v1/ocr/jobs/",
        headers=headers,
        json={"document_id": str(doc.id), "tier_slug": "pro"},
    )

    assert response.status_code == 409
    assert response.json()["error"] == "CONFLICT"


def test_idempotency_replay_billing_checkout(client, db_session):
    user = _create_user(db_session, email="checkout-idem@example.com")
    _ensure_tier_and_engine(db_session)
    headers = {
        **_auth_headers("checkout-idem@example.com"),
        "Idempotency-Key": "checkout-key-001",
    }

    first = client.post("/api/v1/billing/checkout/", headers=headers, json={"tier_slug": "basic"})
    second = client.post("/api/v1/billing/checkout/", headers=headers, json={"tier_slug": "basic"})

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["session_id"] == second.json()["session_id"]


def test_ocr_job_response_includes_request_id_and_created_at(client, db_session):
    user = _create_user(db_session, email="metadata@example.com")
    raw_key, _ = _create_api_key(db_session, user)
    doc = _create_document(db_session, user)

    response = client.post(
        "/api/v1/ocr/jobs/",
        headers={"x-api-key": raw_key, "X-Request-ID": "trace-phase2-001"},
        json={"document_id": str(doc.id)},
    )

    assert response.status_code == 202
    body = response.json()
    assert body["request_id"] == "trace-phase2-001"
    assert body["created_at"] is not None


@patch("app.webhooks.service.httpx.post")
def test_webhook_dispatch_on_job_completion(mock_post, db_session):
    mock_post.return_value = MagicMock(status_code=200, raise_for_status=lambda: None)

    user = _create_user(db_session, email="webhook@example.com")
    doc = _create_document(db_session, user)
    _ensure_tier_and_engine(db_session)

    job = OcrJob(
        user_id=user.id,
        document_id=doc.id,
        job_type="production",
        status="queued",
        webhook_url="https://example.com/hooks/ocr",
    )
    db_session.add(job)
    db_session.commit()

    from app.ocr_engine.service import process_ocr_job

    with patch("workers.celery_app.deliver_webhook_task") as mock_webhook_task:
        mock_webhook_task.delay.side_effect = Exception("celery unavailable")
        with patch("app.ocr_engine.service.run_ocr") as mock_ocr:
            mock_ocr.return_value = {
                "text": "hello",
                "layout": {},
                "confidence": 0.99,
                "timing_ms": 10,
            }
            with patch("app.ocr_engine.service.storage.download", return_value=b"pdf-bytes"):
                with patch("app.ocr_engine.service.storage.upload", return_value="results/job.json"):
                    process_ocr_job(db_session, str(job.id))

    delivery = db_session.query(WebhookDelivery).filter(WebhookDelivery.job_id == job.id).first()
    assert delivery is not None
    assert delivery.status == "delivered"
    assert delivery.payload["event"] == "job.completed"
    assert delivery.payload["job_id"] == str(job.id)

    mock_post.assert_called_once()
    call_kwargs = mock_post.call_args.kwargs
    assert call_kwargs["headers"]["X-OCR-Signature"].startswith("sha256=")


def test_webhook_signature_verification():
    from app.webhooks.service import sign_payload, verify_signature

    payload = b'{"event":"job.completed","job_id":"abc"}'
    signature = sign_payload(payload)
    assert verify_signature(payload, signature)
    assert not verify_signature(payload, "sha256=invalid")
