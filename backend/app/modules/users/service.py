import csv
import io
import secrets

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.modules.users.models import User, UserRole


class EmailAlreadyRegisteredError(Exception):
    pass


class UserNotFoundError(Exception):
    pass


def _generate_temp_password() -> str:
    return secrets.token_urlsafe(9)


def create_user(
    db: Session, full_name: str, email: str, role: UserRole, department_id: str | None, password: str | None
) -> tuple[User, str | None]:
    email = email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise EmailAlreadyRegisteredError(f"{email} is already registered")

    temp_password = None
    if password is None:
        temp_password = _generate_temp_password()
        password = temp_password

    user = User(
        full_name=full_name.strip(),
        email=email,
        password_hash=hash_password(password),
        role=role,
        department_id=department_id,
        is_active=True,
        must_change_password=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, temp_password


def bulk_import_users(db: Session, csv_bytes: bytes) -> tuple[int, list[str]]:
    """CSV columns: full_name,email,role,department_id (department_id optional)."""
    reader = csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig")))
    created = 0
    errors: list[str] = []
    for i, row in enumerate(reader, start=2):  # row 1 is the header
        try:
            role = UserRole(row["role"].strip().upper())
            create_user(
                db,
                full_name=row["full_name"],
                email=row["email"],
                role=role,
                department_id=(row.get("department_id") or "").strip() or None,
                password=None,
            )
            created += 1
        except Exception as exc:  # noqa: BLE001 -- collect all row errors, keep importing
            errors.append(f"row {i}: {exc}")
    return created, errors


def list_users(
    db: Session,
    role: UserRole | None,
    department_id: str | None,
    search: str | None,
    limit: int,
    offset: int,
) -> tuple[list[User], int]:
    stmt = select(User)
    count_stmt = select(func.count()).select_from(User)
    if role is not None:
        stmt = stmt.where(User.role == role)
        count_stmt = count_stmt.where(User.role == role)
    if department_id is not None:
        stmt = stmt.where(User.department_id == department_id)
        count_stmt = count_stmt.where(User.department_id == department_id)
    if search:
        like = f"%{search.lower()}%"
        cond = (func.lower(User.full_name).like(like)) | (func.lower(User.email).like(like))
        stmt = stmt.where(cond)
        count_stmt = count_stmt.where(cond)

    total = db.scalar(count_stmt) or 0
    items = list(db.scalars(stmt.order_by(User.full_name).limit(limit).offset(offset)))
    return items, total


def get_user(db: Session, user_id: str) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise UserNotFoundError(f"User {user_id} not found")
    return user


def update_user(
    db: Session,
    user_id: str,
    full_name: str | None,
    role: UserRole | None,
    department_id: str | None,
    is_active: bool | None,
) -> User:
    user = get_user(db, user_id)
    if full_name is not None:
        user.full_name = full_name.strip()
    if role is not None:
        user.role = role
    if department_id is not None:
        user.department_id = department_id
    if is_active is not None:
        user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user


def deactivate_user(db: Session, user_id: str) -> None:
    user = get_user(db, user_id)
    user.is_active = False
    db.commit()
