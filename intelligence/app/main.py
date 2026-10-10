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
from app.config import get_settings  # noqa: E402

_settings = get_settings()
if _settings.fake_providers:
    if _settings.environment.lower() == "production":
        raise RuntimeError("FAKE_PROVIDERS must never be enabled with ENVIRONMENT=production")
    from testing.fake_providers import install as _install_fakes  # noqa: E402

    _install_fakes()

logger = logging.getLogger(__name__)


def _mark_interrupted_work() -> None:
    """Background work runs in-process, so a restart kills it mid-way. Anything still
    'running' at startup was interrupted: say so instead of spinning forever."""
    from sqlalchemy import text

    note = "Interrupted by a service restart. Run it again."
    try:
        with engine.begin() as conn:
            conn.execute(text("UPDATE discovery_runs SET status='failed', error=:n, completed_at=now() WHERE status IN ('queued','running')"), {"n": note})
            conn.execute(text("UPDATE discovery_runs SET pipeline_status='failed', pipeline_note=:n WHERE pipeline_status='running'"), {"n": note})
            conn.execute(text("UPDATE discovery_runs SET revenue_enrichment_status='done' WHERE revenue_enrichment_status='running'"))
            conn.execute(text("UPDATE discovery_runs SET signals_status='done' WHERE signals_status='running'"))
            conn.execute(text("UPDATE discovery_runs SET contacts_status='done' WHERE contacts_status='running'"))
            conn.execute(text("UPDATE jobs SET status='failed', error=:n, finished_at=now() WHERE status IN ('queued','running')"), {"n": note})
    except Exception:
        logger.exception("Could not mark interrupted work")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        Base.metadata.create_all(bind=engine)
    except Exception:
        logger.exception("Warning initializing database schema")

    _mark_interrupted_work()
    if not _settings.fake_providers:  # the cron would research real companies with fake agents
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
app.include_router(companies.signals_router)
app.include_router(jobs.router)
app.include_router(contacts.router)


@app.get("/healthz", tags=["meta"])
@app.get("/health", tags=["meta"])
def healthz():
    return {"status": "ok"}

