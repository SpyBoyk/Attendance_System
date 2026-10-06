from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import require_admin
from app.database import get_db
from app.modules.users import service
from app.modules.users.models import UserRole
from app.modules.users.schemas import (
    BulkImportResultOut,
    UserCreate,
    UserCreateOut,
    UserListOut,
    UserOut,
    UserUpdate,
)

router = APIRouter(prefix="/api/v1/users", tags=["users"], dependencies=[Depends(require_admin)])


@router.post("", response_model=UserCreateOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)) -> UserCreateOut:
    try:
        user, temp_password = service.create_user(
            db, payload.full_name, payload.email, payload.role, payload.department_id, payload.password
        )
    except service.EmailAlreadyRegisteredError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    return UserCreateOut(**UserOut.model_validate(user).model_dump(), temp_password=temp_password)


@router.post("/bulk-import", response_model=BulkImportResultOut)
async def bulk_import(file: UploadFile, db: Session = Depends(get_db)) -> BulkImportResultOut:
    content = await file.read()
    created, errors = service.bulk_import_users(db, content)
    return BulkImportResultOut(created=created, errors=errors)


@router.get("", response_model=UserListOut)
def list_users(
    role: UserRole | None = None,
    department_id: str | None = None,
    search: str | None = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> UserListOut:
    items, total = service.list_users(db, role, department_id, search, limit, offset)
    return UserListOut(items=[UserOut.model_validate(u) for u in items], total=total)


@router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db)) -> UserOut:
    try:
        return UserOut.model_validate(service.get_user(db, user_id))
    except service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: str, payload: UserUpdate, db: Session = Depends(get_db)) -> UserOut:
    try:
        user = service.update_user(
            db, user_id, payload.full_name, payload.role, payload.department_id, payload.is_active
        )
    except service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    return UserOut.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_user(user_id: str, db: Session = Depends(get_db)) -> None:
    try:
        service.deactivate_user(db, user_id)
    except service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
