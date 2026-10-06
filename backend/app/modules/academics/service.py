from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.academics.models import ClassSection, Course, Department, Enrollment, ScheduledClass
from app.modules.users.models import User


class NotFoundError(Exception):
    pass


class DuplicateError(Exception):
    pass


class SlotConflictError(Exception):
    pass


# --- Departments -----------------------------------------------------------


def create_department(db: Session, name: str, code: str, hod_user_id: str | None) -> Department:
    dept = Department(name=name.strip(), code=code.strip().upper(), hod_user_id=hod_user_id)
    db.add(dept)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise DuplicateError(f"Department code {code} already exists") from exc
    db.refresh(dept)
    return dept


def list_departments(db: Session) -> list[Department]:
    return list(db.scalars(select(Department).order_by(Department.name)))


def get_department(db: Session, department_id: str) -> Department:
    dept = db.get(Department, department_id)
    if dept is None:
        raise NotFoundError(f"Department {department_id} not found")
    return dept


def update_department(db: Session, department_id: str, name: str | None, hod_user_id: str | None) -> Department:
    dept = get_department(db, department_id)
    if name is not None:
        dept.name = name.strip()
    if hod_user_id is not None:
        dept.hod_user_id = hod_user_id
    db.commit()
    db.refresh(dept)
    return dept


def delete_department(db: Session, department_id: str) -> None:
    dept = get_department(db, department_id)
    db.delete(dept)
    db.commit()


# --- Courses -----------------------------------------------------------------


def create_course(db: Session, code: str, name: str, department_id: str, credits: int, semester: int) -> Course:
    get_department(db, department_id)
    course = Course(code=code.strip().upper(), name=name.strip(), department_id=department_id, credits=credits, semester=semester)
    db.add(course)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise DuplicateError(f"Course code {code} already exists") from exc
    db.refresh(course)
    return course


def list_courses(db: Session, department_id: str | None) -> list[Course]:
    stmt = select(Course)
    if department_id:
        stmt = stmt.where(Course.department_id == department_id)
    return list(db.scalars(stmt.order_by(Course.code)))


def get_course(db: Session, course_id: str) -> Course:
    course = db.get(Course, course_id)
    if course is None:
        raise NotFoundError(f"Course {course_id} not found")
    return course


def update_course(db: Session, course_id: str, name: str | None, credits: int | None, semester: int | None) -> Course:
    course = get_course(db, course_id)
    if name is not None:
        course.name = name.strip()
    if credits is not None:
        course.credits = credits
    if semester is not None:
        course.semester = semester
    db.commit()
    db.refresh(course)
    return course


def delete_course(db: Session, course_id: str) -> None:
    course = get_course(db, course_id)
    db.delete(course)
    db.commit()


# --- Class sections ----------------------------------------------------------


def create_section(db: Session, name: str, department_id: str, academic_year: str, year_level: int) -> ClassSection:
    get_department(db, department_id)
    section = ClassSection(name=name.strip(), department_id=department_id, academic_year=academic_year, year_level=year_level)
    db.add(section)
    db.commit()
    db.refresh(section)
    return section


def list_sections(db: Session, department_id: str | None) -> list[ClassSection]:
    stmt = select(ClassSection)
    if department_id:
        stmt = stmt.where(ClassSection.department_id == department_id)
    return list(db.scalars(stmt.order_by(ClassSection.name)))


def get_section(db: Session, section_id: str) -> ClassSection:
    section = db.get(ClassSection, section_id)
    if section is None:
        raise NotFoundError(f"Section {section_id} not found")
    return section


def update_section(
    db: Session, section_id: str, name: str | None, academic_year: str | None, year_level: int | None
) -> ClassSection:
    section = get_section(db, section_id)
    if name is not None:
        section.name = name.strip()
    if academic_year is not None:
        section.academic_year = academic_year
    if year_level is not None:
        section.year_level = year_level
    db.commit()
    db.refresh(section)
    return section


def delete_section(db: Session, section_id: str) -> None:
    section = get_section(db, section_id)
    db.delete(section)
    db.commit()


# --- Roster / enrollment -----------------------------------------------------


def enroll_students(
    db: Session, section_id: str, course_id: str, student_ids: list[str], academic_year: str
) -> list[Enrollment]:
    get_section(db, section_id)
    get_course(db, course_id)
    created: list[Enrollment] = []
    for student_id in student_ids:
        existing = db.scalar(
            select(Enrollment).where(
                Enrollment.student_id == student_id,
                Enrollment.section_id == section_id,
                Enrollment.course_id == course_id,
            )
        )
        if existing:
            continue
        row = Enrollment(student_id=student_id, section_id=section_id, course_id=course_id, academic_year=academic_year)
        db.add(row)
        created.append(row)
    db.commit()
    for row in created:
        db.refresh(row)
    return created


def get_roster(db: Session, section_id: str) -> list[User]:
    get_section(db, section_id)
    stmt = (
        select(User)
        .join(Enrollment, Enrollment.student_id == User.id)
        .where(Enrollment.section_id == section_id)
        .distinct()
        .order_by(User.full_name)
    )
    return list(db.scalars(stmt))


def remove_enrollment(db: Session, enrollment_id: str) -> None:
    row = db.get(Enrollment, enrollment_id)
    if row is None:
        raise NotFoundError(f"Enrollment {enrollment_id} not found")
    db.delete(row)
    db.commit()


# --- Timetable ----------------------------------------------------------------


def create_scheduled_class(
    db: Session,
    course_id: str,
    section_id: str,
    teacher_id: str,
    room: str,
    day_of_week: int,
    start_time,
    end_time,
    academic_year: str,
) -> ScheduledClass:
    get_course(db, course_id)
    get_section(db, section_id)
    entry = ScheduledClass(
        course_id=course_id,
        section_id=section_id,
        teacher_id=teacher_id,
        room=room,
        day_of_week=day_of_week,
        start_time=start_time,
        end_time=end_time,
        academic_year=academic_year,
    )
    db.add(entry)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise SlotConflictError("This section already has a class scheduled at that day/time") from exc
    db.refresh(entry)
    return entry


def list_scheduled_classes(db: Session, section_id: str | None, teacher_id: str | None) -> list[ScheduledClass]:
    stmt = select(ScheduledClass).where(ScheduledClass.is_active.is_(True))
    if section_id:
        stmt = stmt.where(ScheduledClass.section_id == section_id)
    if teacher_id:
        stmt = stmt.where(ScheduledClass.teacher_id == teacher_id)
    return list(db.scalars(stmt.order_by(ScheduledClass.day_of_week, ScheduledClass.start_time)))


def get_scheduled_class(db: Session, scheduled_class_id: str) -> ScheduledClass:
    entry = db.get(ScheduledClass, scheduled_class_id)
    if entry is None:
        raise NotFoundError(f"Scheduled class {scheduled_class_id} not found")
    return entry


def update_scheduled_class(db: Session, scheduled_class_id: str, **fields) -> ScheduledClass:
    entry = get_scheduled_class(db, scheduled_class_id)
    for key, value in fields.items():
        if value is not None:
            setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return entry


def delete_scheduled_class(db: Session, scheduled_class_id: str) -> None:
    entry = get_scheduled_class(db, scheduled_class_id)
    db.delete(entry)
    db.commit()
