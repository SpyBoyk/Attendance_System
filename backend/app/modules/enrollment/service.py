import base64

import cv2
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.modules.enrollment.face_engine import decode_image, get_face_engine
from app.modules.enrollment.models import FaceEnrollment
from app.modules.users.models import User

STORAGE_MAX_SIDE = 320


class UserNotFoundError(Exception):
    pass


class NoFaceDetectedError(Exception):
    pass


class InvalidImageError(Exception):
    pass


def encode_storage_photo(image) -> str:
    h, w = image.shape[:2]
    scale = STORAGE_MAX_SIDE / max(h, w)
    if scale < 1:
        image = cv2.resize(image, (int(w * scale), int(h * scale)))
    ok, buf = cv2.imencode(".jpg", image, [cv2.IMWRITE_JPEG_QUALITY, 85])
    if not ok:
        raise InvalidImageError("Could not encode photo")
    return base64.b64encode(buf.tobytes()).decode("ascii")


def enroll_face(db: Session, user_id: str, photo_bytes: bytes, enrolled_by: str) -> FaceEnrollment:
    user = db.get(User, user_id)
    if user is None:
        raise UserNotFoundError(f"User {user_id} not found")

    image = decode_image(photo_bytes)
    if image is None:
        raise InvalidImageError("Could not decode image")

    embedding = get_face_engine().detect_and_embed(image)
    if embedding is None:
        raise NoFaceDetectedError("No face detected in the photo")

    photo_base64 = encode_storage_photo(image)

    row = db.scalar(select(FaceEnrollment).where(FaceEnrollment.user_id == user_id))
    if row:
        row.face_embedding_json = embedding.flatten().tolist()
        row.photo_base64 = photo_base64
        row.enrolled_by = enrolled_by
    else:
        row = FaceEnrollment(
            user_id=user_id,
            face_embedding_json=embedding.flatten().tolist(),
            photo_base64=photo_base64,
            enrolled_by=enrolled_by,
        )
        db.add(row)
    db.commit()
    db.refresh(row)
    return row


def get_enrollment(db: Session, user_id: str) -> FaceEnrollment | None:
    return db.scalar(select(FaceEnrollment).where(FaceEnrollment.user_id == user_id))


def delete_enrollment(db: Session, user_id: str) -> None:
    row = get_enrollment(db, user_id)
    if row:
        db.delete(row)
        db.commit()


def list_status(db: Session, role: str | None = None) -> list[tuple[User, bool]]:
    stmt = select(User).where(User.is_active.is_(True))
    if role:
        stmt = stmt.where(User.role == role)
    users = list(db.scalars(stmt.order_by(User.full_name)))
    enrolled_ids = {
        row.user_id for row in db.scalars(select(FaceEnrollment).where(FaceEnrollment.user_id.in_([u.id for u in users])))
    }
    return [(u, u.id in enrolled_ids) for u in users]
