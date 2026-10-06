from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.config import get_settings
from app.db.base import Base, engine
import app.db.models  # ensure models are loaded
from app.routers import companies, contacts, discovery, jobs
from jobs.scheduler import start_signals_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    try:
        with engine.begin() as conn:
            if "sqlite" not in settings.database_url:
                conn.execute(text("CREATE SCHEMA IF NOT EXISTS intelligence;"))
            Base.metadata.create_all(bind=conn)
    except Exception as e:
        print(f"[intelligence] Warning initializing database schema: {e}")

    start_signals_scheduler()
    yield


app = FastAPI(title="Fairway Company Intelligence API", version="0.1.0", lifespan=lifespan)

app.include_router(discovery.router)
app.include_router(companies.router)
app.include_router(jobs.router)
app.include_router(contacts.router)


@app.get("/healthz", tags=["meta"])
@app.get("/health", tags=["meta"])
def healthz():
    return {"status": "ok"}

