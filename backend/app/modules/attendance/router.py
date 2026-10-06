from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin, require_roles, require_teacher
from app.database import get_db
from app.modules.attendance import service
from app.modules.attendance.schemas import (
    AttendanceEventOut,
    ConfigOut,
    ConfigUpdateRequest,
    ManualCheckInRequest,
    OpenSessionRequest,
    RosterEntryOut,
    SessionOut,
    StudentHistoryEntryOut,
)
from app.modules.users.models import User, UserRole

require_staff = require_roles(UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN)

router = APIRouter(prefix="/api/v1/attendance", tags=["attendance"])


@router.post("/sessions", response_model=SessionOut, dependencies=[Depends(require_teacher)])
def open_session(
    payload: OpenSessionRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> SessionOut:
    try:
        session = service.open_session(db, current_user, payload.scheduled_class_id, payload.session_date)
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except service.NotPermittedError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc)) from exc
    except service.SessionAlreadyOpenError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return SessionOut.model_validate(session)


@router.post("/sessions/{session_id}/close", response_model=SessionOut, dependencies=[Depends(require_teacher)])
def close_session(
    session_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> SessionOut:
    try:
        session = service.close_session(db, current_user, session_id)
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except service.NotPermittedError as exc:
        raise HTTPException(status.HTTP_403_FORBIDDEN, str(exc)) from exc
    return SessionOut.model_validate(session)


@router.get("/sessions/{session_id}", response_model=SessionOut, dependencies=[Depends(get_current_user)])
def get_session(session_id: str, db: Session = Depends(get_db)) -> SessionOut:
    try:
        return SessionOut.model_validate(service.get_session(db, session_id))
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.get("/sessions", response_model=list[SessionOut], dependencies=[Depends(get_current_user)])
def list_sessions(
    teacher_id: str | None = None,
    section_id: str | None = None,
    student_id: str | None = None,
    db: Session = Depends(get_db),
) -> list[SessionOut]:
    return [SessionOut.model_validate(s) for s in service.list_sessions(db, teacher_id, section_id, student_id)]


@router.get("/sessions/{session_id}/roster", response_model=list[RosterEntryOut], dependencies=[Depends(get_current_user)])
def get_session_roster(session_id: str, db: Session = Depends(get_db)) -> list[RosterEntryOut]:
    try:
        rows = service.get_session_roster(db, session_id)
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    return [
        RosterEntryOut(
            student_id=student.id,
            full_name=student.full_name,
            email=student.email,
            event=AttendanceEventOut.model_validate(event) if event else None,
        )
        for student, event in rows
    ]


@router.post("/checkin/manual", response_model=AttendanceEventOut, dependencies=[Depends(require_teacher)])
def manual_checkin(
    payload: ManualCheckInRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> AttendanceEventOut:
    try:
        event = service.manual_checkin(db, current_user, payload.session_id, payload.student_id, payload.status)
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except service.SessionClosedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return AttendanceEventOut.model_validate(event)


@router.post("/checkin/face", response_model=AttendanceEventOut, dependencies=[Depends(require_teacher)])
async def face_checkin(session_id: str, image: UploadFile, db: Session = Depends(get_db)) -> AttendanceEventOut:
    content = await image.read()
    try:
        event = service.face_checkin(db, session_id, content)
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except service.SessionClosedError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    except service.NoFaceDetectedError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    except service.NoFaceMatchError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    return AttendanceEventOut.model_validate(event)


@router.delete(
    "/sessions/{session_id}/checkin/{student_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_teacher)],
)
def remove_checkin(session_id: str, student_id: str, db: Session = Depends(get_db)) -> None:
    service.remove_checkin(db, session_id, student_id)


@router.get("/my-history", response_model=list[StudentHistoryEntryOut], dependencies=[Depends(get_current_user)])
def my_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> list[StudentHistoryEntryOut]:
    rows = service.get_student_history(db, current_user.id)
    return [
        StudentHistoryEntryOut(session=SessionOut.model_validate(session), status=event.status if event else None)
        for session, event in rows
    ]


@router.get(
    "/history/{student_id}", response_model=list[StudentHistoryEntryOut], dependencies=[Depends(require_staff)]
)
def student_history(
    student_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> list[StudentHistoryEntryOut]:
    if not service.can_view_student_history(db, current_user, student_id):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted to view this student's attendance")
    rows = service.get_student_history(db, student_id)
    return [
        StudentHistoryEntryOut(session=SessionOut.model_validate(session), status=event.status if event else None)
        for session, event in rows
    ]


@router.get("/config/{key}", response_model=ConfigOut, dependencies=[Depends(get_current_user)])
def get_config(key: str, db: Session = Depends(get_db)) -> ConfigOut:
    try:
        return ConfigOut(key=key, value_json=service.get_config(db, key))
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.put("/config/{key}", response_model=ConfigOut, dependencies=[Depends(require_admin)])
def set_config(
    key: str, payload: ConfigUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> ConfigOut:
    row = service.set_config(db, current_user, key, payload.value_json)
    return ConfigOut.model_validate(row)
