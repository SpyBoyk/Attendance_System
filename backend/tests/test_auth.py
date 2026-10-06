def test_login_success(client, db_session):
    from app.modules.users.models import UserRole
    from app.modules.users.service import create_user

    create_user(db_session, "Jane Doe", "jane@test.edu", UserRole.ADMIN, None, "Password123!")

    resp = client.post("/api/v1/auth/login", json={"email": "jane@test.edu", "password": "Password123!"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["user"]["email"] == "jane@test.edu"
    assert body["access_token"]


def test_non_admin_password_login_rejected(client, db_session):
    """Only ADMIN accounts may use password login -- every other role signs
    in with face recognition instead (see login_via_face)."""
    from app.modules.users.models import UserRole
    from app.modules.users.service import create_user

    create_user(db_session, "Jane Doe", "jane3@test.edu", UserRole.TEACHER, None, "Password123!")

    resp = client.post("/api/v1/auth/login", json={"email": "jane3@test.edu", "password": "Password123!"})
    assert resp.status_code == 403


def test_login_wrong_password(client, db_session):
    from app.modules.users.models import UserRole
    from app.modules.users.service import create_user

    create_user(db_session, "Jane Doe", "jane2@test.edu", UserRole.TEACHER, None, "Password123!")

    resp = client.post("/api/v1/auth/login", json={"email": "jane2@test.edu", "password": "wrong"})
    assert resp.status_code == 401


def test_me_requires_token(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_me_with_token(client, auth_headers):
    resp = client.get("/api/v1/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["role"] == "ADMIN"
