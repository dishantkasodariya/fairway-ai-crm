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

from app.config import get_settings
from app.db.base import SessionLocal
from app.db.models import Company, DiscoveryRun, DiscoveryRunCompany, Job, JobStatus, JobType, RevenueEnrichmentStatus
from app.observability import get_tracer
from jobs.runner import run_revenue_research_job

logger = logging.getLogger(__name__)
tracer = get_tracer()

MAX_WORKERS = 4


def _create_revenue_job(company_id: int) -> int:
    db = SessionLocal()
    try:
        job = Job(type=JobType.revenue_research, company_id=company_id, status=JobStatus.queued, trigger="pipeline")
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

        with tracer.start_as_current_span("job.enrich_revenue_batch") as span:
            span.set_attribute("discovery_run.id", run_id)
            try:
                # Only companies this run touched that still have no revenue snapshot at
                # all — a company already enriched (by this run or an earlier one) is
                # never re-researched, so re-running enrich-revenue on overlapping
                # warehouses doesn't re-spend search/LLM budget on known companies.
                companies = (
                    db.query(Company)
                    .join(DiscoveryRunCompany, DiscoveryRunCompany.company_id == Company.id)
                    .filter(DiscoveryRunCompany.discovery_run_id == run_id)
                    # Business types we'd never lease to aren't worth research spend.
                    .filter(Company.business_type.in_(list(get_settings().business_type_tiers())))
                    .filter(~Company.revenue_snapshots.any())
                    .all()
                )
                company_ids = [c.id for c in companies]
                span.set_attribute("batch.size", len(company_ids))
                logger.info("enrich-revenue: run=%s batch_size=%d", run_id, len(company_ids))

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
                logger.info("enrich-revenue: run=%s done, enriched=%d", run_id, run.revenue_enriched_count or 0)
            except Exception as e:  # noqa: BLE001 - never leave the run stuck on "running"
                logger.exception("enrich-revenue: run %s failed", run_id)
                span.set_attribute("run.error", str(e))
                run.revenue_enrichment_status = RevenueEnrichmentStatus.done
                db.commit()
    finally:
        db.close()
