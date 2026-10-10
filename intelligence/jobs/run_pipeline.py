"""
One-click intelligence pipeline for a discovery run:

  1. revenue  - research revenue for the run's suitable companies that have none
  2. rank     - business-type fit x revenue size (unsuitable types are skipped entirely)
  3. signals  - research + score in batches of `signals_batch_size`, best first, batch
                after batch until every suitable company is done (or `signals_max`)
  4. contacts - Apollo People Search for the `contacts_top_n` best-scored companies

Progress is written to the run row after every company, so the CRM can poll
GET /v1/discovery/runs/{id}. Same no-queue model as the other runners; a restart
mid-pipeline is marked as interrupted at startup (see app.main).
"""

import logging
import math
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass

from sqlalchemy import func

from agents.enrichment.apollo_client import ApolloApiError, ApolloClient
from app.config import get_settings
from app.db.base import SessionLocal
from app.db.models import (
    Company,
    Contact,
    DiscoveryRun,
    DiscoveryRunCompany,
    Job,
    JobStatus,
    JobType,
    OpportunityScore,
    RevenueSnapshot,
)
from app.observability import get_tracer
from jobs.runner import company_domain, run_revenue_research_job, run_signal_research_job, save_apollo_people

logger = logging.getLogger(__name__)
tracer = get_tracer()

RETRY_PAUSE_S = 20


@dataclass
class Prospect:
    account_id: int
    business_type: str | None
    revenue_cr: float | None
    distance_km: float | None
    fit: float
    scored: bool

    @property
    def priority(self) -> float:
        # Fit first, then size: log scale so revenue ranks without swamping fit
        # (₹10 Cr -> 2.0, ₹100 Cr -> 3.0, ₹1,000 Cr -> 4.0). Unknown revenue counts as small.
        size = 1 + math.log10(1 + self.revenue_cr) if self.revenue_cr else 1.0
        return self.fit * size


def run_prospects(db, run_id: int) -> list[Prospect]:
    """Every account (a site resolves to its parent) this run found, with its fit,
    best revenue, nearest distance to the run's centre and whether it's scored."""
    tiers = get_settings().business_type_tiers()
    account_id = func.coalesce(Company.parent_company_id, Company.id)
    members = (
        db.query(account_id.label("account_id"), func.min(DiscoveryRunCompany.distance_km).label("distance_km"))
        .join(DiscoveryRunCompany, DiscoveryRunCompany.company_id == Company.id)
        .filter(DiscoveryRunCompany.discovery_run_id == run_id)
        .group_by(account_id)
        .subquery()
    )
    revenue = (
        db.query(
            func.coalesce(Company.parent_company_id, Company.id).label("account_id"),
            func.max(RevenueSnapshot.revenue_cr).label("revenue_cr"),
        )
        .join(RevenueSnapshot, RevenueSnapshot.company_id == Company.id)
        .group_by(func.coalesce(Company.parent_company_id, Company.id))
        .subquery()
    )
    rows = (
        db.query(Company.id, Company.business_type, members.c.distance_km, revenue.c.revenue_cr, OpportunityScore.id)
        .join(members, members.c.account_id == Company.id)
        .outerjoin(revenue, revenue.c.account_id == Company.id)
        .outerjoin(OpportunityScore, OpportunityScore.company_id == Company.id)
        .all()
    )
    return [
        Prospect(cid, btype, rev, dist, tiers.get(btype or "", 0.0), score_id is not None)
        for cid, btype, dist, rev, score_id in rows
    ]


def ranked_unscored(db, run_id: int, limit: int | None = None) -> list[int]:
    """Suitable, not-yet-scored accounts from the run, best first."""
    picked = [p for p in run_prospects(db, run_id) if p.fit > 0 and not p.scored]
    picked.sort(key=lambda p: (-p.priority, p.distance_km if p.distance_km is not None else 1e9, p.account_id))
    ids = [p.account_id for p in picked]
    return ids[:limit] if limit else ids


