from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.staff_attendance.models import StaffAttendance
from app.modules.users.models import User, UserRole


class NotCheckedInError(Exception):
    pass


class AlreadyCheckedOutError(Exception):
    pass


def check_in(db: Session, actor: User) -> StaffAttendance:
    today = datetime.now(timezone.utc).date()
    existing = db.scalar(
        select(StaffAttendance).where(StaffAttendance.user_id == actor.id, StaffAttendance.date == today)
    )
    if existing:
        return existing  # idempotent -- re-clicking check-in just returns today's row
    row = StaffAttendance(user_id=actor.id, date=today)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def check_out(db: Session, actor: User) -> StaffAttendance:
    today = datetime.now(timezone.utc).date()
    row = db.scalar(
        select(StaffAttendance).where(StaffAttendance.user_id == actor.id, StaffAttendance.date == today)
    )
    if row is None:
        raise NotCheckedInError("Check in before checking out")
    if row.check_out_at is not None:
        raise AlreadyCheckedOutError("Already checked out today")
    row.check_out_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row


def list_my(db: Session, user_id: str, start_date: date, end_date: date) -> list[StaffAttendance]:
    return list(
        db.scalars(
            select(StaffAttendance)
            .where(
                StaffAttendance.user_id == user_id,
                StaffAttendance.date >= start_date,
                StaffAttendance.date <= end_date,
            )
            .order_by(StaffAttendance.date.desc())
        )
    )


def working_days_between(start_date: date, end_date: date) -> list[date]:
    """Monday-Friday only -- the college doesn't hold weekend classes."""
    days = []
    d = start_date
    while d <= end_date:
        if d.weekday() < 5:
            days.append(d)
        d += timedelta(days=1)
    return days


def get_staff_attendance_rate(db: Session, department_id: str | None, start_date: date, end_date: date) -> float | None:
    """% of (staff x working day) slots with a check-in, scoped to a
    department when given. None when there's no staff or no working days to
    measure against."""
    staff_q = select(User).where(User.role.in_([UserRole.TEACHER, UserRole.HOD]), User.is_active.is_(True))
    if department_id:
        staff_q = staff_q.where(User.department_id == department_id)
    staff_ids = [u.id for u in db.scalars(staff_q)]
    if not staff_ids:
        return None

    working_days = working_days_between(start_date, end_date)
    if not working_days:
        return None

    present = len(
        list(
            db.scalars(
                select(StaffAttendance).where(
                    StaffAttendance.user_id.in_(staff_ids),
                    StaffAttendance.date >= start_date,
                    StaffAttendance.date <= end_date,
                )
            )
        )
    )
    possible = len(staff_ids) * len(working_days)
    return round(present / possible * 100, 1) if possible else None
