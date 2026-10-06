import cv2
import numpy as np


def _blank_image_bytes() -> bytes:
    """A plain gray square -- guaranteed to contain no detectable face,
    used to exercise the "no face found" error path without needing a real
    photo fixture."""
    arr = np.full((200, 200, 3), 128, dtype=np.uint8)
    ok, buf = cv2.imencode(".jpg", arr)
    assert ok
    return buf.tobytes()


def test_enroll_face_requires_admin(client, db_session):
    from app.core.security import create_access_token
    from app.modules.users.models import UserRole
    from app.modules.users.service import create_user

    student, _ = create_user(db_session, "Student One", "stu@test.edu", UserRole.STUDENT, None, "Password123!")
    token = create_access_token(student.id, student.email, student.role.value)
    headers = {"Authorization": f"Bearer {token}"}

    resp = client.post(
        f"/api/v1/enrollment/face/{student.id}",
        files={"photo": ("face.jpg", _blank_image_bytes(), "image/jpeg")},
        headers=headers,
    )
    assert resp.status_code == 403


def test_enroll_face_no_face_detected(client, auth_headers):
    from app.modules.users.models import UserRole
    from app.modules.users.service import create_user

    # NB: reuse admin's own db session indirectly via API to create a student
    create = client.post(
        "/api/v1/users",
        json={"full_name": "Student Two", "email": "stu2@test.edu", "role": "STUDENT"},
        headers=auth_headers,
    )
    student_id = create.json()["id"]

    resp = client.post(
        f"/api/v1/enrollment/face/{student_id}",
        files={"photo": ("face.jpg", _blank_image_bytes(), "image/jpeg")},
        headers=auth_headers,
    )
    assert resp.status_code == 422


def test_enrollment_status_lists_users(client, auth_headers):
    client.post(
        "/api/v1/users",
        json={"full_name": "Student Three", "email": "stu3@test.edu", "role": "STUDENT"},
        headers=auth_headers,
    )
    resp = client.get("/api/v1/enrollment/status", headers=auth_headers)
    assert resp.status_code == 200
    emails = [row["email"] for row in resp.json()]
    assert "stu3@test.edu" in emails
    assert all(row["enrolled"] is False for row in resp.json() if row["email"] == "stu3@test.edu")
