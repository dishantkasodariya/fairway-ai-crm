"""
Scheduled signal hunt. Once a day at SIGNALS_CRON_HOUR_IST (India time):

  1. re-check watched companies not checked for SIGNALS_RECHECK_DAYS, best score first
  2. fill what's left of SIGNALS_CRON_BATCH_SIZE with suitable companies never researched,
     nearest a warehouse first

A company is watched once it scores >= SIGNALS_WATCH_MIN_SCORE, when it's added to the
CRM, or by hand on its prospect page. Each check is a signal_research job with
trigger='scheduled', which is what the company's check history shows. New signals are
de-duplicated against what's already known (jobs/runner.py).

A Postgres advisory lock makes sure only one process runs the hunt, even with several
API workers or replicas.
"""

import logging
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import or_, text

from app.config import get_settings
from app.db.base import SessionLocal, engine
from app.db.models import Company, Job, JobStatus, JobType, OpportunityScore
from jobs.runner import run_signal_research_job

logger = logging.getLogger(__name__)

HUNT_LOCK_ID = 42_007  # arbitrary, unique to this job

_scheduler: BackgroundScheduler | None = None


def _create_signal_job(company_id: int) -> int:
    db = SessionLocal()
    try:
        job = Job(type=JobType.signal_research, company_id=company_id, status=JobStatus.queued, trigger="scheduled")
        db.add(job)
        db.commit()
        db.refresh(job)
        return job.id
    finally:
        db.close()


def select_hunt_batch(now: datetime | None = None) -> tuple[list[int], list[int]]:
    """(watched companies due a re-check, never-researched suitable companies) for one run."""
    settings = get_settings()
    now = now or datetime.now(timezone.utc).replace(tzinfo=None)
    due_before = now - timedelta(days=settings.signals_recheck_days)
    batch = settings.signals_cron_batch_size

    db = SessionLocal()
    try:
        due = (
            db.query(Company.id)
            .outerjoin(OpportunityScore, OpportunityScore.company_id == Company.id)
            .filter(Company.watch_signals.is_(True), Company.parent_company_id.is_(None))
            .filter(or_(Company.signals_checked_at.is_(None), Company.signals_checked_at < due_before))
            .order_by(OpportunityScore.score.desc().nullslast(), Company.signals_checked_at.asc().nullsfirst(), Company.id)
            .limit(batch)
            .all()
        )
        due_ids = [c.id for c in due]

        fresh_ids: list[int] = []
        room = batch - len(due_ids)
        if room > 0:
            fresh = (
                db.query(Company.id)
                .outerjoin(OpportunityScore, OpportunityScore.company_id == Company.id)
                .filter(OpportunityScore.id.is_(None), Company.parent_company_id.is_(None))
                .filter(Company.business_type.in_(list(settings.business_type_tiers())))
                .order_by(Company.distance_km.asc().nullslast(), Company.id.asc())
                .limit(room)
                .all()
            )
            fresh_ids = [c.id for c in fresh]
        return due_ids, fresh_ids
    finally:
        db.close()


def run_signals_hunt(now: datetime | None = None) -> dict:
    """One scheduled hunt. Safe to call by hand; returns what it did."""
    with engine.connect() as conn:
        got_lock = conn.execute(text("SELECT pg_try_advisory_lock(:id)"), {"id": HUNT_LOCK_ID}).scalar()
        if not got_lock:
            logger.info("signals hunt: another process is already running it, skipping")
            return {"skipped": "already running"}
        try:
            due_ids, fresh_ids = select_hunt_batch(now)
            logger.info("signals hunt: %d watched companies due, %d never researched", len(due_ids), len(fresh_ids))
            ok = failed = 0
            for company_id in due_ids + fresh_ids:
                try:
                    job_id = _create_signal_job(company_id)
                    run_signal_research_job(job_id)
                    db = SessionLocal()
                    try:
                        status = db.query(Job.status).filter(Job.id == job_id).scalar()
                    finally:
                        db.close()
                    ok += status == JobStatus.done
                    failed += status != JobStatus.done
                except Exception:  # noqa: BLE001 - one company's failure shouldn't stop the hunt
                    logger.exception("signals hunt: company %s failed", company_id)
                    failed += 1
            summary = {"rechecked": len(due_ids), "new": len(fresh_ids), "ok": ok, "failed": failed}
            logger.info("signals hunt done: %s", summary)
            return summary
        finally:
            conn.execute(text("SELECT pg_advisory_unlock(:id)"), {"id": HUNT_LOCK_ID})


def start_signals_scheduler() -> BackgroundScheduler | None:
    """Idempotent: safe to call more than once (e.g. across lifespan re-entry in tests)."""
    global _scheduler
    settings = get_settings()
    if not settings.signals_cron_enabled:
        logger.info("signals hunt is off (SIGNALS_CRON_ENABLED=false)")
        return None
    if _scheduler is not None:
        return _scheduler

    scheduler = BackgroundScheduler(timezone="Asia/Kolkata")
    scheduler.add_job(
        run_signals_hunt,
        CronTrigger(hour=settings.signals_cron_hour_ist, minute=0, timezone="Asia/Kolkata"),
        id="signals_hunt",
        max_instances=1,
        coalesce=True,
        misfire_grace_time=3600,
    )
    scheduler.start()
    logger.info(
        "signals hunt scheduled daily at %02d:00 IST: re-check watched companies every %d days, %d per run",
        settings.signals_cron_hour_ist, settings.signals_recheck_days, settings.signals_cron_batch_size,
    )
    _scheduler = scheduler
    return scheduler
