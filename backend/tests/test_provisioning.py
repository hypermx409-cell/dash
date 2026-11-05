import os
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_dash0.db")

import pytest
from unittest.mock import AsyncMock, patch

from app.models import User, Plan, Role, Claim, ProvisioningJob, Server
from app.core.security import hash_password


class FakeClient:
    def configured(self):
        return True
    async def get_or_create_user(self, email, username):
        return {"id": 42}
    async def _request(self, method, path, **kwargs):
        class R:
            status_code = 200
            def json(self): return {"attributes": {"docker_image":"img","startup":"npm start","variables":[]}}
        return R()
    async def create_server(self, payload):
        return {"id": 99, "identifier": "abcd1234"}
    async def _resolve_allocation(self, *a, **k):
        return None


@pytest.fixture(autouse=True)
def mock_ptero(monkeypatch):
    monkeypatch.setattr("app.services.provisioning.PterodactylClient", lambda: FakeClient())
    yield


def make_user_plan(db):
    role = db.query(Role).filter(Role.name == "user").first()
    u = User(email="p@test.com", username="puser", hashed_password=hash_password("password123"), role_id=role.id)
    db.add(u); db.commit()
    p = Plan(name="Pro", slug="pro", ram_mb=1024, cpu_percent=100, disk_mb=2048, is_active=True, is_public=True, available_stock=5,
              egg_id=1, node_id=1)
    db.add(p); db.commit()
    return u, p


def test_provisioning_success(client, db):
    u, p = make_user_plan(db)
    # need settings default nest/allocation? override via db config? Settings are env-based; avoid by patching settings attributes
    import app.config as cfg
    cfg.settings.PTERO_DEFAULT_NEST_ID = 1
    cfg.settings.PTERO_DEFAULT_ALLOCATION_ID = 10
    cfg.settings.PTERO_DEFAULT_NODE_ID = 1
    cfg.settings.PTERO_DEFAULT_EGG_ID = 1

    r = client.post("/api/auth/login", json={"email": "p@test.com", "password": "password123"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = client.post("/api/claims", json={"plan_id": p.id}, headers=headers)
    assert r.status_code == 202
    claim_id = r.json()["claim_id"]

    # After response, background task should have run
    c = client.get(f"/api/claims/{claim_id}", headers=headers)
    assert c.json()["status"] in ("completed", "pending", "provisioning")
    # Check DB state
    from app.core.db import SessionLocal
    s = db
    cl = s.get(Claim, claim_id)
    assert cl.status == "completed", cl.error_message
    server = cl.server
    assert server.ptero_server_id == 99
    assert server.ptero_identifier == "abcd1234"


def test_retry_failed(client, db, monkeypatch):
    # Force failure first
    class FailClient(FakeClient):
        async def create_server(self, payload):
            raise Exception("boom")
    monkeypatch.setattr("app.services.provisioning.PterodactylClient", lambda: FailClient())
    u, p = make_user_plan(db)
    import app.config as cfg
    cfg.settings.PTERO_DEFAULT_NEST_ID = 1
    cfg.settings.PTERO_DEFAULT_ALLOCATION_ID = 10
    cfg.settings.PTERO_DEFAULT_NODE_ID = 1
    cfg.settings.PTERO_DEFAULT_EGG_ID = 1

    r = client.post("/api/auth/login", json={"email": "p@test.com", "password": "password123"})
    # user may already exist from previous test? db fresh per test function due conftest drop/create: yes
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post("/api/claims", json={"plan_id": p.id}, headers=headers)
    claim_id = r.json()["claim_id"]
    s = db
    cl = s.get(Claim, claim_id)
    assert cl.status == "failed"

    # now restore success client and retry
    monkeypatch.setattr("app.services.provisioning.PterodactylClient", lambda: FakeClient())
    r = client.post(f"/api/claims/{claim_id}/retry", headers=headers)
    assert r.status_code == 200
    cl = db.get(Claim, claim_id)
    db.refresh(cl)
    assert cl.status == "completed"
    assert cl.server.ptero_server_id == 99
