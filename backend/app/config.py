from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # SQLite locally (zero setup); Render deployment overrides this to a
    # Postgres URL via the DATABASE_URL env var -- see .env.example.
    database_url: str = "sqlite:///./attendance.db"

    jwt_secret_key: str = "dev-only-insecure-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480

    cors_origins: str = "http://localhost:5173"

    @field_validator("database_url")
    @classmethod
    def _normalize_postgres_driver(cls, v: str) -> str:
        """Render's managed Postgres hands back a bare postgres(ql):// URL,
        which SQLAlchemy defaults to the (uninstalled) psycopg2 driver.
        Force the psycopg (v3) driver we actually install instead."""
        if v.startswith("postgres://"):
            return "postgresql+psycopg://" + v[len("postgres://") :]
        if v.startswith("postgresql://"):
            return "postgresql+psycopg://" + v[len("postgresql://") :]
        return v

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_sqlite(self) -> bool:
        return self.database_url.startswith("sqlite")


@lru_cache
def get_settings() -> Settings:
    return Settings()
