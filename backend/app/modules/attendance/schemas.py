from datetime import date, datetime

from pydantic import BaseModel

from app.modules.attendance.models import AttendanceStatus, CheckInMethod, SessionStatus


class OpenSessionRequest(BaseModel):
    scheduled_class_id: str
    session_date: date | None = None  # defaults to today


class SessionOut(BaseModel):
    id: str
    scheduled_class_id: str | None
    course_id: str
    section_id: str
    teacher_id: str
    session_date: date
    actual_start_at: datetime
    actual_end_at: datetime | None
    status: SessionStatus
    methods_enabled: list[str]
    opened_by: str

    model_config = {"from_attributes": True}


class ManualCheckInRequest(BaseModel):
    session_id: str
    student_id: str
    status: AttendanceStatus = AttendanceStatus.PRESENT


class AttendanceEventOut(BaseModel):
    id: str
    session_id: str
    student_id: str
    method: CheckInMethod
    confidence: float | None
    status: AttendanceStatus
    checked_in_at: datetime
    recorded_by: str | None

    model_config = {"from_attributes": True}


class RosterEntryOut(BaseModel):
    student_id: str
    full_name: str
    email: str
    event: AttendanceEventOut | None = None


class StudentHistoryEntryOut(BaseModel):
    session: SessionOut
    status: AttendanceStatus | None  # None means absent (no event row)


class ConfigOut(BaseModel):
    key: str
    value_json: dict

    model_config = {"from_attributes": True}


class ConfigUpdateRequest(BaseModel):
    value_json: dict
