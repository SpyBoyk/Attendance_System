import { api } from "@/api/client";
import type { AttendanceEvent, AttendanceSession, AttendanceStatus, RosterEntry } from "@/types";

export interface StudentHistoryEntry {
  session: AttendanceSession;
  status: AttendanceStatus | null;
}

export async function getMyHistory(): Promise<StudentHistoryEntry[]> {
  const { data } = await api.get<StudentHistoryEntry[]>("/attendance/my-history");
  return data;
}

export async function getStudentHistory(studentId: string): Promise<StudentHistoryEntry[]> {
  const { data } = await api.get<StudentHistoryEntry[]>(`/attendance/history/${studentId}`);
  return data;
}

export async function openSession(scheduledClassId: string, sessionDate?: string): Promise<AttendanceSession> {
  const { data } = await api.post<AttendanceSession>("/attendance/sessions", {
    scheduled_class_id: scheduledClassId,
    session_date: sessionDate ?? null,
  });
  return data;
}

export async function closeSession(sessionId: string): Promise<AttendanceSession> {
  const { data } = await api.post<AttendanceSession>(`/attendance/sessions/${sessionId}/close`);
  return data;
}

export async function getSession(sessionId: string): Promise<AttendanceSession> {
  const { data } = await api.get<AttendanceSession>(`/attendance/sessions/${sessionId}`);
  return data;
}

export async function listSessions(params: {
  teacher_id?: string;
  section_id?: string;
  student_id?: string;
}): Promise<AttendanceSession[]> {
  const { data } = await api.get<AttendanceSession[]>("/attendance/sessions", { params });
  return data;
}

export async function getSessionRoster(sessionId: string): Promise<RosterEntry[]> {
  const { data } = await api.get<RosterEntry[]>(`/attendance/sessions/${sessionId}/roster`);
  return data;
}

export async function manualCheckIn(
  sessionId: string,
  studentId: string,
  status: AttendanceStatus,
): Promise<AttendanceEvent> {
  const { data } = await api.post<AttendanceEvent>("/attendance/checkin/manual", {
    session_id: sessionId,
    student_id: studentId,
    status,
  });
  return data;
}

export async function removeCheckIn(sessionId: string, studentId: string): Promise<void> {
  await api.delete(`/attendance/sessions/${sessionId}/checkin/${studentId}`);
}

export async function faceCheckIn(sessionId: string, image: Blob): Promise<AttendanceEvent> {
  const form = new FormData();
  form.append("session_id", sessionId);
  form.append("image", image, "frame.jpg");
  const { data } = await api.post<AttendanceEvent>("/attendance/checkin/face", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