def _new_job(job_type: JobType, company_id: int) -> int:
    db = SessionLocal()
    try:
        job = Job(type=job_type, company_id=company_id, status=JobStatus.queued, trigger="pipeline")
        db.add(job)
        db.commit()
        return job.id
    finally:
        db.close()


def _job_succeeded(job_id: int) -> bool:
    db = SessionLocal()
    try:
        return db.query(Job.status).filter(Job.id == job_id).scalar() == JobStatus.done
    finally:
        db.close()


def _revenue_one(company_id: int) -> bool:
    job_id = _new_job(JobType.revenue_research, company_id)
    run_revenue_research_job(job_id)
    return _job_succeeded(job_id)


def _signals_one(company_id: int) -> bool:
    job_id = _new_job(JobType.signal_research, company_id)
    run_signal_research_job(job_id)
    return _job_succeeded(job_id)


def _fan_out(fn, ids: list[int], workers: int, on_result) -> list[int]:
    """Run fn over ids with `workers` in parallel; on_result(ok) after each. Returns the failed ids."""
    failed = []
    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        futures = {pool.submit(fn, cid): cid for cid in ids}
        for future in as_completed(futures):
            try:
                ok = bool(future.result())
            except Exception:  # noqa: BLE001 - one company's failure shouldn't stop the batch
                logger.exception("pipeline: company %s failed", futures[future])
                ok = False
            if not ok:
                failed.append(futures[future])
            on_result(ok)
    return failed


def _with_retry_pass(fn, ids: list[int], workers: int, on_result) -> list[int]:
    """First pass in parallel; anything that failed (usually a rate limit) gets one more,
    one-at-a-time try after a pause. Returns what still failed. on_result(ok, final)."""
    failed = _fan_out(fn, ids, workers, lambda ok: on_result(ok, False) if ok else None)
    if not failed:
        return []
    logger.info("pipeline: retrying %d failed lookups one at a time", len(failed))
    time.sleep(RETRY_PAUSE_S)
    return _fan_out(fn, failed, 1, lambda ok: on_result(ok, True))


def _set(db, run: DiscoveryRun, **fields) -> None:
    for k, v in fields.items():
        setattr(run, k, v)
    db.commit()


