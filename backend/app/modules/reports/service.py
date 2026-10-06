from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.academics.models import ClassSection, Department, Enrollment
from app.modules.attendance.models import AttendanceEvent, AttendanceSession, AttendanceStatus, SessionStatus
from app.modules.reports.schemas import (
    DefaulterOut,
    DepartmentRateOut,
    OverviewOut,
    StatusBreakdownOut,
    TrendPointOut,
    WeekdayRateOut,
)
from app.modules.staff_attendance.service import get_staff_attendance_rate
from app.modules.users.models import User, UserRole

DEFAULTER_THRESHOLD = 75.0
MAX_DEFAULTERS = 20
WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class NotPermittedError(Exception):
    pass


def _rate(present: int, possible: int) -> float:
    return round(present / possible * 100, 1) if possible else 0.0


def resolve_department_scope(db: Session, actor: User) -> str | None:
    """Admins see everything (None = no scope). An HOD is pinned to the one
    department they head, regardless of what they ask for."""
    if actor.role == UserRole.ADMIN:
        return None
    dept = db.scalar(select(Department).where(Department.hod_user_id == actor.id))
    if dept is None:
        raise NotPermittedError("You are not assigned as HOD of any department")
    return dept.id


def get_overview(
    db: Session, actor: User, requested_department_id: str | None, start_date: date, end_date: date
) -> OverviewOut:
    scope = resolve_department_scope(db, actor)
    department_id = scope if scope is not None else requested_department_id

    session_q = (
        select(AttendanceSession)
        .join(ClassSection, ClassSection.id == AttendanceSession.section_id)
        .where(
            AttendanceSession.status == SessionStatus.CLOSED,
            AttendanceSession.session_date >= start_date,
            AttendanceSession.session_date <= end_date,
        )
    )
    if department_id:
        session_q = session_q.where(ClassSection.department_id == department_id)
    sessions = list(db.scalars(session_q))

    staff_rate = get_staff_attendance_rate(db, department_id, start_date, end_date)
    staff_by_department = _staff_by_department(db, department_id, start_date, end_date)

    if not sessions:
        return OverviewOut(
            start_date=start_date,
            end_date=end_date,
            attendance_rate=None,
            staff_attendance_rate=staff_rate,
            trend=[],
            by_department=[],
            defaulters=[],
            status_breakdown=StatusBreakdownOut(present=0, late=0, excused=0, absent=0),
            by_weekday=[],
            staff_by_department=staff_by_department,
        )

    session_ids = [s.id for s in sessions]
    section_ids = list({s.section_id for s in sessions})

    roster_by_section: dict[str, set[str]] = {}
    for section_id, student_id in db.execute(
        select(Enrollment.section_id, Enrollment.student_id).where(Enrollment.section_id.in_(section_ids)).distinct()
    ):
        roster_by_section.setdefault(section_id, set()).add(student_id)

    present_by_session: dict[str, set[str]] = {}
    status_counts = {AttendanceStatus.PRESENT: 0, AttendanceStatus.LATE: 0, AttendanceStatus.EXCUSED: 0}
    for event in db.scalars(select(AttendanceEvent).where(AttendanceEvent.session_id.in_(session_ids))):
        status_counts[event.status] = status_counts.get(event.status, 0) + 1
        if event.status in (AttendanceStatus.PRESENT, AttendanceStatus.LATE):
            present_by_session.setdefault(event.session_id, set()).add(event.student_id)

    section_department = {
        s.id: s.department_id for s in db.scalars(select(ClassSection).where(ClassSection.id.in_(section_ids)))
    }

    total_present = total_possible = 0
    daily: dict[date, list[int]] = {}
    dept_totals: dict[str, list[int]] = {}
    student_totals: dict[str, list[int]] = {}

    for session in sessions:
        roster = roster_by_section.get(session.section_id, set())
        present = present_by_session.get(session.id, set()) & roster
        possible = len(roster)
        got = len(present)

        total_present += got
        total_possible += possible

        bucket = daily.setdefault(session.session_date, [0, 0])
        bucket[0] += got
        bucket[1] += possible

        dept_id = section_department.get(session.section_id)
        if dept_id:
            dept_bucket = dept_totals.setdefault(dept_id, [0, 0])
            dept_bucket[0] += got
            dept_bucket[1] += possible

        for student_id in roster:
            student_bucket = student_totals.setdefault(student_id, [0, 0])
            student_bucket[1] += 1
            if student_id in present:
                student_bucket[0] += 1

    trend = [TrendPointOut(date=d, rate=_rate(p, t)) for d, (p, t) in sorted(daily.items())]

    weekday_totals: dict[int, list[int]] = {}
    for d, (p, t) in daily.items():
        bucket = weekday_totals.setdefault(d.weekday(), [0, 0])
        bucket[0] += p
        bucket[1] += t
    by_weekday = [
        WeekdayRateOut(weekday=wd, weekday_name=WEEKDAY_NAMES[wd], rate=_rate(p, t))
        for wd, (p, t) in sorted(weekday_totals.items())
    ]

    status_breakdown = StatusBreakdownOut(
        present=status_counts[AttendanceStatus.PRESENT],
        late=status_counts[AttendanceStatus.LATE],
        excused=status_counts[AttendanceStatus.EXCUSED],
        absent=max(0, total_possible - sum(status_counts.values())),
    )

    department_names = {d.id: d.name for d in db.scalars(select(Department))}
    by_department = sorted(
        (
            DepartmentRateOut(department_id=did, department_name=department_names.get(did, did), rate=_rate(p, t))
            for did, (p, t) in dept_totals.items()
        ),
        key=lambda r: r.department_name,
    )

    defaulter_ids = [sid for sid, (p, t) in student_totals.items() if t > 0 and (p / t * 100) < DEFAULTER_THRESHOLD]
    students = {u.id: u for u in db.scalars(select(User).where(User.id.in_(defaulter_ids)))} if defaulter_ids else {}
    defaulters = []
    for sid in defaulter_ids:
        student = students.get(sid)
        if student is None:
            continue
        present, possible = student_totals[sid]
        defaulters.append(
            DefaulterOut(
                student_id=sid,
                full_name=student.full_name,
                email=student.email,
                rate=_rate(present, possible),
                sessions_attended=present,
                sessions_total=possible,
            )
        )
    defaulters.sort(key=lambda r: r.rate)
    defaulters = defaulters[:MAX_DEFAULTERS]

    return OverviewOut(
        start_date=start_date,
        end_date=end_date,
        attendance_rate=_rate(total_present, total_possible),
        staff_attendance_rate=staff_rate,
        trend=trend,
        by_department=by_department,
        defaulters=defaulters,
        status_breakdown=status_breakdown,
        by_weekday=by_weekday,
        staff_by_department=staff_by_department,
    )


def _staff_by_department(
    db: Session, department_id: str | None, start_date: date, end_date: date
) -> list[DepartmentRateOut]:
    """Only meaningful institution-wide -- once a single department is
    already selected, a per-department breakdown is trivially one row, so
    skip the N extra queries and let the caller show the overall staff rate
    instead."""
    if department_id:
        return []
    rows = []
    for dept in db.scalars(select(Department).order_by(Department.name)):
        rate = get_staff_attendance_rate(db, dept.id, start_date, end_date)
        if rate is not None:
            rows.append(DepartmentRateOut(department_id=dept.id, department_name=dept.name, rate=rate))
    return rows
