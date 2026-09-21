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
from app.db.models import Company, DiscoveryRun, DiscoveryRunStatus
from classification.ai_fallback import AIFallbackClassifier
from classification.rules import classify
from discovery.tiling import find_companies_tiled

logger = logging.getLogger(__name__)

# Fixed 3km sub-circles, no auto-subdivision — same approach validated on
# Surat's 50km sweep (see app.py, the Streamlit explorer this replaces).
BASE_SUB_RADIUS_M = 3000


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def run_discovery_job(run_id: int) -> None:
    db = SessionLocal()
    try:
        run = db.query(DiscoveryRun).filter(DiscoveryRun.id == run_id).one()
        run.status = DiscoveryRunStatus.running
        db.commit()

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

            ai_classifier = AIFallbackClassifier(settings)
            created = 0
            for c in result["companies"]:
                existing = None
                if c.get("id"):
                    existing = db.query(Company).filter(Company.place_id == c["id"]).one_or_none()
                if existing is not None:
                    if existing.discovery_run_id is None:
                        existing.discovery_run_id = run.id
                    continue

                category = classify(c["name"])
                confidence, reason = "high", "rule-based keyword match"
                if category == "?":
                    ai_result = ai_classifier.classify(c["name"], c.get("address") or "", c.get("website"))
                    category = ai_result["category"]
                    confidence = ai_result["confidence"]
                    reason = ai_result["reason"]

                db.add(
                    Company(
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
                )
                created += 1

            run.companies_found = created
            run.api_calls_made = result["stats"]["total_calls"]
            run.status = DiscoveryRunStatus.done
        except Exception:  # noqa: BLE001 — record failure on the run row, don't crash the worker
            logger.exception("Discovery run %s failed", run_id)
            run.status = DiscoveryRunStatus.failed
        finally:
            run.completed_at = _utcnow()
            db.commit()
    finally:
        db.close()
