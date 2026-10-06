import enum
import uuid
from datetime import date, datetime, timezone

from sqlalchemy import JSON, DateTime, Date, Enum, Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class SessionStatus(str, enum.Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class CheckInMethod(str, enum.Enum):
    MANUAL = "MANUAL"
    FACE = "FACE"
    RFID = "RFID"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "PRESENT"
    LATE = "LATE"
    EXCUSED = "EXCUSED"


class AttendanceSession(Base):
    """One real occurrence of a scheduled class on a given date -- opened
    by a teacher, collects AttendanceEvent rows, then closed."""

    __tablename__ = "attendance_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scheduled_class_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("scheduled_classes.id"), nullable=True
    )
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"))
    section_id: Mapped[str] = mapped_column(String(36), ForeignKey("class_sections.id"), index=True)
    teacher_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    session_date: Mapped[date] = mapped_column(Date, index=True)
    actual_start_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    actual_end_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), default=SessionStatus.OPEN)
    methods_enabled: Mapped[list[str]] = mapped_column(JSON, default=lambda: ["MANUAL"])
    opened_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"))

    events: Mapped[list["AttendanceEvent"]] = relationship(
        "AttendanceEvent", back_populates="session", cascade="all, delete-orphan"
    )


class AttendanceEvent(Base):
    """Append-only check-in row. UniqueConstraint(session_id, student_id)
    is the hard dedup guard shared across every check-in method."""

    __tablename__ = "attendance_events"
    __table_args__ = (UniqueConstraint("session_id", "student_id", name="uq_session_student"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("attendance_sessions.id"), index=True
    )
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    method: Mapped[CheckInMethod] = mapped_column(Enum(CheckInMethod), default=CheckInMethod.MANUAL)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[AttendanceStatus] = mapped_column(Enum(AttendanceStatus), default=AttendanceStatus.PRESENT)
    checked_in_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    recorded_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)

    session: Mapped["AttendanceSession"] = relationship("AttendanceSession", back_populates="events")


class AttendanceConfig(Base):
    """Admin-tunable JSON config (e.g. late_after_minutes), zero migrations
    per new tunable."""

    __tablename__ = "attendance_config"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value_json: Mapped[dict] = mapped_column(JSON)
    updated_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
