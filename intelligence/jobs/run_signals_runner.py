"""
Signals research for one discovery run's best prospects: the companies this run
found, one per account, not yet scored, biggest revenue first (then nearest),
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
    """Account ids (a site resolves to its parent) found by the run, unscored,
    ordered by best known revenue then distance from the run's centre."""
    account_id = func.coalesce(Company.parent_company_id, Company.id)
    revenue = (
        db.query(RevenueSnapshot.company_id, func.max(RevenueSnapshot.revenue_cr).label("revenue_cr"))
        .group_by(RevenueSnapshot.company_id)
        .subquery()
    )
    rows = (
        db.query(
            account_id.label("account_id"),
            func.max(revenue.c.revenue_cr).label("revenue_cr"),
            func.min(DiscoveryRunCompany.distance_km).label("distance_km"),
        )
        .join(DiscoveryRunCompany, DiscoveryRunCompany.company_id == Company.id)
        .outerjoin(revenue, revenue.c.company_id == Company.id)
        .filter(DiscoveryRunCompany.discovery_run_id == run_id)
        .group_by(account_id)
        .subquery()
    )
    scored = db.query(OpportunityScore.company_id)
    picked = (
        db.query(rows.c.account_id)
        .filter(~rows.c.account_id.in_(scored))
        .order_by(rows.c.revenue_cr.desc().nullslast(), rows.c.distance_km.asc().nullslast(), rows.c.account_id)
        .limit(limit)
        .all()
    )
    return [r.account_id for r in picked]


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
