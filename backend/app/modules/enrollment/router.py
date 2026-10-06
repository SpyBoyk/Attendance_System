from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_admin
from app.database import get_db
from app.modules.enrollment import service
from app.modules.enrollment.schemas import EnrollmentStatusOut, FaceEnrollmentOut
from app.modules.users.models import User, UserRole

router = APIRouter(prefix="/api/v1/enrollment", tags=["enrollment"])


@router.post("/face/{user_id}", response_model=FaceEnrollmentOut, dependencies=[Depends(require_admin)])
async def enroll_face(user_id: str, photo: UploadFile, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> FaceEnrollmentOut:
    content = await photo.read()
    try:
        row = service.enroll_face(db, user_id, content, current_user.id)
    except service.UserNotFoundError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, str(exc)) from exc
    except service.NoFaceDetectedError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc
    except service.InvalidImageError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    return FaceEnrollmentOut.model_validate(row)


@router.get("/face/{user_id}", response_model=FaceEnrollmentOut | None, dependencies=[Depends(get_current_user)])
def get_face_enrollment(user_id: str, db: Session = Depends(get_db)) -> FaceEnrollmentOut | None:
    row = service.get_enrollment(db, user_id)
    return FaceEnrollmentOut.model_validate(row) if row else None


@router.delete("/face/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_face_enrollment(user_id: str, db: Session = Depends(get_db)) -> None:
    service.delete_enrollment(db, user_id)


@router.get("/status", response_model=list[EnrollmentStatusOut], dependencies=[Depends(require_admin)])
def enrollment_status(role: UserRole | None = None, db: Session = Depends(get_db)) -> list[EnrollmentStatusOut]:
    rows = service.list_status(db, role.value if role else None)
    return [
        EnrollmentStatusOut(user_id=u.id, full_name=u.full_name, email=u.email, role=u.role.value, enrolled=enrolled)
        for u, enrolled in rows
    ]
