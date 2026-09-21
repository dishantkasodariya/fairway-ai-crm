from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import DiscoveryRun, DiscoveryRunStatus
from app.deps import get_db, require_api_key
from app.schemas.discovery import DiscoveryRunCreate, DiscoveryRunOut
from jobs.discovery_runner import run_discovery_job

router = APIRouter(
    prefix="/v1/discovery/runs", tags=["discovery"], dependencies=[Depends(require_api_key)]
)


@router.post("", response_model=DiscoveryRunOut, status_code=202)
def create_discovery_run(
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
        status=DiscoveryRunStatus.queued,
    )
    db.add(run)
    db.commit()
    db.refresh(run)

    background_tasks.add_task(run_discovery_job, run.id)
    return run


@router.get("/{run_id}", response_model=DiscoveryRunOut)
def get_discovery_run(run_id: int, db: Session = Depends(get_db)):
    run = db.query(DiscoveryRun).filter(DiscoveryRun.id == run_id).one_or_none()
    if run is None:
        raise HTTPException(status_code=404, detail="Discovery run not found")
    return run
