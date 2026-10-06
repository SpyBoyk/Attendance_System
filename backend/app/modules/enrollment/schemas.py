from datetime import datetime

from pydantic import BaseModel


class FaceEnrollmentOut(BaseModel):
    user_id: str
    photo_base64: str
    enrolled_at: datetime

    model_config = {"from_attributes": True}


class EnrollmentStatusOut(BaseModel):
    user_id: str
    full_name: str
    email: str
    role: str
    enrolled: bool
