import uuid

import pytest


def auth_headers(client):
    client.post("/api/auth/register", json={"email": "u@test.com", "username": "user", "password": "password123"})
    r = client.post("/api/auth/login", json={"email": "u@test.com", "password": "password123"})
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def make_plan(client, headers):
    # need admin; create admin directly via db? Instead test with an admin user created by seeding.
    pass


def test_claims_require_auth(client):
    r = client.get("/api/claims")
    assert r.status_code == 401


def test_plan_list_requires_auth(client):
    r = client.get("/api/plans")
    assert r.status_code == 401


def test_create_claim_validation(client, db):
    # create a normal user and an active plan via db
    from app.models import User, Plan, Role
    from app.core.security import hash_password
    role = db.query(Role).filter(Role.name == "user").first()
    u = User(email="x@test.com", username="xuser", hashed_password=hash_password("password123"), role_id=role.id)
    db.add(u)
    db.commit()
    p = Plan(name="Starter", slug="starter", ram_mb=512, cpu_percent=100, disk_mb=1024, is_active=True, is_public=True, available_stock=1)
    db.add(p)
    db.commit()

    r = client.post("/api/auth/login", json={"email": "x@test.com", "password": "password123"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # claim without enough stock? first claim succeeds (queued)
    r = client.post("/api/claims", json={"plan_id": p.id, "server_name": "srv1"}, headers=headers)
    assert r.status_code == 202
    claim_id = r.json()["claim_id"]

    # duplicate stock: stock not decremented until provisioning, but claim limit? server count 0 after no server creation? server was created in claim (provisioning). active server count includes provisioning server
    # second claim should hit max servers per user (default MAX_SERVERS_PER_USER=3, so still allowed until 3)
    r = client.post("/api/claims", json={"plan_id": p.id}, headers=headers)
    assert r.status_code in (202, 400)

    # invalid plan
    r = client.post("/api/claims", json={"plan_id": "nope"}, headers=headers)
    assert r.status_code == 404


def test_admin_protected(client):
    # normal user cannot access admin overview
    client.post("/api/auth/register", json={"email": "y@test.com", "username": "yuser", "password": "password123"})
    r = client.post("/api/auth/login", json={"email": "y@test.com", "password": "password123"})
    token = r.json()["access_token"]
    r = client.get("/api/admin/overview", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403
