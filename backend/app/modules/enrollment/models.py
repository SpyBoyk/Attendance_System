import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class FaceEnrollment(Base):
    """One enrolled face per user. The embedding is what check-in matching
    actually uses; the photo is stored as base64 text (not a filesystem
    path) since the deployed backend's disk is ephemeral across redeploys."""

    __tablename__ = "face_enrollments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), unique=True, index=True)
    face_embedding_json: Mapped[list[float]] = mapped_column(JSON)
    photo_base64: Mapped[str] = mapped_column(Text)
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    enrolled_by: Mapped[str | None] = mapped_column(String(36), ForeignKey("users.id"), nullable=True)
