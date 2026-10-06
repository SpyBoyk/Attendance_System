from datetime import time

from pydantic import BaseModel


class DepartmentCreate(BaseModel):
    name: str
    code: str
    hod_user_id: str | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = None
    hod_user_id: str | None = None


class DepartmentOut(BaseModel):
    id: str
    name: str
    code: str
    hod_user_id: str | None

    model_config = {"from_attributes": True}


class CourseCreate(BaseModel):
    code: str
    name: str
    department_id: str
    credits: int = 0
    semester: int = 1


class CourseUpdate(BaseModel):
    name: str | None = None
    credits: int | None = None
    semester: int | None = None


class CourseOut(BaseModel):
    id: str
    code: str
    name: str
    department_id: str
    credits: int
    semester: int

    model_config = {"from_attributes": True}


class ClassSectionCreate(BaseModel):
    name: str
    department_id: str
    academic_year: str
    year_level: int = 1


class ClassSectionUpdate(BaseModel):
    name: str | None = None
    academic_year: str | None = None
    year_level: int | None = None


class ClassSectionOut(BaseModel):
    id: str
    name: str
    department_id: str
    academic_year: str
    year_level: int

    model_config = {"from_attributes": True}


class EnrollRequest(BaseModel):
    student_ids: list[str]
    course_id: str
    academic_year: str


class EnrollmentOut(BaseModel):
    id: str
    student_id: str
    section_id: str
    course_id: str
    academic_year: str

    model_config = {"from_attributes": True}


class RosterStudentOut(BaseModel):
    student_id: str
    full_name: str
    email: str


class ScheduledClassCreate(BaseModel):
    course_id: str
    section_id: str
    teacher_id: str
    room: str = ""
    day_of_week: int
    start_time: time
    end_time: time
    academic_year: str


class ScheduledClassUpdate(BaseModel):
    teacher_id: str | None = None
    room: str | None = None
    day_of_week: int | None = None
    start_time: time | None = None
    end_time: time | None = None
    is_active: bool | None = None


class ScheduledClassOut(BaseModel):
    id: str
    course_id: str
    section_id: str
    teacher_id: str
    room: str
    day_of_week: int
    start_time: time
    end_time: time
    academic_year: str
    is_active: bool

    model_config = {"from_attributes": True}
