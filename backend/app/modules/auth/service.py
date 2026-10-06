from datetime import datetime, timezone

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, hash_password, verify_password
from app.modules.enrollment.face_engine import decode_image, get_face_engine
from app.modules.enrollment.models import FaceEnrollment
from app.modules.enrollment.service import encode_storage_photo
from app.modules.users.models import User, UserRole

# Same default used for attendance face check-in (app/modules/attendance/service.py).
FACE_MATCH_THRESHOLD = 0.363


class InvalidCredentialsError(Exception):
    pass


class WeakPasswordError(ValueError):
    pass


class EmailAlreadyRegisteredError(Exception):
    pass


class InvalidImageError(Exception):
    pass


class NoFaceDetectedError(Exception):
    pass


class NoFaceMatchError(Exception):
    pass


class ManualLoginNotAllowedError(Exception):
    pass


def authenticate(db: Session, email: str, password: str) -> tuple[User, str]:
    """Password login -- restricted to ADMIN accounts. Every other role
    must sign in with login_via_face() instead."""
    user = db.scalar(select(User).where(User.email == email.lower()))
    if user is None or not user.is_active or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError("Incorrect email or password")
    if user.role != UserRole.ADMIN:
        raise ManualLoginNotAllowedError("This account must sign in with face recognition")
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    token = create_access_token(user.id, user.email, user.role.value)
    return user, token


def login_via_face(db: Session, photo_bytes: bytes) -> tuple[User, str]:
    """1:N face login -- matches the captured frame against every enrolled
    face (not scoped to one class roster, unlike attendance check-in)."""
    image = decode_image(photo_bytes)
    if image is None:
        raise InvalidImageError("Could not read that image file")
    embedding = get_face_engine().detect_and_embed(image)
    if embedding is None:
        raise NoFaceDetectedError("No face detected -- look directly at the camera")

    enrollments = list(db.scalars(select(FaceEnrollment)))
    if not enrollments:
        raise NoFaceMatchError("No enrolled faces to match against")

    engine = get_face_engine()
    best_user_id, best_score = None, -1.0
    for row in enrollments:
        reference = np.array(row.face_embedding_json, dtype=np.float32)
        score = engine.match_score(embedding, reference)
        if score > best_score:
            best_user_id, best_score = row.user_id, score

    if best_user_id is None or best_score < FACE_MATCH_THRESHOLD:
        raise NoFaceMatchError("Face not recognized")

    user = db.get(User, best_user_id)
    if user is None or not user.is_active:
        raise NoFaceMatchError("Account not found or inactive")

    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    token = create_access_token(user.id, user.email, user.role.value)
    return user, token


def register_self(db: Session, full_name: str, email: str, password: str, photo_bytes: bytes) -> User:
    """Self-service sign-up, always as a STUDENT. The photo is required and
    must contain a detectable face -- it becomes the account's face-checkin
    enrollment immediately, so there's no separate admin enrollment step.
    The account starts inactive: an Admin must activate it (Users page)
    before this person can actually log in."""
    email = email.strip().lower()
    if db.scalar(select(User).where(User.email == email)):
        raise EmailAlreadyRegisteredError(f"{email} is already registered")
    if len(password) < 8:
        raise WeakPasswordError("Password must be at least 8 characters")

    image = decode_image(photo_bytes)
    if image is None:
        raise InvalidImageError("Could not read that image file")
    embedding = get_face_engine().detect_and_embed(image)
    if embedding is None:
        raise NoFaceDetectedError("No face detected -- upload a clear, front-facing photo")

    user = User(
        full_name=full_name.strip(),
        email=email,
        password_hash=hash_password(password),
        role=UserRole.STUDENT,
        is_active=False,
        must_change_password=False,
    )
    db.add(user)
    db.flush()

    db.add(
        FaceEnrollment(
            user_id=user.id,
            face_embedding_json=embedding.flatten().tolist(),
            photo_base64=encode_storage_photo(image),
            enrolled_by=user.id,
        )
    )
    db.commit()
    db.refresh(user)
    return user


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    if not verify_password(current_password, user.password_hash):
        raise InvalidCredentialsError("Current password is incorrect")
    if len(new_password) < 8:
        raise WeakPasswordError("New password must be at least 8 characters")
    user.password_hash = hash_password(new_password)
    user.must_change_password = False
    db.commit()
