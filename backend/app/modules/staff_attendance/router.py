from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_staff
from app.database import get_db
from app.modules.staff_attendance import service
from app.modules.staff_attendance.schemas import StaffAttendanceOut
from app.modules.users.models import User

router = APIRouter(prefix="/api/v1/staff-attendance", tags=["staff-attendance"])


@router.post("/check-in", response_model=StaffAttendanceOut, dependencies=[Depends(require_staff)])
def check_in(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> StaffAttendanceOut:
    return StaffAttendanceOut.model_validate(service.check_in(db, current_user))


@router.post("/check-out", response_model=StaffAttendanceOut, dependencies=[Depends(require_staff)])
def check_out(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> StaffAttendanceOut:
    try:
        return StaffAttendanceOut.model_validate(service.check_out(db, current_user))
    except service.NotCheckedInError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    except service.AlreadyCheckedOutError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.get("/me", response_model=list[StaffAttendanceOut], dependencies=[Depends(get_current_user)])
def my_attendance(
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[StaffAttendanceOut]:
    end_date = end_date or datetime.now(timezone.utc).date()
    start_date = start_date or (end_date - timedelta(days=30))
    return [StaffAttendanceOut.model_validate(r) for r in service.list_my(db, current_user.id, start_date, end_date)]
