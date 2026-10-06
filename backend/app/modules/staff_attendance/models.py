import uuid
from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class StaffAttendance(Base):
    """One self-reported clock-in per staff member (Teacher/HOD) per day --
    separate from the per-class AttendanceEvent, which tracks students."""

    __tablename__ = "staff_attendance"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_staff_attendance_user_date"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    check_in_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    check_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
