from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import companies, contacts, discovery, jobs
from jobs.scheduler import start_signals_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_signals_scheduler()
    yield


app = FastAPI(title="Fairway Company Intelligence API", version="0.1.0", lifespan=lifespan)

app.include_router(discovery.router)
app.include_router(companies.router)
app.include_router(jobs.router)
app.include_router(contacts.router)


@app.get("/healthz", tags=["meta"])
def healthz():
    return {"status": "ok"}
