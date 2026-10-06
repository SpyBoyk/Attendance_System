"""One-time CLI to seed realistic demo data: 20 departments, 20 courses,
20 sections, 20 teachers, 20 HODs, 20 students, 20 timetable entries, plus
historical attendance sessions/events and staff clock-in history so the
admin dashboard and reports page have real numbers to show.

Usage (from backend/, with the venv active):
    python -m scripts.seed_demo_data

Safe to re-run: every insert is get-or-create keyed on a unique field
(department code, course code, section name, user email), so running it
twice does not duplicate rows.
"""

import random
import sys
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.database import SessionLocal, init_db  # noqa: E402
from app.modules.academics.models import ClassSection, Course, Department, Enrollment, ScheduledClass  # noqa: E402
from app.modules.attendance.models import AttendanceEvent, AttendanceSession, AttendanceStatus, CheckInMethod, SessionStatus  # noqa: E402
from app.modules.staff_attendance.models import StaffAttendance  # noqa: E402
from app.modules.users.models import User, UserRole  # noqa: E402

random.seed(42)

ACADEMIC_YEAR = "2025-26"

DEPARTMENTS = [
    ("Computer Science & Engineering", "CSE"),
    ("Information Technology", "IT"),
    ("Electronics & Communication", "ECE"),
    ("Electrical Engineering", "EE"),
    ("Mechanical Engineering", "ME"),
    ("Civil Engineering", "CE"),
    ("Chemical Engineering", "CHE"),
    ("Biotechnology", "BT"),
    ("Aerospace Engineering", "AE"),
    ("Automobile Engineering", "AU"),
    ("Instrumentation Engineering", "IE"),
    ("Metallurgical Engineering", "MT"),
    ("Mining Engineering", "MN"),
    ("Textile Engineering", "TX"),
    ("Agricultural Engineering", "AG"),
    ("Environmental Engineering", "EN"),
    ("Industrial Engineering", "IND"),
    ("Marine Engineering", "MR"),
    ("Petroleum Engineering", "PE"),
    ("Robotics & Automation", "RA"),
]

COURSE_NAMES = {
    "CSE": "Data Structures & Algorithms",
    "IT": "Web Technologies",
    "ECE": "Digital Electronics",
    "EE": "Power Systems",
    "ME": "Thermodynamics",
    "CE": "Structural Analysis",
    "CHE": "Process Engineering",
    "BT": "Molecular Biology",
    "AE": "Aerodynamics",
    "AU": "Vehicle Dynamics",
    "IE": "Control Systems",
    "MT": "Physical Metallurgy",
    "MN": "Mine Surveying",
    "TX": "Fabric Technology",
    "AG": "Farm Machinery",
    "EN": "Environmental Impact Assessment",
    "IND": "Operations Research",
    "MR": "Naval Architecture",
    "PE": "Reservoir Engineering",
    "RA": "Robot Kinematics",
}

ROOMS = ["101", "102", "201", "202", "301", "302", "Lab-1", "Lab-2", "Seminar Hall"]
TIME_SLOTS = [
    (time(9, 0), time(10, 0)),
    (time(10, 0), time(11, 0)),
    (time(11, 15), time(12, 15)),
    (time(13, 0), time(14, 0)),
    (time(14, 0), time(15, 0)),
]

FIRST_NAMES = [
    "Aarav", "Vihaan", "Aditya", "Vivaan", "Arjun", "Sai", "Reyansh", "Ayaan",
    "Krishna", "Ishaan", "Rohan", "Kabir", "Dhruv", "Yash", "Pranav", "Rudra",
    "Aryan", "Shaurya", "Advait", "Om",
    "Saanvi", "Ananya", "Diya", "Aadhya", "Kiara", "Myra", "Pari", "Anika",
    "Navya", "Riya", "Ishita", "Sara", "Siya", "Aarohi", "Avni", "Tara",
    "Kavya", "Meera", "Prisha", "Zara",
]
LAST_NAMES = [
    "Sharma", "Verma", "Gupta", "Patel", "Iyer", "Nair", "Reddy", "Rao",
    "Mehta", "Shah", "Kulkarni", "Joshi", "Desai", "Chavan", "Kapoor", "Malhotra",
    "Bose", "Chatterjee", "Pillai", "Menon", "Agarwal", "Bhatt", "Singh", "Yadav",
]

TEACHER_TITLES = ["Dr.", "Prof.", "Mr.", "Ms."]


def unique_name_pool(count: int) -> list[str]:
    pool: list[str] = []
    seen: set[str] = set()
    attempts = 0
    while len(pool) < count and attempts < count * 50:
        attempts += 1
        name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
        if name not in seen:
            seen.add(name)
            pool.append(name)
    return pool