def run_pipeline_job(run_id: int, signals_batch_size: int | None = None, signals_max: int | None = None,
                     contacts_top_n: int | None = None) -> None:
    settings = get_settings()
    batch_size = signals_batch_size or settings.signals_batch_size
    max_signals = settings.signals_max_per_run if signals_max is None else signals_max
    top_n = settings.contacts_top_n if contacts_top_n is None else contacts_top_n

    db = SessionLocal()
    try:
        run = db.query(DiscoveryRun).filter(DiscoveryRun.id == run_id).one()
        with tracer.start_as_current_span("job.run_pipeline") as span:
            span.set_attribute("discovery_run.id", run_id)
            try:
                prospects = run_prospects(db, run_id)
                suitable = [p for p in prospects if p.fit > 0]
                _set(db, run, suitable_count=len(suitable), skipped_count=len(prospects) - len(suitable),
                     signals_batch_size=batch_size)

                # 1. Revenue for suitable companies that have none.
                need_revenue = [p.account_id for p in suitable if p.revenue_cr is None]
                workers = settings.llm_concurrency
                _set(db, run, pipeline_stage="revenue", revenue_enrichment_status="running", revenue_enriched_count=0,
                     revenue_failed_count=0, signals_failed_count=0)

                def revenue_result(ok, final):
                    if ok:
                        run.revenue_enriched_count = (run.revenue_enriched_count or 0) + 1
                    elif final:
                        run.revenue_failed_count = (run.revenue_failed_count or 0) + 1
                    db.commit()

                _with_retry_pass(_revenue_one, need_revenue, workers, revenue_result)
                _set(db, run, revenue_enrichment_status="done")

                # 2+3. Rank (now that revenue is known) and research signals batch by batch.
                queue = ranked_unscored(db, run_id)
                if max_signals:
                    queue = queue[:max_signals]
                _set(db, run, pipeline_stage="signals", signals_status="running", signals_researched_count=0,
                     signals_total=len(queue))

                def signals_result(ok, final):
                    if ok:
                        run.signals_researched_count = (run.signals_researched_count or 0) + 1
                    elif final:
                        run.signals_failed_count = (run.signals_failed_count or 0) + 1
                    db.commit()

                for start in range(0, len(queue), batch_size):
                    batch = queue[start:start + batch_size]
                    logger.info("pipeline run=%s signals batch %d-%d of %d", run_id, start + 1, start + len(batch), len(queue))
                    _with_retry_pass(_signals_one, batch, workers, signals_result)
                _set(db, run, signals_status="done")

                # 4. Apollo contacts for the best-scored companies.
                _set(db, run, pipeline_stage="contacts")
                find_contacts_for_run(db, run, top_n)

                failures = []
                if run.revenue_failed_count:
                    failures.append(f"{run.revenue_failed_count} revenue lookup(s)")
                if run.signals_failed_count:
                    failures.append(f"{run.signals_failed_count} signals lookup(s)")
                if failures:
                    note = f"{' and '.join(failures)} failed even after a retry (usually LLM rate limits). Run again to retry just those."
                    run.pipeline_note = f"{run.pipeline_note} {note}" if run.pipeline_note else note
                _set(db, run, pipeline_status="done", pipeline_stage=None)
                logger.info("pipeline run=%s done: suitable=%d revenue=%d signals=%d contacts=%d",
                            run_id, len(suitable), run.revenue_enriched_count, run.signals_researched_count,
                            run.contacts_found_count)
            except Exception as e:  # noqa: BLE001 - never leave the run stuck on "running"
                logger.exception("pipeline run=%s failed", run_id)
                span.set_attribute("run.error", str(e))
                db.rollback()
                _set(db, run, pipeline_status="failed", pipeline_note=f"Stopped during {run.pipeline_stage or 'start'}: {e}"[:500],
                     revenue_enrichment_status="done" if run.revenue_enrichment_status == "running" else run.revenue_enrichment_status,
                     signals_status="done" if run.signals_status == "running" else run.signals_status)
    finally:
        db.close()


def find_contacts_for_run(db, run: DiscoveryRun, top_n: int) -> None:
    """Apollo People Search for the run's top_n best-scored accounts that have a website
    and no Apollo contacts yet. A plan without People Search stops the step with a note."""
    settings = get_settings()
    if top_n <= 0:
        _set(db, run, contacts_status="skipped")
        return
    if not settings.apollo_api_key:
        _set(db, run, contacts_status="blocked", pipeline_note="Apollo key not set: add key people by hand on each prospect.")
        return

    scored = {p.account_id for p in run_prospects(db, run.id) if p.scored and p.fit > 0}
    has_apollo = db.query(Contact.company_id).filter(Contact.source == "apollo")
    candidates = (
        db.query(Company)
        .join(OpportunityScore, OpportunityScore.company_id == Company.id)
        .filter(Company.id.in_(scored), Company.website.isnot(None), ~Company.id.in_(has_apollo))
        .order_by(OpportunityScore.score.desc(), Company.id)
        .limit(top_n)
        .all()
    )
    _set(db, run, contacts_status="running", contacts_companies_done=0, contacts_found_count=0)
    client = ApolloClient(api_key=settings.apollo_api_key)
    for company in candidates:
        domain = company_domain(company.website)
        if not domain:
            continue
        try:
            people = client.search_people(organization_domain=domain)
        except ApolloApiError as e:
            if e.status_code in (401, 403):
                _set(db, run, contacts_status="blocked",
                     pipeline_note="Apollo rejected People Search (plan or key): add key people by hand, or upgrade the Apollo plan.")
                return
            logger.warning("pipeline: Apollo error for %r: %s", company.name, e)
            people = []
        found = save_apollo_people(db, company, people)
        _set(db, run, contacts_companies_done=run.contacts_companies_done + 1,
             contacts_found_count=run.contacts_found_count + found)
    _set(db, run, contacts_status="done")
