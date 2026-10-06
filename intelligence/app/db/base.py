from sqlalchemy import MetaData, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import get_settings

settings = get_settings()

metadata = MetaData(schema="intelligence")

connect_args = {}
if "sqlite" not in settings.database_url:
    connect_args = {"options": "-csearch_path=intelligence,public"}

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    metadata = metadata


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

