"""Scale out demo data: adds 100 more students to EVERY department (not
just the 5 "active" ones seed_demo_data.py populated), enrolls each into
that department's existing section/course, and backfills attendance events
for them across that department's existing session history -- creating
that history from scratch for the 15 departments that never had any.

Usage (from backend/, with the venv active):
    python -m scripts.seed_scale_students

Safe to re-run: students are always newly created (random name -> unique
email), and session/event creation is get-or-create keyed on
(section, date) / (session, student), so re-running just tops up further.
"""

import random
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.database import SessionLocal, init_db  # noqa: E402
from app.modules.academics.models import ClassSection, Course, Department, Enrollment, ScheduledClass  # noqa: E402
from app.modules.attendance.models import AttendanceEvent, AttendanceSession, AttendanceStatus, CheckInMethod, SessionStatus  # noqa: E402
from app.modules.users.models import User, UserRole  # noqa: E402
from scripts.seed_demo_data import FIRST_NAMES, LAST_NAMES, email_for  # noqa: E402

random.seed(99)

ACADEMIC_YEAR = "2025-26"
STUDENTS_PER_DEPARTMENT = 100


def session_dates_for(day_of_week: int) -> list[date]:
    """Same 20-weekday window seed_demo_data.py used, filtered to the one
    weekday a department's scheduled class actually meets on -- keeps new
    sessions inside the same date range as the ones already seeded."""
    today = date.today()
    weekdays: list[date] = []
    d = today
    while len(weekdays) < 20:
        d -= timedelta(days=1)
        if d.weekday() < 5:
            weekdays.append(d)
    weekdays.reverse()
    return [d for d in weekdays if d.weekday() == day_of_week]


def main() -> None:
    init_db()
    db = SessionLocal()
    used_emails: set[str] = set(e for (e,) in db.execute(select(User.email)).all())

    try:
        departments = list(db.scalars(select(Department).order_by(Department.code)))
        total_students = 0

        for dept in departments:
            section = db.scalar(select(ClassSection).where(ClassSection.department_id == dept.id))
            course = db.scalar(select(Course).where(Course.department_id == dept.id))
            scheduled = (
                db.scalar(select(ScheduledClass).where(ScheduledClass.section_id == section.id))
                if section
                else None
            )
            if section is None or course is None:
                print(f"{dept.code}: skipped (no section/course seeded yet)")
                continue

            new_student_ids: list[str] = []
            for _ in range(STUDENTS_PER_DEPARTMENT):
                name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
                email = email_for(name, "student", used_emails)
                student = User(
                    full_name=name,
                    email=email,
                    password_hash=hash_password("Passw0rd!"),
                    role=UserRole.STUDENT,
                    department_id=dept.id,
                    is_active=True,
                    must_change_password=False,
                )
                db.add(student)
                db.flush()
                db.add(
                    Enrollment(
                        student_id=student.id, section_id=section.id, course_id=course.id, academic_year=ACADEMIC_YEAR
                    )
                )
                new_student_ids.append(student.id)
            db.commit()
            total_students += len(new_student_ids)

            if scheduled is None:
                print(f"{dept.code}: +{len(new_student_ids)} students (no timetable entry, skipped attendance history)")
                continue

            roster = list(
                db.scalars(select(Enrollment.student_id).where(Enrollment.section_id == section.id).distinct())
            )

            for session_date in session_dates_for(scheduled.day_of_week):
                session = db.scalar(
                    select(AttendanceSession).where(
                        AttendanceSession.section_id == section.id, AttendanceSession.session_date == session_date
                    )
                )
                if session is None:
                    start_dt = datetime.combine(session_date, scheduled.start_time, tzinfo=timezone.utc)
                    end_dt = datetime.combine(session_date, scheduled.end_time, tzinfo=timezone.utc)
                    session = AttendanceSession(
                        scheduled_class_id=scheduled.id,
                        course_id=course.id,
                        section_id=section.id,
                        teacher_id=scheduled.teacher_id,
                        session_date=session_date,
                        actual_start_at=start_dt,
                        actual_end_at=end_dt,
                        status=SessionStatus.CLOSED,
                        methods_enabled=["MANUAL"],
                        opened_by=scheduled.teacher_id,
                    )
                    db.add(session)
                    db.flush()

                already = set(
                    db.scalars(select(AttendanceEvent.student_id).where(AttendanceEvent.session_id == session.id))
                )
                start_dt = datetime.combine(session_date, scheduled.start_time, tzinfo=timezone.utc)
                for student_id in roster:
                    if student_id in already:
                        continue
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
                            session_id=session.id,
                            student_id=student_id,
                            method=CheckInMethod.MANUAL,
                            status=status,
                            checked_in_at=start_dt,
                            recorded_by=scheduled.teacher_id,
                        )
                    )
                db.commit()

            print(f"{dept.code}: +{len(new_student_ids)} students, attendance history backfilled")

        print(f"\nDone. {total_students} students added across {len(departments)} departments.")
        print("Demo login password for every seeded student: Passw0rd!")
    finally:
        db.close()


if __name__ == "__main__":
    main()
