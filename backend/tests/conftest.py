import os
import pytest

os.environ.setdefault("DATABASE_URL", "sqlite:///./test_dash0.db")
os.environ.setdefault("SECRET_KEY", "test-secret-key-1234567890")
os.environ.setdefault("PTERO_PANEL_URL", "")
os.environ.setdefault("PTERO_API_KEY", "")

from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.core.db import Base, get_db, engine, SessionLocal as AppSessionLocal

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function", autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    s = TestingSessionLocal()
    try:
        yield s
    finally:
        s.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
