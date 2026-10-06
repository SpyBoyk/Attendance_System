from datetime import date

from pydantic import BaseModel


class TrendPointOut(BaseModel):
    date: date
    rate: float


class DepartmentRateOut(BaseModel):
    department_id: str
    department_name: str
    rate: float


class DefaulterOut(BaseModel):
    student_id: str
    full_name: str
    email: str
    rate: float
    sessions_attended: int
    sessions_total: int


class StatusBreakdownOut(BaseModel):
    present: int
    late: int
    excused: int
    absent: int


class WeekdayRateOut(BaseModel):
    weekday: int
    weekday_name: str
    rate: float


class OverviewOut(BaseModel):
    start_date: date
    end_date: date
    attendance_rate: float | None
    staff_attendance_rate: float | None
    trend: list[TrendPointOut]
    by_department: list[DepartmentRateOut]
    defaulters: list[DefaulterOut]
    status_breakdown: StatusBreakdownOut
    by_weekday: list[WeekdayRateOut]
    staff_by_department: list[DepartmentRateOut]
