def _create_department(client, headers, code="CSE"):
    resp = client.post("/api/v1/departments", json={"name": "Computer Science", "code": code}, headers=headers)
    assert resp.status_code == 201
    return resp.json()


def _create_course(client, headers, department_id, code="CS101"):
    resp = client.post(
        "/api/v1/courses",
        json={"code": code, "name": "Intro to CS", "department_id": department_id, "credits": 4, "semester": 1},
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()


def _create_section(client, headers, department_id):
    resp = client.post(
        "/api/v1/sections",
        json={"name": "CSE-1A", "department_id": department_id, "academic_year": "2025-26", "year_level": 1},
        headers=headers,
    )
    assert resp.status_code == 201
    return resp.json()


def test_department_course_section_crud(client, auth_headers):
    dept = _create_department(client, auth_headers)
    course = _create_course(client, auth_headers, dept["id"])
    section = _create_section(client, auth_headers, dept["id"])

    assert course["department_id"] == dept["id"]
    assert section["department_id"] == dept["id"]

    listed = client.get("/api/v1/departments", headers=auth_headers).json()
    assert any(d["id"] == dept["id"] for d in listed)


def test_duplicate_department_code_rejected(client, auth_headers):
    _create_department(client, auth_headers, code="ECE")
    resp = client.post("/api/v1/departments", json={"name": "Electronics", "code": "ECE"}, headers=auth_headers)
    assert resp.status_code == 409


def test_enroll_and_roster(client, auth_headers):
    dept = _create_department(client, auth_headers, code="MECH")
    course = _create_course(client, auth_headers, dept["id"], code="ME101")
    section = _create_section(client, auth_headers, dept["id"])

    student = client.post(
        "/api/v1/users",
        json={"full_name": "Stu One", "email": "stu1@test.edu", "role": "STUDENT"},
        headers=auth_headers,
    ).json()

    enroll = client.post(
        f"/api/v1/sections/{section['id']}/enroll",
        json={"student_ids": [student["id"]], "course_id": course["id"], "academic_year": "2025-26"},
        headers=auth_headers,
    )
    assert enroll.status_code == 200
    assert len(enroll.json()) == 1

    roster = client.get(f"/api/v1/sections/{section['id']}/roster", headers=auth_headers)
    assert roster.status_code == 200
    assert any(r["student_id"] == student["id"] for r in roster.json())


def test_timetable_slot_conflict(client, auth_headers):
    dept = _create_department(client, auth_headers, code="CIVIL")
    course = _create_course(client, auth_headers, dept["id"], code="CV101")
    section = _create_section(client, auth_headers, dept["id"])
    teacher = client.post(
        "/api/v1/users",
        json={"full_name": "Prof X", "email": "profx@test.edu", "role": "TEACHER"},
        headers=auth_headers,
    ).json()

    payload = {
        "course_id": course["id"],
        "section_id": section["id"],
        "teacher_id": teacher["id"],
        "room": "101",
        "day_of_week": 0,
        "start_time": "09:00:00",
        "end_time": "10:00:00",
        "academic_year": "2025-26",
    }
    first = client.post("/api/v1/timetable", json=payload, headers=auth_headers)
    assert first.status_code == 201

    second = client.post("/api/v1/timetable", json=payload, headers=auth_headers)
    assert second.status_code == 409
