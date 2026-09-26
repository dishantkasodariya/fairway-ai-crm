"""
Batch revenue-enrich for one discovery run: a small thread pool (bounded by
the run's own company count - tens, not hundreds) fans out per-company
revenue research, reusing run_revenue_research_job's existing Job-row +
error-handling logic unchanged. Each worker creates its own Job row via its
own SessionLocal() (mirrors jobs.py's _create_and_enqueue), then calls
run_revenue_research_job directly, which opens/closes its own session too -
so no SQLAlchemy session ever crosses a thread boundary.
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

from app.db.base import SessionLocal
from app.db.models import Company, DiscoveryRun, Job, JobStatus, JobType, RevenueEnrichmentStatus
from jobs.runner import run_revenue_research_job

logger = logging.getLogger(__name__)

MAX_WORKERS = 4


def _create_revenue_job(company_id: int) -> int:
    db = SessionLocal()
    try:
        job = Job(type=JobType.revenue_research, company_id=company_id, status=JobStatus.queued)
        db.add(job)
        db.commit()
        db.refresh(job)
        return job.id
    finally:
        db.close()


def _enrich_one(company_id: int) -> None:
    job_id = _create_revenue_job(company_id)
    run_revenue_research_job(job_id)


def run_enrich_revenue_job(run_id: int) -> None:
    db = SessionLocal()
    try:
        run = db.query(DiscoveryRun).filter(DiscoveryRun.id == run_id).one_or_none()
        if run is None:
            logger.error("enrich-revenue: discovery run %s not found", run_id)
            return

        try:
            companies = (
                db.query(Company)
                .filter(Company.discovery_run_id == run_id)
                .filter(~Company.revenue_snapshots.any())
                .all()
            )
            company_ids = [c.id for c in companies]

            if company_ids:
                with ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
                    futures = {pool.submit(_enrich_one, cid): cid for cid in company_ids}
                    for future in as_completed(futures):
                        cid = futures[future]
                        try:
                            future.result()
                        except Exception:  # noqa: BLE001 - one company's failure shouldn't stop the batch
                            logger.exception("enrich-revenue: company %s failed", cid)
                        run.revenue_enriched_count = (run.revenue_enriched_count or 0) + 1
                        db.commit()

            run.revenue_enrichment_status = RevenueEnrichmentStatus.done
            db.commit()
        except Exception:  # noqa: BLE001 - never leave the run stuck on "running"
            logger.exception("enrich-revenue: run %s failed", run_id)
            run.revenue_enrichment_status = RevenueEnrichmentStatus.done
            db.commit()
    finally:
        db.close()
