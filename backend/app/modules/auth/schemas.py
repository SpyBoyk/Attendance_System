from pydantic import BaseModel, EmailStr

from app.modules.users.models import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: str
    full_name: str
    email: str
    role: UserRole
    department_id: str | None
    is_active: bool
    must_change_password: bool

    model_config = {"from_attributes": True}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class RegisterOut(BaseModel):
    detail: str
    user: "UserOut"
