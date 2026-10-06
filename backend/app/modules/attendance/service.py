from datetime import date, datetime, timezone

import numpy as np
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.academics.models import Enrollment, ScheduledClass
from app.modules.academics.service import get_roster
from app.modules.attendance.models import (
    AttendanceConfig,
    AttendanceEvent,
    AttendanceSession,
    AttendanceStatus,
    CheckInMethod,
    SessionStatus,
)
from app.modules.enrollment.face_engine import decode_image, get_face_engine
from app.modules.enrollment.models import FaceEnrollment
from app.modules.users.models import User, UserRole

DEFAULT_CONFIG: dict[str, dict] = {
    "late_after_minutes": {"minutes": 10},
    "face_match_threshold": {"threshold": 0.363},
}


class NotFoundError(Exception):
    pass


class NotPermittedError(Exception):
    pass


class SessionAlreadyOpenError(Exception):
    pass


class SessionClosedError(Exception):
    pass


class NoFaceDetectedError(Exception):
    pass


class NoFaceMatchError(Exception):
    pass


def open_session(db: Session, actor: User, scheduled_class_id: str, session_date: date | None) -> AttendanceSession:
    scheduled = db.get(ScheduledClass, scheduled_class_id)
    if scheduled is None:
        raise NotFoundError(f"Scheduled class {scheduled_class_id} not found")
    if actor.role not in (UserRole.ADMIN,) and scheduled.teacher_id != actor.id:
        raise NotPermittedError("You can only open sessions for your own classes")

    session_date = session_date or datetime.now(timezone.utc).date()
    existing = db.scalar(
        select(AttendanceSession).where(
            AttendanceSession.scheduled_class_id == scheduled_class_id,
            AttendanceSession.session_date == session_date,
            AttendanceSession.status == SessionStatus.OPEN,
        )
    )
    if existing:
        raise SessionAlreadyOpenError("A session for this class is already open today")

    session = AttendanceSession(
        scheduled_class_id=scheduled_class_id,
        course_id=scheduled.course_id,
        section_id=scheduled.section_id,
        teacher_id=scheduled.teacher_id,
        session_date=session_date,
        status=SessionStatus.OPEN,
        methods_enabled=["MANUAL"],
        opened_by=actor.id,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def close_session(db: Session, actor: User, session_id: str) -> AttendanceSession:
    session = get_session(db, session_id)
    if actor.role not in (UserRole.ADMIN,) and session.teacher_id != actor.id:
        raise NotPermittedError("You can only close your own sessions")
    session.status = SessionStatus.CLOSED
    session.actual_end_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session


def get_session(db: Session, session_id: str) -> AttendanceSession:
    session = db.get(AttendanceSession, session_id)
    if session is None:
        raise NotFoundError(f"Session {session_id} not found")
    return session


def list_sessions(
    db: Session, teacher_id: str | None, section_id: str | None, student_id: str | None
) -> list[AttendanceSession]:
    stmt = select(AttendanceSession)
    if teacher_id:
        stmt = stmt.where(AttendanceSession.teacher_id == teacher_id)
    if section_id:
        stmt = stmt.where(AttendanceSession.section_id == section_id)
    if student_id:
        stmt = stmt.join(AttendanceEvent, AttendanceEvent.session_id == AttendanceSession.id).where(
            AttendanceEvent.student_id == student_id
        )
    return list(db.scalars(stmt.order_by(AttendanceSession.session_date.desc())))


def manual_checkin(
    db: Session, actor: User, session_id: str, student_id: str, status: AttendanceStatus
) -> AttendanceEvent:
    session = get_session(db, session_id)
    if session.status != SessionStatus.OPEN:
        raise SessionClosedError("Session is not open")

    event = db.scalar(
        select(AttendanceEvent).where(
            AttendanceEvent.session_id == session_id, AttendanceEvent.student_id == student_id
        )
    )
    if event:
        event.status = status
        event.recorded_by = actor.id
    else:
        event = AttendanceEvent(
            session_id=session_id,
            student_id=student_id,
            method=CheckInMethod.MANUAL,
            status=status,
            recorded_by=actor.id,
        )
        db.add(event)
    db.commit()
    db.refresh(event)
    return event


def face_checkin(db: Session, session_id: str, image_bytes: bytes) -> AttendanceEvent:
    """Stateless face check-in: the browser captures a webcam frame and
    POSTs it here -- there is no server-side camera/background thread (the
    deployed backend has no attached camera), so the roster's face gallery
    is simply queried fresh on each request rather than cached across frames
    the way a long-lived session thread would."""
    session = get_session(db, session_id)
    if session.status != SessionStatus.OPEN:
        raise SessionClosedError("Session is not open")

    image = decode_image(image_bytes)
    if image is None:
        raise NoFaceDetectedError("Could not decode image")

    engine = get_face_engine()
    embedding = engine.detect_and_embed(image)
    if embedding is None:
        raise NoFaceDetectedError("No face detected in the frame")

    roster = get_roster(db, session.section_id)
    roster_ids = [s.id for s in roster]
    if not roster_ids:
        raise NoFaceMatchError("No students enrolled in this section")

    enrollments = list(db.scalars(select(FaceEnrollment).where(FaceEnrollment.user_id.in_(roster_ids))))
    if not enrollments:
        raise NoFaceMatchError("No students in this section have an enrolled face yet")

    threshold = get_config(db, "face_match_threshold").get("threshold", 0.363)
    best_student_id, best_score = None, -1.0
    for enrollment in enrollments:
        reference = np.array(enrollment.face_embedding_json, dtype=np.float32)
        score = engine.match_score(embedding, reference)
        if score > best_score:
            best_student_id, best_score = enrollment.user_id, score

    if best_student_id is None or best_score < threshold:
        raise NoFaceMatchError("Face did not match any enrolled student closely enough")

    existing = db.scalar(
        select(AttendanceEvent).where(
            AttendanceEvent.session_id == session_id, AttendanceEvent.student_id == best_student_id
        )
    )
    if existing:
        return existing  # idempotent -- student already checked in this session

    event = AttendanceEvent(
        session_id=session_id,
        student_id=best_student_id,
        method=CheckInMethod.FACE,
        confidence=best_score,
        status=AttendanceStatus.PRESENT,
    )
    db.add(event)
    try:
        db.commit()
    except IntegrityError:
        # Two near-simultaneous frames matched the same student -- the
        # unique constraint is the authoritative dedup guard.
        db.rollback()
        return db.scalar(
            select(AttendanceEvent).where(
                AttendanceEvent.session_id == session_id, AttendanceEvent.student_id == best_student_id
            )
        )
    db.refresh(event)
    return event


def remove_checkin(db: Session, session_id: str, student_id: str) -> None:
    """Removing the event row represents marking the student absent --
    absence is never an explicit row, only the lack of one."""
    event = db.scalar(
        select(AttendanceEvent).where(
            AttendanceEvent.session_id == session_id, AttendanceEvent.student_id == student_id
        )
    )
    if event:
        db.delete(event)
        db.commit()


def get_session_roster(db: Session, session_id: str) -> list[tuple[User, AttendanceEvent | None]]:
    session = get_session(db, session_id)
    students = get_roster(db, session.section_id)
    events = {
        e.student_id: e
        for e in db.scalars(select(AttendanceEvent).where(AttendanceEvent.session_id == session_id))
    }
    return [(student, events.get(student.id)) for student in students]


def get_student_history(db: Session, student_id: str) -> list[tuple[AttendanceSession, AttendanceEvent | None]]:
    """Every session held for any section the student is enrolled in, with
    their own event if present -- a missing event means absent."""
    section_ids = db.scalars(select(Enrollment.section_id).where(Enrollment.student_id == student_id)).all()
    if not section_ids:
        return []

    sessions = list(
        db.scalars(
            select(AttendanceSession)
            .where(AttendanceSession.section_id.in_(section_ids), AttendanceSession.status != SessionStatus.CANCELLED)
            .order_by(AttendanceSession.session_date.desc())
        )
    )
    events = {
        e.session_id: e
        for e in db.scalars(
            select(AttendanceEvent).where(
                AttendanceEvent.student_id == student_id,
                AttendanceEvent.session_id.in_([s.id for s in sessions]),
            )
        )
    }
    return [(session, events.get(session.id)) for session in sessions]


def can_view_student_history(db: Session, viewer: User, student_id: str) -> bool:
    """RBAC for the staff-facing student-history drill-down: ADMIN sees
    everyone, HOD only their own department's students, TEACHER only
    students enrolled in a section they actually teach."""
    if viewer.role == UserRole.ADMIN:
        return True

    student = db.get(User, student_id)
    if student is None:
        return False

    if viewer.role == UserRole.HOD:
        return student.department_id == viewer.department_id

    if viewer.role == UserRole.TEACHER:
        student_section_ids = set(
            db.scalars(select(Enrollment.section_id).where(Enrollment.student_id == student_id))
        )
        if not student_section_ids:
            return False
        teacher_section_ids = set(
            db.scalars(select(ScheduledClass.section_id).where(ScheduledClass.teacher_id == viewer.id))
        )
        return bool(student_section_ids & teacher_section_ids)

    return False


def get_config(db: Session, key: str) -> dict:
    row = db.get(AttendanceConfig, key)
    if row:
        return row.value_json
    if key in DEFAULT_CONFIG:
        return DEFAULT_CONFIG[key]
    raise NotFoundError(f"Config key {key} not found")


def set_config(db: Session, actor: User, key: str, value_json: dict) -> AttendanceConfig:
    row = db.get(AttendanceConfig, key)
    if row:
        row.value_json = value_json
        row.updated_by = actor.id
    else:
        row = AttendanceConfig(key=key, value_json=value_json, updated_by=actor.id)
        db.add(row)
    db.commit()
    db.refresh(row)
    return row
