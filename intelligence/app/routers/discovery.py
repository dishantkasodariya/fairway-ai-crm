from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import CompanyWarehouseLink, DiscoveryRun, DiscoveryRunCompany, DiscoveryRunStatus, RevenueEnrichmentStatus
from app.deps import get_db, require_api_key
from app.rate_limit import limiter
from app.schemas.discovery import DiscoveryRunCreate, DiscoveryRunOut, RunSignalsCreate
from jobs.discovery_runner import run_discovery_job
from jobs.enrich_revenue_runner import run_enrich_revenue_job
from jobs.run_signals_runner import run_signals_for_run_job

router = APIRouter(
    prefix="/v1/discovery/runs", tags=["discovery"], dependencies=[Depends(require_api_key)]
)


def _run_out(db: Session, run: DiscoveryRun) -> DiscoveryRunOut:
    out = DiscoveryRunOut.model_validate(run)
    out.companies_linked = (
        db.query(func.count(CompanyWarehouseLink.id))
        .filter(CompanyWarehouseLink.discovery_run_id == run.id)
        .scalar()
    )
    out.companies_matched = (
        db.query(func.count(DiscoveryRunCompany.id))
        .filter(DiscoveryRunCompany.discovery_run_id == run.id)
        .scalar()
    )
    return out


@router.post("", response_model=DiscoveryRunOut, status_code=202)
@limiter.limit("10/minute")
def create_discovery_run(
    request: Request,
    body: DiscoveryRunCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Kick off a tiled company search around (lat, lng) as a background job.
    Poll GET /v1/discovery/runs/{id} for status, then GET /v1/companies?
    discovery_run_id={id} for results once status is "done"."""
    run = DiscoveryRun(
        warehouse_lat=body.lat,
        warehouse_lng=body.lng,
        radius_km=body.radius_km,
        property_id=body.property_id,
        status=DiscoveryRunStatus.queued,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    background_tasks.add_task(run_discovery_job, run.id)
    return _run_out(db, run)


@router.get("/{run_id}", response_model=DiscoveryRunOut)
def get_discovery_run(run_id: int, db: Session = Depends(get_db)):
    run = db.query(DiscoveryRun).filter(DiscoveryRun.id == run_id).one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Discovery run not found")
    return _run_out(db, run)


@router.post("/{run_id}/enrich-revenue", response_model=DiscoveryRunOut, status_code=202)
@limiter.limit("10/minute")
def enrich_revenue(
    request: Request,
    run_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Kick off revenue research for every company in this run that doesn't
    have a RevenueSnapshot yet. Poll GET /v1/discovery/runs/{id} for
    revenue_enrichment_status/revenue_enriched_count."""
    run = db.query(DiscoveryRun).filter(DiscoveryRun.id == run_id).one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Discovery run not found")
    if run.revenue_enrichment_status == RevenueEnrichmentStatus.running:
        raise HTTPException(status_code=409, detail="Revenue enrichment is already running for this run")

    run.revenue_enrichment_status = RevenueEnrichmentStatus.running
    run.revenue_enriched_count = 0
    db.commit()
    db.refresh(run)

    background_tasks.add_task(run_enrich_revenue_job, run_id)
    return _run_out(db, run)


@router.post("/{run_id}/research-signals", response_model=DiscoveryRunOut, status_code=202)
@limiter.limit("10/minute")
def research_signals(
    request: Request,
    run_id: int,
    background_tasks: BackgroundTasks,
    body: RunSignalsCreate | None = None,
    db: Session = Depends(get_db),
):
    """Research signals (expansion, hiring, tenders, warehouse needs...) and score
    this run's best unscored prospects: biggest revenue first, capped at `limit`.
    Poll GET /v1/discovery/runs/{id} for signals_status/signals_researched_count."""
    run = db.query(DiscoveryRun).filter(DiscoveryRun.id == run_id).one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Discovery run not found")
    if run.signals_status == "running":
        raise HTTPException(status_code=409, detail="Signals research is already running for this run")

    run.signals_status = "running"
    run.signals_researched_count = 0
    db.commit()
    db.refresh(run)

    background_tasks.add_task(run_signals_for_run_job, run_id, (body or RunSignalsCreate()).limit)
    return _run_out(db, run)
