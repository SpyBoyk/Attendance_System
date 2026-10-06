from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.is_sqlite else {}
# pool_pre_ping: Render's free-tier Postgres can silently drop idle
# connections; this pings before reuse instead of surfacing a stale-connection
# error on the next request. No-op cost on SQLite.
engine = create_engine(settings.database_url, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import app.models  # noqa: F401  ensure every module's models register on Base.metadata

    Base.metadata.create_all(bind=engine)
