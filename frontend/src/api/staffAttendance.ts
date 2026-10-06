import { api } from "@/api/client";

export interface StaffAttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  check_in_at: string;
  check_out_at: string | null;
}

export async function checkInStaff(): Promise<StaffAttendanceRecord> {
  const { data } = await api.post<StaffAttendanceRecord>("/staff-attendance/check-in");
  return data;
}

export async function checkOutStaff(): Promise<StaffAttendanceRecord> {
  const { data } = await api.post<StaffAttendanceRecord>("/staff-attendance/check-out");
  return data;
}

export async function getMyStaffAttendance(params?: { start_date?: string; end_date?: string }): Promise<StaffAttendanceRecord[]> {
  const { data } = await api.get<StaffAttendanceRecord[]>("/staff-attendance/me", { params });
  return data;
}
