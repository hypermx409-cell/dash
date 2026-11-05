def test_register_login_me(client):
    r = client.post("/api/auth/register", json={"email":"a@test.com","username":"alice","password":"password123"})
    assert r.status_code == 201
    r = client.post("/api/auth/login", json={"email":"a@test.com","password":"password123"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    r = client.get("/api/auth/me", headers={"Authorization":f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["username"] == "alice"


def test_protected_requires_token(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_duplicate_register(client):
    client.post("/api/auth/register", json={"email":"b@test.com","username":"bob","password":"password123"})
    r = client.post("/api/auth/register", json={"email":"b@test.com","username":"bob2","password":"password123"})
    assert r.status_code == 400
