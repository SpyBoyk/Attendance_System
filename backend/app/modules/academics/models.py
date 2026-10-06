import uuid
from datetime import datetime, time, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(200))
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    hod_user_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", use_alter=True, name="fk_department_hod_user"), nullable=True
    )

    users: Mapped[list["User"]] = relationship(  # noqa: F821
        "User", foreign_keys="User.department_id", back_populates="department"
    )
    courses: Mapped[list["Course"]] = relationship("Course", back_populates="department")
    sections: Mapped[list["ClassSection"]] = relationship("ClassSection", back_populates="department")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id"))
    credits: Mapped[int] = mapped_column(Integer, default=0)
    semester: Mapped[int] = mapped_column(Integer, default=1)

    department: Mapped["Department"] = relationship("Department", back_populates="courses")


class ClassSection(Base):
    __tablename__ = "class_sections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(100))
    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id"))
    academic_year: Mapped[str] = mapped_column(String(20))
    year_level: Mapped[int] = mapped_column(Integer, default=1)

    department: Mapped["Department"] = relationship("Department", back_populates="sections")


class Enrollment(Base):
    """Academic roster row: which student is enrolled in which course,
    within which section, for a given academic year. Distinct from
    biometric/RFID "enrollment" (app/modules/enrollment, later phase)."""

    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("student_id", "section_id", "course_id", name="uq_enrollment"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    section_id: Mapped[str] = mapped_column(String(36), ForeignKey("class_sections.id"), index=True)
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), index=True)
    academic_year: Mapped[str] = mapped_column(String(20))


class ScheduledClass(Base):
    """One recurring timetable entry: this course, taught by this teacher,
    to this section, every <day_of_week> from <start_time> to <end_time>."""

    __tablename__ = "scheduled_classes"
    __table_args__ = (UniqueConstraint("section_id", "day_of_week", "start_time", name="uq_section_slot"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    course_id: Mapped[str] = mapped_column(String(36), ForeignKey("courses.id"), index=True)
    section_id: Mapped[str] = mapped_column(String(36), ForeignKey("class_sections.id"), index=True)
    teacher_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), index=True)
    room: Mapped[str] = mapped_column(String(50), default="")
    day_of_week: Mapped[int] = mapped_column(Integer)  # 0=Monday .. 6=Sunday
    start_time: Mapped[time] = mapped_column(Time)
    end_time: Mapped[time] = mapped_column(Time)
    academic_year: Mapped[str] = mapped_column(String(20))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
