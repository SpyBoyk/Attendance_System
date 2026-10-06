from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_hod
from app.database import get_db
from app.modules.reports import service
from app.modules.reports.schemas import OverviewOut
from app.modules.users.models import User

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.get("/overview", response_model=OverviewOut, dependencies=[Depends(require_hod)])
def overview(
    department_id: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OverviewOut:
    end_date = end_date or datetime.now(timezone.utc).date()
    start_date = start_date or (end_date - timedelta(days=30))
    try:
        return service.get_overview(db, current_user, department_id, start_date, end_date)
    except service.NotPermittedError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc)) from exc
