import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("DEBUG", "true")
os.environ.setdefault("USE_LOCAL_STORAGE", "true")
os.environ.setdefault("LOCAL_STORAGE_PATH", "/tmp/ocr-test-storage")
os.environ.setdefault("USE_MOCK_RAG", "true")

from app.core.config import get_settings

get_settings.cache_clear()


@pytest.fixture(autouse=True)
def _sqlite_test_patches(monkeypatch):
    """Skip PostgreSQL-only startup steps when tests use in-memory SQLite."""
    if not get_settings().DATABASE_URL.startswith("sqlite"):
        return
    monkeypatch.setattr("app.rag.store.ensure_pgvector_extension", lambda: None)
    monkeypatch.setattr("app.core.db_bootstrap.wait_for_database", lambda engine: None)
    monkeypatch.setattr("app.core.db_bootstrap.sync_database_schema", lambda engine: None)
    monkeypatch.setattr("app.seed.seed_database", lambda: None)


@pytest.fixture(scope="session")
def engine():
    import app.models  # noqa: F401
    from app.core.database import Base

    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    Base.metadata.create_all(bind=test_engine)
    return test_engine


@pytest.fixture
def db_session(engine):
    connection = engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(engine, db_session):
    from app.core.database import get_db
    from app.main import app
    from app.registry.models import Tier

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    if not db_session.query(Tier).filter(Tier.slug == "free").first():
        db_session.add(
            Tier(
                slug="free",
                public_name="Starter",
                description="Free tier",
                quota_limit=50,
            )
        )
        db_session.commit()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()
