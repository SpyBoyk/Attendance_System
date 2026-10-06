def _setup_class(client, auth_headers):
    dept = client.post("/api/v1/departments", json={"name": "CS", "code": "CS"}, headers=auth_headers).json()
    course = client.post(
        "/api/v1/courses",
        json={"code": "CS200", "name": "Data Structures", "department_id": dept["id"], "credits": 4, "semester": 2},
        headers=auth_headers,
    ).json()
    section = client.post(
        "/api/v1/sections",
        json={"name": "CSE-2A", "department_id": dept["id"], "academic_year": "2025-26", "year_level": 2},
        headers=auth_headers,
    ).json()
    teacher_create = client.post(
        "/api/v1/users",
        json={
            "full_name": "Teacher One",
            "email": "teacher1@test.edu",
            "role": "TEACHER",
            "password": "Password123!",
        },
        headers=auth_headers,
    ).json()
    student = client.post(
        "/api/v1/users",
        json={"full_name": "Student One", "email": "student1@test.edu", "role": "STUDENT"},
        headers=auth_headers,
    ).json()
    client.post(
        f"/api/v1/sections/{section['id']}/enroll",
        json={"student_ids": [student["id"]], "course_id": course["id"], "academic_year": "2025-26"},
        headers=auth_headers,
    )
    scheduled = client.post(
        "/api/v1/timetable",
        json={
            "course_id": course["id"],
            "section_id": section["id"],
            "teacher_id": teacher_create["id"],
            "room": "Lab 1",
            "day_of_week": 1,
            "start_time": "11:00:00",
            "end_time": "12:00:00",
            "academic_year": "2025-26",
        },
        headers=auth_headers,
    ).json()

    from app.core.security import create_access_token

    token = create_access_token(teacher_create["id"], teacher_create["email"], teacher_create["role"])
    teacher_headers = {"Authorization": f"Bearer {token}"}
    return scheduled, student, teacher_headers


def test_open_session_and_mark_present(client, auth_headers):
    scheduled, student, teacher_headers = _setup_class(client, auth_headers)

    opened = client.post(
        "/api/v1/attendance/sessions", json={"scheduled_class_id": scheduled["id"]}, headers=teacher_headers
    )
    assert opened.status_code == 200
    session = opened.json()
    assert session["status"] == "OPEN"

    checkin = client.post(
        "/api/v1/attendance/checkin/manual",
        json={"session_id": session["id"], "student_id": student["id"], "status": "PRESENT"},
        headers=teacher_headers,
    )
    assert checkin.status_code == 200
    assert checkin.json()["status"] == "PRESENT"

    roster = client.get(f"/api/v1/attendance/sessions/{session['id']}/roster", headers=teacher_headers)
    assert roster.status_code == 200
    entry = next(r for r in roster.json() if r["student_id"] == student["id"])
    assert entry["event"]["status"] == "PRESENT"


def test_cannot_open_duplicate_session_same_day(client, auth_headers):
    scheduled, _, teacher_headers = _setup_class(client, auth_headers)

    first = client.post(
        "/api/v1/attendance/sessions", json={"scheduled_class_id": scheduled["id"]}, headers=teacher_headers
    )
    assert first.status_code == 200

    second = client.post(
        "/api/v1/attendance/sessions", json={"scheduled_class_id": scheduled["id"]}, headers=teacher_headers
    )
    assert second.status_code == 409


def test_remove_checkin_marks_absent(client, auth_headers):
    scheduled, student, teacher_headers = _setup_class(client, auth_headers)
    session = client.post(
        "/api/v1/attendance/sessions", json={"scheduled_class_id": scheduled["id"]}, headers=teacher_headers
    ).json()

    client.post(
        "/api/v1/attendance/checkin/manual",
        json={"session_id": session["id"], "student_id": student["id"], "status": "PRESENT"},
        headers=teacher_headers,
    )
    remove = client.delete(
        f"/api/v1/attendance/sessions/{session['id']}/checkin/{student['id']}", headers=teacher_headers
    )
    assert remove.status_code == 204

    roster = client.get(f"/api/v1/attendance/sessions/{session['id']}/roster", headers=teacher_headers).json()
    entry = next(r for r in roster if r["student_id"] == student["id"])
    assert entry["event"] is None


def test_close_session(client, auth_headers):
    scheduled, _, teacher_headers = _setup_class(client, auth_headers)
    session = client.post(
        "/api/v1/attendance/sessions", json={"scheduled_class_id": scheduled["id"]}, headers=teacher_headers
    ).json()

    closed = client.post(f"/api/v1/attendance/sessions/{session['id']}/close", headers=teacher_headers)
    assert closed.status_code == 200
    assert closed.json()["status"] == "CLOSED"

    checkin = client.post(
        "/api/v1/attendance/checkin/manual",
        json={"session_id": session["id"], "student_id": "whoever", "status": "PRESENT"},
        headers=teacher_headers,
    )
    assert checkin.status_code == 409
