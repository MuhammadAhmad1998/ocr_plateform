import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from starlette.testclient import TestClient

SERVICE_ROOT = Path(__file__).resolve().parents[1]
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("USE_LOCAL_STORAGE", "true")
os.environ.setdefault("LOCAL_STORAGE_PATH", "/tmp/ai-service-test-storage")

from platform_api.config import get_settings

get_settings.cache_clear()


@pytest.fixture(autouse=True)
def _patch_startup(monkeypatch):
    monkeypatch.setattr("platform_api.main.preload_ml_models", lambda: None)


@pytest.fixture(scope="session")
def engine():
    import platform_api.models  # noqa: F401
    from platform_api.database import Base

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
    from platform_api.database import get_db
    from platform_api.main import app
    from platform_api.seed import seed_registry

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    seed_registry(db_session)
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
