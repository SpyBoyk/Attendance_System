from pydantic import BaseModel, EmailStr, field_validator

from app.modules.users.models import UserRole


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    role: UserRole
    department_id: str | None = None
    password: str | None = None  # None -> server generates a temp password

    @field_validator("full_name")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("full_name must not be blank")
        return v


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    department_id: str | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    role: UserRole
    department_id: str | None
    is_active: bool
    must_change_password: bool

    model_config = {"from_attributes": True}


class UserCreateOut(UserOut):
    temp_password: str | None = None


class UserListOut(BaseModel):
    items: list[UserOut]
    total: int


class BulkImportResultOut(BaseModel):
    created: int
    errors: list[str]
