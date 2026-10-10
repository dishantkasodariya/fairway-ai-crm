"""
Discovery run execution: tiled Places search + business-type classification,
persisted so a CRM polling GET /v1/discovery/runs/{id} can watch it complete
and then pull the resulting companies. Runs via FastAPI BackgroundTasks —
same no-queue rationale as jobs/runner.py (batch volume is low: one run per
warehouse property, not a continuous stream).
"""

import logging
from datetime import datetime, timezone

from app.config import get_settings
from app.db.base import SessionLocal
from sqlalchemy.dialects.postgresql import insert

from app.db.models import Company, CompanyWarehouseLink, DiscoveryRun, DiscoveryRunCompany, DiscoveryRunStatus
from app.observability import get_tracer
from classification.ai_fallback import AIFallbackClassifier
from classification.rules import classify
from discovery.site_grouping import apply_site_groups
from discovery.tiling import find_companies_tiled

logger = logging.getLogger(__name__)
tracer = get_tracer()

# Fixed 3km sub-circles, no auto-subdivision — same approach validated on
# Surat's 50km sweep (see app.py, the Streamlit explorer this replaces).
BASE_SUB_RADIUS_M = 3000


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _link_to_warehouse(db, company: Company, run: DiscoveryRun, distance_km: float | None) -> None:
    """Record that this company is near the run's warehouse. A company already
    linked to the warehouse keeps its original link; one found again from a
    different warehouse gains a second link instead of a duplicate row."""
    if not run.property_id:
        return
    db.execute(
        insert(CompanyWarehouseLink)
        .values(
            company_id=company.id,
            property_id=run.property_id,
            discovery_run_id=run.id,
            distance_km=distance_km,
        )
        .on_conflict_do_nothing(constraint="uq_company_warehouse")
    )
    # companies.distance_km = distance to the nearest known warehouse.
    if distance_km is not None and (company.distance_km is None or distance_km < company.distance_km):
        company.distance_km = distance_km


def _record_in_run(db, company: Company, run: DiscoveryRun, distance_km: float | None, is_new: bool) -> None:
    """Remember that this run found the company, so the run's results list it
    even when an earlier run (or another warehouse) found it first."""
    db.execute(
        insert(DiscoveryRunCompany)
        .values(discovery_run_id=run.id, company_id=company.id, distance_km=distance_km, is_new=is_new)
        .on_conflict_do_nothing(constraint="uq_run_company")
    )


def run_discovery_job(run_id: int) -> None:
    db = SessionLocal()
    try:
        run = db.query(DiscoveryRun).filter(DiscoveryRun.id == run_id).one()
        run.status = DiscoveryRunStatus.running
        db.commit()

        with tracer.start_as_current_span("job.discovery_run") as span:
            span.set_attribute("discovery_run.id", run_id)
            span.set_attribute("discovery_run.radius_km", run.radius_km)
            span.set_attribute("discovery_run.property_id", run.property_id or "")
            try:
                settings = get_settings()
                result = find_companies_tiled(
                    run.warehouse_lat,
                    run.warehouse_lng,
                    run.radius_km * 1000,
                    settings.places_api,
                    base_sub_radius_m=BASE_SUB_RADIUS_M,
                    max_depth=0,
                    max_workers=4,
                    max_qps=5,
                )

                stats = result["stats"]
                failed = result.get("failed_circles") or []
                if failed and stats.get("failed_calls", 0) >= stats.get("total_calls", 0):
                    # Every Places call failed (bad/exhausted key, API disabled...). Say so
                    # instead of reporting a clean run that found nothing.
                    raise RuntimeError(f"Google Places search failed for every area searched: {failed[0]['error']}")

                ai_classifier = AIFallbackClassifier(settings)
                created = 0
                linked = 0
                for c in result["companies"]:
                    existing = None
                    if c.get("id"):
                        existing = db.query(Company).filter(Company.place_id == c["id"]).one_or_none()
                    if existing is not None:
                        if existing.discovery_run_id is None:
                            existing.discovery_run_id = run.id
                        _link_to_warehouse(db, existing, run, c.get("distance_km"))
                        _record_in_run(db, existing, run, c.get("distance_km"), is_new=False)
                        linked += 1
                        continue

                    category = classify(c["name"])
                    confidence, reason = "high", "rule-based keyword match"
                    if category == "?":
                        try:
                            ai_result = ai_classifier.classify(c["name"], c.get("address") or "", c.get("website"))
                            category = ai_result["category"]
                            confidence = ai_result["confidence"]
                            reason = ai_result["reason"]
                        except Exception:  # noqa: BLE001 — one LLM hiccup must not sink the whole run
                            logger.warning("discovery_run id=%s: AI classification failed for %r", run_id, c["name"], exc_info=True)
                            confidence, reason = "low", "unclassified: AI classifier unavailable"

                    company = Company(
                        place_id=c.get("id"),
                        name=c["name"],
                        address=c.get("address"),
                        lat=c.get("lat"),
                        lng=c.get("lng"),
                        distance_km=c.get("distance_km"),
                        phone=c.get("phone"),
                        website=c.get("website"),
                        primary_type=c.get("primary_type"),
                        business_type=category,
                        business_type_confidence=confidence,
                        business_type_reason=reason,
                        discovery_run_id=run.id,
                    )
                    db.add(company)
                    # Flush so the next result's place_id lookup sees this row
                    # (the session has autoflush off) and the link gets an id.
                    db.flush()
                    _link_to_warehouse(db, company, run, c.get("distance_km"))
                    _record_in_run(db, company, run, c.get("distance_km"), is_new=True)
                    created += 1

                # New gates/plants of a known company join its account.
                apply_site_groups(db)

                run.companies_found = created
                run.api_calls_made = result["stats"]["total_calls"]
                run.status = DiscoveryRunStatus.done
                if failed:
                    run.error = f"{len(failed)} of {stats['total_calls']} search areas failed; results may be incomplete"
                span.set_attribute("result.companies_created", created)
                span.set_attribute("result.companies_already_known", linked)
                span.set_attribute("result.api_calls_made", result["stats"]["total_calls"])
                logger.info(
                    "discovery_run id=%s radius_km=%s created=%d already_known=%d api_calls=%d",
                    run_id, run.radius_km, created, linked, result["stats"]["total_calls"],
                )
            except Exception as e:  # noqa: BLE001 — record failure on the run row, don't crash the worker
                logger.exception("Discovery run %s failed", run_id)
                db.rollback()
                run.status = DiscoveryRunStatus.failed
                run.error = str(e)[:500]
                span.set_attribute("run.error", str(e))
            finally:
                run.completed_at = _utcnow()
                db.commit()
    finally:
        db.close()
