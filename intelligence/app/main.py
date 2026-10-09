import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.observability import configure_logging, configure_tracing
from app.rate_limit import limiter

configure_logging()  # before any other import logs anything

from app.db.base import Base, engine  # noqa: E402
import app.db.models  # noqa: E402  # ensure models are loaded
from app.routers import companies, contacts, discovery, jobs  # noqa: E402
from jobs.scheduler import start_signals_scheduler  # noqa: E402

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        logger.exception("Warning initializing database schema")

    start_signals_scheduler()
    logger.info("intelligence service startup complete")
    yield


app = FastAPI(title="Fairway Company Intelligence API", version="0.1.0", lifespan=lifespan)

configure_tracing(app, engine)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.include_router(discovery.router)
app.include_router(companies.router)
app.include_router(jobs.router)
app.include_router(contacts.router)


@app.get("/healthz", tags=["meta"])
@app.get("/health", tags=["meta"])
def healthz():
    return {"status": "ok"}

