from datetime import date, datetime

from pydantic import BaseModel


class StaffAttendanceOut(BaseModel):
    id: str
    user_id: str
    date: date
    check_in_at: datetime
    check_out_at: datetime | None

    model_config = {"from_attributes": True}
