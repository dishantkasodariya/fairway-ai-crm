"""
Nightly signals-refresh cron: never-researched companies first, then the
stalest by OpportunityScore.computed_at, capped at signals_cron_batch_size
per run - a guardrail against a bill spike from resignaling everything at
once. Reuses run_signal_research_job unchanged, same as the batch
revenue-enrich endpoint reuses run_revenue_research_job.
"""

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.config import get_settings
from app.db.base import SessionLocal
from app.db.models import Company, Job, JobStatus, JobType, OpportunityScore
from jobs.runner import run_signal_research_job

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


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


def _select_batch(batch_size: int) -> list[int]:
    db = SessionLocal()
    try:
        never_scored = (
            db.query(Company.id)
            .outerjoin(OpportunityScore, OpportunityScore.company_id == Company.id)
            .filter(OpportunityScore.id.is_(None))
            .filter(Company.parent_company_id.is_(None))  # one research per account, not per gate
            .order_by(Company.id.asc())
            .limit(batch_size)
            .all()
        )
        company_ids = [c.id for c in never_scored]

        remaining = batch_size - len(company_ids)
        if remaining > 0:
            stalest = (
                db.query(Company.id)
                .join(OpportunityScore, OpportunityScore.company_id == Company.id)
                .filter(Company.parent_company_id.is_(None))
                .order_by(OpportunityScore.computed_at.asc())
                .limit(remaining)
                .all()
            )
            company_ids.extend(c.id for c in stalest)

        return company_ids
    finally:
        db.close()


def run_signals_cron_batch() -> None:
    settings = get_settings()
    company_ids = _select_batch(settings.signals_cron_batch_size)

    logger.info("signals cron: processing %d companies", len(company_ids))
    for company_id in company_ids:
        try:
            job_id = _create_signal_job(company_id)
            run_signal_research_job(job_id)
        except Exception:  # noqa: BLE001 - one company's failure shouldn't stop the batch
            logger.exception("signals cron: company %s failed", company_id)


def start_signals_scheduler() -> BackgroundScheduler:
    """Idempotent: safe to call more than once (e.g. across lifespan re-entry in tests)."""
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    settings = get_settings()
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        run_signals_cron_batch,
        "interval",
        hours=settings.signals_cron_interval_hours,
        id="signals_cron_batch",
    )
    scheduler.start()
    _scheduler = scheduler
    return scheduler
