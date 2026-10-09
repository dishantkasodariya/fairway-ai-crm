from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.models import Company, Contact, Job, JobStatus, JobType, OpportunityScore, OutreachDraft
from app.deps import get_db, require_api_key
from app.rate_limit import limiter
from app.schemas.contacts import (
    AllContactsListOut,
    ContactCreate,
    ContactOut,
    ContactsListOut,
    ContactWithCompanyOut,
    DraftMessageOut,
    OutreachDraftOut,
)
from app.schemas.jobs import JobOut
from agents.outreach_agent import OutreachAgent
from jobs.runner import dispatch_job

router = APIRouter(prefix="/v1", tags=["contacts"], dependencies=[Depends(require_api_key)])


@router.post("/companies/{company_id}/contacts:enrich", response_model=JobOut, status_code=202)
@limiter.limit("20/minute")
def enrich_contacts(
    request: Request,
    company_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Kick off Apollo contact enrichment for a company. Requires a paid
    Apollo plan for People Search/Match - on a Free-tier key this job
    completes with status=failed and a clear error, not a silent hang."""
    company = db.query(Company).filter(Company.id == company_id).one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    job = Job(type=JobType.contact_enrichment, company_id=company_id, status=JobStatus.queued)
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(dispatch_job, JobType.contact_enrichment, job.id)
    return job


@router.get("/companies/{company_id}/contacts", response_model=ContactsListOut)
def get_company_contacts(company_id: int, db: Session = Depends(get_db)):
    contacts = db.query(Contact).filter(Contact.company_id == company_id).order_by(Contact.id.asc()).all()
    return ContactsListOut(items=[ContactOut.model_validate(c) for c in contacts])


@router.post("/companies/{company_id}/contacts", response_model=ContactOut, status_code=201)
def create_manual_contact(company_id: int, body: ContactCreate, db: Session = Depends(get_db)):
    """Add a key person by hand. Marked source="manual" so it is never mistaken for Apollo data."""
    company = db.query(Company).filter(Company.id == company_id).one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")

    clean = {k: (v.strip() if isinstance(v, str) else v) or None for k, v in body.model_dump().items()}
    if not clean["name"]:
        raise HTTPException(status_code=422, detail="Name is required")
    if not (clean["email"] or clean["phone"] or clean["linkedin_url"]):
        raise HTTPException(status_code=422, detail="Add at least one way to reach them: email, phone or LinkedIn")

    contact = Contact(company_id=company_id, source="manual", confidence="manual", **clean)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/contacts/{contact_id}", status_code=204)
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id).one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()


@router.get("/contacts", response_model=AllContactsListOut)
def list_all_contacts(db: Session = Depends(get_db)):
    """Every enriched contact across every discovered company, for the AI
    Connections page - not in PLAN.md's endpoint list verbatim, but needed
    since that page's own description ("contacts across companies") has no
    other backing endpoint."""
    rows = (
        db.query(Contact, Company.name, Company.business_type)
        .join(Company, Company.id == Contact.company_id)
        .order_by(Contact.id.desc())
        .all()
    )
    items = [
        ContactWithCompanyOut(
            **ContactOut.model_validate(contact).model_dump(),
            company_name=company_name,
            business_type=business_type,
        )
        for contact, company_name, business_type in rows
    ]
    return AllContactsListOut(items=items)


@router.post("/contacts/{contact_id}/draft-message", response_model=DraftMessageOut)
@limiter.limit("20/minute")
def draft_message(request: Request, contact_id: int, db: Session = Depends(get_db)):
    """One AgentRunner call producing a LinkedIn note + email subject/body
    from the company's opportunity score why/estimated_requirement, stored
    as two OutreachDraft rows (one per channel)."""
    contact = db.query(Contact).filter(Contact.id == contact_id).one_or_none()
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact not found")

    company = db.query(Company).filter(Company.id == contact.company_id).one()
    score = db.query(OpportunityScore).filter(OpportunityScore.company_id == company.id).one_or_none()

    agent = OutreachAgent(settings=get_settings())
    draft = agent.draft(
        contact_name=contact.name,
        contact_title=contact.title,
        company_name=company.name,
        why=score.why if score else None,
        estimated_requirement=score.estimated_requirement if score else None,
    )

    linkedin_row = OutreachDraft(
        contact_id=contact.id,
        channel="linkedin",
        subject=None,
        body=draft["linkedin_note"],
    )
    email_row = OutreachDraft(
        contact_id=contact.id,
        channel="email",
        subject=draft["email_subject"],
        body=draft["email_body"],
    )
    db.add(linkedin_row)
    db.add(email_row)
    db.commit()
    db.refresh(linkedin_row)
    db.refresh(email_row)

    return DraftMessageOut(
        linkedin=OutreachDraftOut.model_validate(linkedin_row),
        email=OutreachDraftOut.model_validate(email_row),
    )
