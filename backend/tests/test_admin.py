from app.models import User, Role
from app.core.security import hash_password


def make_admin(db):
    role = db.query(Role).filter(Role.name == "admin").first()
    u = User(email="admin@test.com", username="admin", hashed_password=hash_password("password123"), role_id=role.id, is_active=True)
    db.add(u); db.commit()
    return u


def test_admin_overview_success(client, db):
    make_admin(db)
    r = client.post("/api/auth/login", json={"email": "admin@test.com", "password": "password123"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    r = client.get("/api/admin/overview", headers=headers)
    assert r.status_code == 200
    assert "total_users" in r.json()


def test_normal_user_cannot_create_plan(client):
    client.post("/api/auth/register", json={"email": "n@test.com", "username": "nuser", "password": "password123"})
    r = client.post("/api/auth/login", json={"email": "n@test.com", "password": "password123"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    r = client.post("/api/admin/plans", json={"name": "X", "slug": "x", "ram_mb": 512, "cpu_percent": 100, "disk_mb": 1024}, headers=headers)
    assert r.status_code == 403
