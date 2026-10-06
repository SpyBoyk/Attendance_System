import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.modules.academics.router import router as academics_router
from app.modules.attendance.router import router as attendance_router
from app.modules.auth.router import router as auth_router
from app.modules.enrollment.router import router as enrollment_router
from app.modules.reports.router import router as reports_router
from app.modules.staff_attendance.router import router as staff_attendance_router
from app.modules.users.router import router as users_router

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(title="Smart College Attendance System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(academics_router)
app.include_router(attendance_router)
app.include_router(enrollment_router)
app.include_router(staff_attendance_router)
app.include_router(reports_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
