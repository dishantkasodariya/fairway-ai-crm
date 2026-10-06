from contextlib import asynccontextmanager
import time

from fastapi import FastAPI
from sqlalchemy import text

from app.routers import companies, contacts, discovery, jobs
from app.db.base import engine, Base
import app.db.models  # ensure models are registered
from jobs.scheduler import start_signals_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: could not create database tables on startup: {e}")
    try:
        start_signals_scheduler()
    except Exception as e:
        print(f"Warning: scheduler startup error: {e}")
    yield


app = FastAPI(title="Fairway Company Intelligence API", version="0.1.0", lifespan=lifespan)

app.include_router(discovery.router)
app.include_router(companies.router)
app.include_router(jobs.router)
app.include_router(contacts.router)


@app.get("/health", tags=["meta"])
@app.get("/healthz", tags=["meta"])
def health():
    start = time.time()
    db_status = "healthy"
    latency_ms = 0
    error_msg = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency_ms = round((time.time() - start) * 1000, 2)
    except Exception as e:
        db_status = "unhealthy"
        error_msg = str(e)

    is_healthy = db_status == "healthy"
    return {
        "success": is_healthy,
        "status": "ok" if is_healthy else "degraded",
        "service": "Fairway Company Intelligence API",
        "checks": {
            "database": {
                "status": db_status,
                "latencyMs": latency_ms,
                **({"error": error_msg} if error_msg else {})
            }
        }
    }
