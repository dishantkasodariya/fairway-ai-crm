"""
Lightweight job execution: FastAPI BackgroundTasks + a DB-backed job row for
status. No Celery/Redis — batch volume is ~50-500 companies, once or twice
a year, so a distributed queue would be infra with no payoff here.
"""

import logging
from datetime import datetime, timezone
from urllib.parse import urlparse

import requests
from sqlalchemy import func

from app.config import get_settings
from app.db.base import SessionLocal
from app.db.models import Company, Contact, Job, JobStatus, JobType, OpportunityScore, RevenueSnapshot, Signal, SignalType
from agents.revenue_agent import RevenueAgent
from agents.signal_agent import SignalAgent
from agents.enrichment.apollo_client import ApolloApiError, ApolloClient
from scoring.fusion import fuse_signals, merge_requirement

logger = logging.getLogger(__name__)


def _utcnow():
    return datetime.now(timezone.utc)


def _notify_callback(job: Job) -> None:
    if not job.callback_url:
        return
    payload = {
        "job_id": job.id,
        "type": job.type.value,
        "company_id": job.company_id,
        "status": job.status.value,
        "result": job.result,
        "error": job.error,
    }
    try:
        requests.post(job.callback_url, json=payload, timeout=10)
    except requests.RequestException as e:
        logger.warning("Callback to %s for job %s failed: %s", job.callback_url, job.id, e)


def run_revenue_research_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).one()
        job.status = JobStatus.running
        job.started_at = _utcnow()
        db.commit()

        try:
            company = db.query(Company).filter(Company.id == job.company_id).one()
            agent = RevenueAgent(settings=get_settings())
            result = agent.research(name=company.name, address=company.address or "", website=company.website)

            db.add(
                RevenueSnapshot(
                    company_id=company.id,
                    revenue=result.get("revenue"),
                    revenue_cr=result.get("revenue_cr"),
                    fiscal_year=result.get("fiscal_year"),
                    source_name=result.get("source_name"),
                    source_url=result.get("source_url"),
                    method=result.get("method"),
                    confidence=result.get("confidence"),
                )
            )
            job.result = result
            job.status = JobStatus.done
        except Exception as e:  # noqa: BLE001 — record failure on the job row, don't crash the worker
            logger.exception("Revenue research job %s failed", job_id)
            job.status = JobStatus.failed
            job.error = str(e)
        finally:
            job.finished_at = _utcnow()
            db.commit()
        _notify_callback(job)
    finally:
        db.close()


def run_signal_research_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).one()
        job.status = JobStatus.running
        job.started_at = _utcnow()
        db.commit()

        try:
            company = db.query(Company).filter(Company.id == job.company_id).one()
            agent = SignalAgent(settings=get_settings())
            found = agent.research(
                name=company.name, address=company.address or "", business_type=company.business_type
            )

            new_count = 0
            for s in found.get("signals", []):
                if s.get("type") not in SignalType._value2member_map_ or not s.get("source_url"):
                    continue
                db.add(
                    Signal(
                        company_id=company.id,
                        type=SignalType(s["type"]),
                        summary=s.get("summary", ""),
                        date=s.get("date") or None,
                        source_name=s.get("source_name") or None,
                        source_url=s.get("source_url") or None,
                        confidence=s.get("confidence") or None,
                    )
                )
                new_count += 1
            db.flush()

            all_signals = db.query(Signal).filter(Signal.company_id == company.id).all()
            signal_dicts = [
                {
                    "type": s.type.value,
                    "summary": s.summary,
                    "date": s.date or "",
                    "source_name": s.source_name or "",
                    "source_url": s.source_url or "",
                    "confidence": s.confidence or "low",
                }
                for s in all_signals
            ]
            latest_revenue_cr = (
                db.query(func.max(RevenueSnapshot.revenue_cr))
                .filter(RevenueSnapshot.company_id == company.id)
                .scalar()
            )
            fused = fuse_signals(
                revenue_cr=latest_revenue_cr,
                signals=signal_dicts,
                estimated_sqft=found.get("estimated_sqft", ""),
            )

            score_row = (
                db.query(OpportunityScore).filter(OpportunityScore.company_id == company.id).one_or_none()
            )
            if score_row is None:
                score_row = OpportunityScore(company_id=company.id)
                db.add(score_row)

            score_row.score = fused["opportunity_score"]
            score_row.why = fused["why"]
            score_row.estimated_requirement, score_row.requirement_basis = merge_requirement(
                score_row.estimated_requirement,
                score_row.requirement_basis,
                fused["estimated_requirement"],
                fused["requirement_basis"],
            )
            score_row.recommended_action = fused["recommended_action"]
            score_row.confidence = fused["confidence"]
            score_row.latest_signal_date = fused["latest_signal_date"]
            score_row.latest_signal_sort_key = fused["latest_signal_sort_key"]
            score_row.latest_signal_freshness = fused["latest_signal_freshness"]

            job.result = {"new_signals_found": new_count, "opportunity_score": fused["opportunity_score"]}
            job.status = JobStatus.done
        except Exception as e:  # noqa: BLE001 — record failure on the job row, don't crash the worker
            logger.exception("Signal research job %s failed", job_id)
            job.status = JobStatus.failed
            job.error = str(e)
        finally:
            job.finished_at = _utcnow()
            db.commit()
        _notify_callback(job)
    finally:
        db.close()


