"""Imports every module's models so Base.metadata is complete before
Alembic autogenerate (or create_all in tests) runs."""

from app.modules.users.models import User, UserRole  # noqa: F401
from app.modules.academics.models import (  # noqa: F401
    ClassSection,
    Course,
    Department,
    Enrollment,
    ScheduledClass,
)
from app.modules.attendance.models import (  # noqa: F401
    AttendanceConfig,
    AttendanceEvent,
    AttendanceSession,
    AttendanceStatus,
    CheckInMethod,
    SessionStatus,
)
from app.modules.enrollment.models import FaceEnrollment  # noqa: F401
from app.modules.staff_attendance.models import StaffAttendance  # noqa: F401
