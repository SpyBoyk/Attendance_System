import type { AttendanceStatus, SessionStatus, UserRole } from "@/types";

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: "Admin",
  HOD: "HOD",
  TEACHER: "Teacher",
  STUDENT: "Student",
};

export const ATTENDANCE_STATUS_LABEL: Record<AttendanceStatus | "ABSENT", string> = {
  PRESENT: "Present",
  LATE: "Late",
  EXCUSED: "Excused",
  ABSENT: "Absent",
};

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  OPEN: "Open",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};
