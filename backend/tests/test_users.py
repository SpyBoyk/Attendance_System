def test_create_user_requires_admin(client, db_session):
    from app.core.security import create_access_token
    from app.modules.users.models import UserRole
    from app.modules.users.service import create_user

    teacher, _ = create_user(db_session, "Teacher", "teacher@test.edu", UserRole.TEACHER, None, "Password123!")
    token = create_access_token(teacher.id, teacher.email, teacher.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        "/api/v1/users",
        json={"full_name": "Student A", "email": "a@test.edu", "role": "STUDENT"},
        headers=headers,
    )
    assert resp.status_code == 403


def test_admin_creates_user_with_temp_password(client, auth_headers):
    resp = client.post(
        "/api/v1/users",
        json={"full_name": "Student A", "email": "a@test.edu", "role": "STUDENT"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["must_change_password"] is True
    assert body["temp_password"]


def test_duplicate_email_rejected(client, auth_headers):
    payload = {"full_name": "Student A", "email": "dup@test.edu", "role": "STUDENT"}
    client.post("/api/v1/users", json=payload, headers=auth_headers)
    resp = client.post("/api/v1/users", json=payload, headers=auth_headers)
    assert resp.status_code == 409


def test_list_and_deactivate_user(client, auth_headers):
    create = client.post(
        "/api/v1/users",
        json={"full_name": "Student B", "email": "b@test.edu", "role": "STUDENT"},
        headers=auth_headers,
    )
    user_id = create.json()["id"]

    listed = client.get("/api/v1/users", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1

    deactivate = client.delete(f"/api/v1/users/{user_id}", headers=auth_headers)
    assert deactivate.status_code == 204

    fetched = client.get(f"/api/v1/users/{user_id}", headers=auth_headers)
    assert fetched.json()["is_active"] is False
