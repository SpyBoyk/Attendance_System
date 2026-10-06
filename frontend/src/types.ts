export type UserRole = "ADMIN" | "HOD" | "TEACHER" | "STUDENT";

export interface User {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  department_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  hod_user_id: string | null;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  department_id: string;
  credits: number;
  semester: number;
}

export interface ClassSection {
  id: string;
  name: string;
  department_id: string;
  academic_year: string;
  year_level: number;
}

export interface RosterStudent {
  student_id: string;
  full_name: string;
  email: string;
}

export interface ScheduledClass {
  id: string;
  course_id: string;
  section_id: string;
  teacher_id: string;
  room: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  academic_year: string;
  is_active: boolean;
}

export type SessionStatus = "OPEN" | "CLOSED" | "CANCELLED";
export type CheckInMethod = "MANUAL" | "FACE" | "RFID";
export type AttendanceStatus = "PRESENT" | "LATE" | "EXCUSED";

export interface AttendanceSession {
  id: string;
  scheduled_class_id: string | null;
  course_id: string;
  section_id: string;
  teacher_id: string;
  session_date: string;
  actual_start_at: string;
  actual_end_at: string | null;
  status: SessionStatus;
  methods_enabled: string[];
  opened_by: string;
}

export interface AttendanceEvent {
  id: string;
  session_id: string;
  student_id: string;
  method: CheckInMethod;
  confidence: number | null;
  status: AttendanceStatus;
  checked_in_at: string;
  recorded_by: string | null;
}

export interface RosterEntry {
  student_id: string;
  full_name: string;
  email: string;
  event: AttendanceEvent | null;
}
