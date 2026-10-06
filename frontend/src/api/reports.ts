import { api } from "@/api/client";

export interface TrendPoint {
  date: string;
  rate: number;
}

export interface DepartmentRate {
  department_id: string;
  department_name: string;
  rate: number;
}

export interface Defaulter {
  student_id: string;
  full_name: string;
  email: string;
  rate: number;
  sessions_attended: number;
  sessions_total: number;
}

export interface StatusBreakdown {
  present: number;
  late: number;
  excused: number;
  absent: number;
}

export interface WeekdayRate {
  weekday: number;
  weekday_name: string;
  rate: number;
}

export interface Overview {
  start_date: string;
  end_date: string;
  attendance_rate: number | null;
  staff_attendance_rate: number | null;
  trend: TrendPoint[];
  by_department: DepartmentRate[];
  defaulters: Defaulter[];
  status_breakdown: StatusBreakdown;
  by_weekday: WeekdayRate[];
  staff_by_department: DepartmentRate[];
}

export async function getOverview(params?: {
  department_id?: string;
  start_date?: string;
  end_date?: string;
}): Promise<Overview> {
  const { data } = await api.get<Overview>("/reports/overview", { params });
  return data;
}