def email_for(name: str, suffix: str, used: set[str]) -> str:
    base = name.lower().replace(" ", ".").replace("'", "")
    email = f"{base}.{suffix}@git.edu"
    n = 2
    while email in used:
        email = f"{base}{n}.{suffix}@git.edu"
        n += 1
    used.add(email)
    return email


def get_or_create_user(db, used_emails: set[str], *, full_name, email, role, department_id=None) -> User:
    existing = db.scalar(select(User).where(User.email == email))
    if existing:
        used_emails.add(email)
        return existing
    user = User(
        full_name=full_name,
        email=email,
        password_hash=hash_password("Passw0rd!"),
        role=role,
        department_id=department_id,
        is_active=True,
        must_change_password=False,
    )
    db.add(user)
    db.flush()
    used_emails.add(email)
    return user


def main() -> None:
    init_db()
    db = SessionLocal()
    used_emails: set[str] = set(e for (e,) in db.execute(select(User.email)).all())

    try:
        # ---- Departments ----
        departments: list[Department] = []
        for name, code in DEPARTMENTS:
            dept = db.scalar(select(Department).where(Department.code == code))
            if dept is None:
                dept = Department(name=name, code=code)
                db.add(dept)
                db.flush()
            departments.append(dept)
        db.commit()

        # ---- Teachers (one per department) ----
        teacher_names = unique_name_pool(20)
        teachers: list[User] = []
        for dept, name in zip(departments, teacher_names):
            title = random.choice(TEACHER_TITLES)
            email = email_for(name, "teacher", used_emails)
            t = get_or_create_user(
                db, used_emails, full_name=f"{title} {name}", email=email, role=UserRole.TEACHER, department_id=dept.id
            )
            teachers.append(t)
        db.commit()

        # ---- HODs (one per department, set as department head) ----
        hod_names = unique_name_pool(20)
        hods: list[User] = []
        for dept, name in zip(departments, hod_names):
            email = email_for(name, "hod", used_emails)
            h = get_or_create_user(
                db, used_emails, full_name=f"Dr. {name}", email=email, role=UserRole.HOD, department_id=dept.id
            )
            hods.append(h)
            dept.hod_user_id = h.id
        db.commit()

        # ---- Courses (one per department) ----
        courses: list[Course] = []
        for dept, (_, code) in zip(departments, DEPARTMENTS):
            course_code = f"{code}101"
            course = db.scalar(select(Course).where(Course.code == course_code))
            if course is None:
                course = Course(
                    code=course_code,
                    name=COURSE_NAMES[code],
                    department_id=dept.id,
                    credits=random.choice([3, 4]),
                    semester=random.choice([1, 2, 3, 4]),
                )
                db.add(course)
                db.flush()
            courses.append(course)
        db.commit()

        # ---- Sections (one per department) ----
        sections: list[ClassSection] = []
        for dept, (_, code) in zip(departments, DEPARTMENTS):
            section_name = f"{code}-3A"
            section = db.scalar(
                select(ClassSection).where(ClassSection.name == section_name, ClassSection.department_id == dept.id)
            )
            if section is None:
                section = ClassSection(name=section_name, department_id=dept.id, academic_year=ACADEMIC_YEAR, year_level=3)
                db.add(section)
                db.flush()
            sections.append(section)
        db.commit()

        # ---- Students: 20 total, concentrated into the first 5 departments
        # (5 sections x 4 students) so those sections have enough roster depth
        # for a believable attendance trend/defaulter list. ----
        student_names = unique_name_pool(20)
        students: list[User] = []
        active_dept_count = 5
        for i, name in enumerate(student_names):
            dept = departments[i % active_dept_count]
            email = email_for(name, "student", used_emails)
            s = get_or_create_user(db, used_emails, full_name=name, email=email, role=UserRole.STUDENT, department_id=dept.id)
            students.append(s)
        db.commit()

        # ---- Enrollments: each student enrolled in their department's section+course ----
        for i, student in enumerate(students):
            dept_idx = i % active_dept_count
            section = sections[dept_idx]
            course = courses[dept_idx]
            exists = db.scalar(
                select(Enrollment).where(
                    Enrollment.student_id == student.id,
                    Enrollment.section_id == section.id,
                    Enrollment.course_id == course.id,
                )
            )
            if exists is None:
                db.add(
                    Enrollment(
                        student_id=student.id, section_id=section.id, course_id=course.id, academic_year=ACADEMIC_YEAR
                    )
                )
        db.commit()

        # ---- Scheduled classes: one per department (20 total) ----
        scheduled_classes: list[ScheduledClass] = []
        for i, (dept, course, section, teacher) in enumerate(zip(departments, courses, sections, teachers)):
            day_of_week = i % 5
            start, end = TIME_SLOTS[i % len(TIME_SLOTS)]
            existing = db.scalar(
                select(ScheduledClass).where(
                    ScheduledClass.section_id == section.id,
                    ScheduledClass.day_of_week == day_of_week,
                    ScheduledClass.start_time == start,
                )
            )
            if existing is None:
                existing = ScheduledClass(
                    course_id=course.id,
                    section_id=section.id,
                    teacher_id=teacher.id,
                    room=random.choice(ROOMS),
                    day_of_week=day_of_week,
                    start_time=start,
                    end_time=end,
                    academic_year=ACADEMIC_YEAR,
                    is_active=True,
                )
                db.add(existing)
                db.flush()
            scheduled_classes.append(existing)
        db.commit()

        # ---- Historical attendance sessions + events for the 5 active
        # departments, covering the last 20 weekdays. ----
        today = date.today()
        weekdays: list[date] = []
        d = today
        while len(weekdays) < 20:
            d -= timedelta(days=1)
            if d.weekday() < 5:
                weekdays.append(d)
        weekdays.reverse()

        for dept_idx in range(active_dept_count):
            section = sections[dept_idx]
            course = courses[dept_idx]
            teacher = teachers[dept_idx]
            scheduled = scheduled_classes[dept_idx]
            roster = [s for i, s in enumerate(students) if i % active_dept_count == dept_idx]

            for session_date in weekdays:
                if session_date.weekday() != scheduled.day_of_week:
                    continue
                existing_session = db.scalar(
                    select(AttendanceSession).where(
                        AttendanceSession.section_id == section.id, AttendanceSession.session_date == session_date
                    )
                )
                if existing_session is not None:
                    continue
                start_dt = datetime.combine(session_date, scheduled.start_time, tzinfo=timezone.utc)
                end_dt = datetime.combine(session_date, scheduled.end_time, tzinfo=timezone.utc)
                sess = AttendanceSession(
                    scheduled_class_id=scheduled.id,
                    course_id=course.id,
                    section_id=section.id,
                    teacher_id=teacher.id,
                    session_date=session_date,
                    actual_start_at=start_dt,
                    actual_end_at=end_dt,
                    status=SessionStatus.CLOSED,
                    methods_enabled=["MANUAL"],
                    opened_by=teacher.id,
                )
                db.add(sess)
                db.flush()

                for student in roster:
                    roll = random.random()
                    if roll < 0.78:
                        status = AttendanceStatus.PRESENT
                    elif roll < 0.90:
                        status = AttendanceStatus.LATE
                    elif roll < 0.95:
                        status = AttendanceStatus.EXCUSED
                    else:
                        continue  # absent -- no event row
                    db.add(
                        AttendanceEvent(
                            session_id=sess.id,
                            student_id=student.id,
                            method=CheckInMethod.MANUAL,
                            status=status,
                            checked_in_at=start_dt,
                            recorded_by=teacher.id,
                        )
                    )
        db.commit()

        # ---- Staff attendance: 20 weekdays of clock-in history for every
        # teacher and HOD (40 staff total), ~90% attendance rate. ----
        staff = teachers + hods
        for person in staff:
            for day in weekdays:
                if random.random() < 0.1:
                    continue  # absent that day
                exists = db.scalar(
                    select(StaffAttendance).where(StaffAttendance.user_id == person.id, StaffAttendance.date == day)
                )
                if exists is not None:
                    continue
                check_in_hour = random.randint(8, 9)
                check_in_minute = random.randint(0, 59)
                check_in = datetime.combine(day, time(check_in_hour, check_in_minute), tzinfo=timezone.utc)
                check_out = datetime.combine(day, time(random.randint(16, 18), random.randint(0, 59)), tzinfo=timezone.utc)
                db.add(StaffAttendance(user_id=person.id, date=day, check_in_at=check_in, check_out_at=check_out))
        db.commit()

        print(
            f"Seeded: {len(departments)} departments, {len(courses)} courses, {len(sections)} sections, "
            f"{len(teachers)} teachers, {len(hods)} HODs, {len(students)} students, "
            f"{len(scheduled_classes)} scheduled classes, staff attendance for {len(staff)} staff over 20 weekdays."
        )
        print("Demo login password for every seeded teacher/HOD/student: Passw0rd!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