def _company_domain(website: str | None) -> str | None:
    if not website:
        return None
    parsed = urlparse(website if "://" in website else f"//{website}")
    domain = parsed.netloc or parsed.path
    return domain.replace("www.", "").strip("/") or None


def run_contact_enrich_job(job_id: int) -> None:
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).one()
        job.status = JobStatus.running
        job.started_at = _utcnow()
        db.commit()

        try:
            company = db.query(Company).filter(Company.id == job.company_id).one()
            domain = _company_domain(company.website)
            if not domain:
                raise ValueError("Company has no website on file; cannot resolve a domain for Apollo search")

            client = ApolloClient(api_key=get_settings().apollo_api_key)
            people = client.search_people(organization_domain=domain)

            new_count = 0
            for p in people:
                name = f"{p.get('first_name', '')} {p.get('last_name', '')}".strip() or p.get("name") or "Unknown"
                phone = None
                if p.get("phone_numbers"):
                    phone = p["phone_numbers"][0].get("raw_number")
                db.add(
                    Contact(
                        company_id=company.id,
                        name=name,
                        title=p.get("title"),
                        email=p.get("email"),
                        email_status=p.get("email_status"),
                        phone=phone,
                        linkedin_url=p.get("linkedin_url"),
                        source="apollo",
                        confidence=None,
                    )
                )
                new_count += 1
            db.flush()

            job.result = {"new_contacts_found": new_count}
            job.status = JobStatus.done
        except ApolloApiError as e:  # noqa: BLE001 — record failure on the job row, don't crash the worker
            logger.warning("Contact enrich job %s: Apollo API error (%s): %s", job_id, e.status_code, e)
            job.status = JobStatus.failed
            job.error = f"Apollo API error ({e.status_code}): {e}"
        except Exception as e:  # noqa: BLE001 — record failure on the job row, don't crash the worker
            logger.exception("Contact enrich job %s failed", job_id)
            job.status = JobStatus.failed
            job.error = str(e)
        finally:
            job.finished_at = _utcnow()
            db.commit()
        _notify_callback(job)
    finally:
        db.close()


JOB_HANDLERS = {
    JobType.revenue_research: run_revenue_research_job,
    JobType.signal_research: run_signal_research_job,
    JobType.contact_enrichment: run_contact_enrich_job,
}


def dispatch_job(job_type: JobType, job_id: int) -> None:
    handler = JOB_HANDLERS.get(job_type)
    if handler is None:
        raise ValueError(f"No handler registered for job type: {job_type}")
    handler(job_id)
