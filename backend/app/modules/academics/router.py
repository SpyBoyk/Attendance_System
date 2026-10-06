from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.database import get_db
from app.modules.academics import service
from app.modules.academics.schemas import (
    ClassSectionCreate,
    ClassSectionOut,
    ClassSectionUpdate,
    CourseCreate,
    CourseOut,
    CourseUpdate,
    DepartmentCreate,
    DepartmentOut,
    DepartmentUpdate,
    EnrollmentOut,
    EnrollRequest,
    RosterStudentOut,
    ScheduledClassCreate,
    ScheduledClassOut,
    ScheduledClassUpdate,
)

router = APIRouter(prefix="/api/v1", tags=["academics"])

admin_router = APIRouter(dependencies=[Depends(require_admin)])


# --- Departments -------------------------------------------------------------


@admin_router.post("/departments", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db)) -> DepartmentOut:
    try:
        return DepartmentOut.model_validate(
            service.create_department(db, payload.name, payload.code, payload.hod_user_id)
        )
    except service.DuplicateError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.get("/departments", response_model=list[DepartmentOut], dependencies=[Depends(get_current_user)])
def list_departments(db: Session = Depends(get_db)) -> list[DepartmentOut]:
    return [DepartmentOut.model_validate(d) for d in service.list_departments(db)]


@admin_router.patch("/departments/{department_id}", response_model=DepartmentOut)
def update_department(department_id: str, payload: DepartmentUpdate, db: Session = Depends(get_db)) -> DepartmentOut:
    try:
        return DepartmentOut.model_validate(
            service.update_department(db, department_id, payload.name, payload.hod_user_id)
        )
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@admin_router.delete("/departments/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(department_id: str, db: Session = Depends(get_db)) -> None:
    try:
        service.delete_department(db, department_id)
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


# --- Courses ------------------------------------------------------------------


@admin_router.post("/courses", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
def create_course(payload: CourseCreate, db: Session = Depends(get_db)) -> CourseOut:
    try:
        return CourseOut.model_validate(
            service.create_course(db, payload.code, payload.name, payload.department_id, payload.credits, payload.semester)
        )
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except service.DuplicateError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc


@router.get("/courses", response_model=list[CourseOut], dependencies=[Depends(get_current_user)])
def list_courses(department_id: str | None = None, db: Session = Depends(get_db)) -> list[CourseOut]:
    return [CourseOut.model_validate(c) for c in service.list_courses(db, department_id)]


@admin_router.patch("/courses/{course_id}", response_model=CourseOut)
def update_course(course_id: str, payload: CourseUpdate, db: Session = Depends(get_db)) -> CourseOut:
    try:
        return CourseOut.model_validate(
            service.update_course(db, course_id, payload.name, payload.credits, payload.semester)
        )
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@admin_router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course(course_id: str, db: Session = Depends(get_db)) -> None:
    try:
        service.delete_course(db, course_id)
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


# --- Class sections ------------------------------------------------------------


@admin_router.post("/sections", response_model=ClassSectionOut, status_code=status.HTTP_201_CREATED)
def create_section(payload: ClassSectionCreate, db: Session = Depends(get_db)) -> ClassSectionOut:
    try:
        return ClassSectionOut.model_validate(
            service.create_section(db, payload.name, payload.department_id, payload.academic_year, payload.year_level)
        )
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.get("/sections", response_model=list[ClassSectionOut], dependencies=[Depends(get_current_user)])
def list_sections(department_id: str | None = None, db: Session = Depends(get_db)) -> list[ClassSectionOut]:
    return [ClassSectionOut.model_validate(s) for s in service.list_sections(db, department_id)]


@admin_router.patch("/sections/{section_id}", response_model=ClassSectionOut)
def update_section(section_id: str, payload: ClassSectionUpdate, db: Session = Depends(get_db)) -> ClassSectionOut:
    try:
        return ClassSectionOut.model_validate(
            service.update_section(db, section_id, payload.name, payload.academic_year, payload.year_level)
        )
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@admin_router.delete("/sections/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_section(section_id: str, db: Session = Depends(get_db)) -> None:
    try:
        service.delete_section(db, section_id)
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@admin_router.post("/sections/{section_id}/enroll", response_model=list[EnrollmentOut])
def enroll_students(section_id: str, payload: EnrollRequest, db: Session = Depends(get_db)) -> list[EnrollmentOut]:
    try:
        rows = service.enroll_students(db, section_id, payload.course_id, payload.student_ids, payload.academic_year)
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    return [EnrollmentOut.model_validate(r) for r in rows]


@router.get("/sections/{section_id}/roster", response_model=list[RosterStudentOut], dependencies=[Depends(get_current_user)])
def get_roster(section_id: str, db: Session = Depends(get_db)) -> list[RosterStudentOut]:
    try:
        students = service.get_roster(db, section_id)
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    return [RosterStudentOut(student_id=s.id, full_name=s.full_name, email=s.email) for s in students]


@admin_router.delete("/enrollments/{enrollment_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_enrollment(enrollment_id: str, db: Session = Depends(get_db)) -> None:
    try:
        service.remove_enrollment(db, enrollment_id)
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


# --- Timetable ------------------------------------------------------------------


@admin_router.post("/timetable", response_model=ScheduledClassOut, status_code=status.HTTP_201_CREATED)
def create_scheduled_class(payload: ScheduledClassCreate, db: Session = Depends(get_db)) -> ScheduledClassOut:
    try:
        entry = service.create_scheduled_class(
            db,
            payload.course_id,
            payload.section_id,
            payload.teacher_id,
            payload.room,
            payload.day_of_week,
            payload.start_time,
            payload.end_time,
            payload.academic_year,
        )
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except service.SlotConflictError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return ScheduledClassOut.model_validate(entry)


@router.get("/timetable", response_model=list[ScheduledClassOut], dependencies=[Depends(get_current_user)])
def list_scheduled_classes(
    section_id: str | None = None, teacher_id: str | None = None, db: Session = Depends(get_db)
) -> list[ScheduledClassOut]:
    return [ScheduledClassOut.model_validate(e) for e in service.list_scheduled_classes(db, section_id, teacher_id)]


@admin_router.patch("/timetable/{scheduled_class_id}", response_model=ScheduledClassOut)
def update_scheduled_class(scheduled_class_id: str, payload: ScheduledClassUpdate, db: Session = Depends(get_db)) -> ScheduledClassOut:
    try:
        entry = service.update_scheduled_class(db, scheduled_class_id, **payload.model_dump(exclude_unset=True))
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    return ScheduledClassOut.model_validate(entry)


@admin_router.delete("/timetable/{scheduled_class_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scheduled_class(scheduled_class_id: str, db: Session = Depends(get_db)) -> None:
    try:
        service.delete_scheduled_class(db, scheduled_class_id)
    except service.NotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


router.include_router(admin_router)
