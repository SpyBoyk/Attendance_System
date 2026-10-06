from collections.abc import Callable

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import InvalidTokenError, decode_access_token
from app.database import get_db
from app.modules.users.models import User, UserRole

# auto_error=False so we can also accept a ?token= query param (useful for
# any future non-fetch contexts, e.g. an <img>/<a> link that can't set headers).
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(
    db: Session = Depends(get_db),
    header_token: str | None = Depends(oauth2_scheme),
    query_token: str | None = Query(default=None, alias="token"),
) -> User:
    token = header_token or query_token
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    try:
        payload = decode_access_token(token)
    except InvalidTokenError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from exc

    user = db.get(User, payload.get("sub"))
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or inactive account")
    return user


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not permitted for this role")
        return current_user

    return _check


require_admin = require_roles(UserRole.ADMIN)
require_teacher = require_roles(UserRole.TEACHER, UserRole.ADMIN)
require_hod = require_roles(UserRole.HOD, UserRole.ADMIN)
require_staff = require_roles(UserRole.TEACHER, UserRole.HOD, UserRole.ADMIN)
