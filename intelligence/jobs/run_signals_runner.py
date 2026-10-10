"""
Signals research for one discovery run's best prospects: the companies this run
found, one per account, not yet scored, best fit x revenue first (unsuitable types skipped),
capped at `limit` so a large search can't spend hundreds of search/LLM calls in
one click. Reuses run_signal_research_job unchanged, the same way
enrich_revenue_runner reuses run_revenue_research_job.
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from sqlalchemy import func

from app.db.base import SessionLocal
from app.db.models import (
    Company,
    DiscoveryRun,
    DiscoveryRunCompany,
    Job,
    JobStatus,
    JobType,
    OpportunityScore,
    RevenueSnapshot,
)
from app.observability import get_tracer
from jobs.runner import run_signal_research_job

logger = logging.getLogger(__name__)
tracer = get_tracer()

MAX_WORKERS = 3
DEFAULT_LIMIT = 10
MAX_LIMIT = 25


def select_run_prospects(db, run_id: int, limit: int) -> list[int]:
    """The run's best unscored, suitable accounts: business-type fit x revenue size."""
    from jobs.run_pipeline import ranked_unscored

    return ranked_unscored(db, run_id, limit)


def _create_signal_job(company_id: int) -> int:
    db = SessionLocal()
    try:
        job = Job(type=JobType.signal_research, company_id=company_id, status=JobStatus.queued)
        db.add(job)
        db.commit()
        db.refresh(job)
        return job.id
    finally:
        db.close()


def _research_one(company_id: int) -> None:
    run_signal_research_job(_create_signal_job(company_id))


def run_signals_for_run_job(run_id: int, limit: int = DEFAULT_LIMIT) -> None:
    db = SessionLocal()
    try:
        run = db.query(DiscoveryRun).filter(DiscoveryRun.id == run_id).one_or_none()
        if run is None:
            logger.error("run-signals: discovery run %s not found", run_id)
            return

        with tracer.start_as_current_span("job.run_signals_batch") as span:
            span.set_attribute("discovery_run.id", run_id)
            try:
                company_ids = select_run_prospects(db, run_id, limit)
                span.set_attribute("batch.size", len(company_ids))
                logger.info("run-signals: run=%s batch_size=%d", run_id, len(company_ids))

                if company_ids:
                    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
                        futures = {pool.submit(_research_one, cid): cid for cid in company_ids}
                        for future in as_completed(futures):
                            cid = futures[future]
                            try:
                                future.result()
                            except Exception:  # noqa: BLE001 - one company's failure shouldn't stop the batch
                                logger.exception("run-signals: company %s failed", cid)
                            run.signals_researched_count = (run.signals_researched_count or 0) + 1
                            db.commit()
            except Exception as e:  # noqa: BLE001 - never leave the run stuck on "running"
                logger.exception("run-signals: run %s failed", run_id)
                span.set_attribute("run.error", str(e))
                db.rollback()
            finally:
                run.signals_status = "done"
                db.commit()
                logger.info("run-signals: run=%s done, researched=%d", run_id, run.signals_researched_count or 0)
    finally:
        db.close()
