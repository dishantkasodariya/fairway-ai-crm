from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.models import Company, Job, JobStatus, JobType
from app.deps import get_db, require_api_key
from app.rate_limit import limiter
from app.schemas.jobs import JobOut
from jobs.runner import dispatch_job

router = APIRouter(prefix="/v1", tags=["jobs"], dependencies=[Depends(require_api_key)])


class ResearchJobRequest(BaseModel):
    callback_url: str | None = None


def _create_and_enqueue(
    db: Session,
    background_tasks: BackgroundTasks,
    company_id: int,
    job_type: JobType,
    callback_url: str | None,
) -> Job:
    company = db.query(Company).filter(Company.id == company_id).one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    job = Job(type=job_type, company_id=company_id, status=JobStatus.queued, callback_url=callback_url)
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(dispatch_job, job_type, job.id)
    return job


@router.post("/companies/{company_id}/revenue:research", response_model=JobOut, status_code=202)
@limiter.limit("20/minute")
def research_revenue(
    request: Request,
    company_id: int,
    background_tasks: BackgroundTasks,
    body: ResearchJobRequest = ResearchJobRequest(),
    db: Session = Depends(get_db),
):
    job = _create_and_enqueue(db, background_tasks, company_id, JobType.revenue_research, body.callback_url)
    return job


@router.post("/companies/{company_id}/signals:research", response_model=JobOut, status_code=202)
@limiter.limit("20/minute")
def research_signals(
    request: Request,
    company_id: int,
    background_tasks: BackgroundTasks,
    body: ResearchJobRequest = ResearchJobRequest(),
    db: Session = Depends(get_db),
):
    job = _create_and_enqueue(db, background_tasks, company_id, JobType.signal_research, body.callback_url)
    return job


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(Job).filter(Job.id == job_id).one_or_none()
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
