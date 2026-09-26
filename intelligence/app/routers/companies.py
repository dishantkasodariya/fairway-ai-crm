from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.models import Company, OpportunityScore, RevenueSnapshot
from app.deps import get_db, require_api_key
from app.schemas.companies import (
    BusinessTypeCountOut,
    BusinessTypesOut,
    CompanyDetailOut,
    CompanyListItemOut,
    CompanyListOut,
)

router = APIRouter(prefix="/v1/companies", tags=["companies"], dependencies=[Depends(require_api_key)])


@router.get("", response_model=CompanyListOut)
def list_companies(
    db: Session = Depends(get_db),
    search: str | None = Query(default=None, description="Case-insensitive substring match on company name"),
    business_type: str | None = Query(default=None),
    discovery_run_id: int | None = Query(default=None, description="Restrict to companies found by one discovery run"),
    min_score: float | None = Query(default=None),
    max_revenue_cr: float | None = Query(default=None),
    min_revenue_cr: float | None = Query(default=None),
    sort_by: str = Query(default="score", pattern="^(score|recency|revenue|distance)$"),
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0, ge=0),
):
    latest_revenue = (
        db.query(
            RevenueSnapshot.company_id,
            func.max(RevenueSnapshot.revenue_cr).label("latest_revenue_cr"),
        )
        .group_by(RevenueSnapshot.company_id)
        .subquery()
    )

    q = (
        db.query(Company, OpportunityScore.score, latest_revenue.c.latest_revenue_cr, OpportunityScore)
        .outerjoin(OpportunityScore, OpportunityScore.company_id == Company.id)
        .outerjoin(latest_revenue, latest_revenue.c.company_id == Company.id)
    )

    if search:
        q = q.filter(Company.name.ilike(f"%{search}%"))
    if business_type:
        q = q.filter(Company.business_type == business_type)
    if discovery_run_id is not None:
        q = q.filter(Company.discovery_run_id == discovery_run_id)
    if min_score is not None:
        q = q.filter(OpportunityScore.score >= min_score)
    if min_revenue_cr is not None:
        q = q.filter(latest_revenue.c.latest_revenue_cr >= min_revenue_cr)
    if max_revenue_cr is not None:
        q = q.filter(latest_revenue.c.latest_revenue_cr <= max_revenue_cr)

    total = q.count()

    if sort_by == "score":
        q = q.order_by(OpportunityScore.score.desc().nullslast())
    elif sort_by == "recency":
        q = q.order_by(OpportunityScore.latest_signal_sort_key.desc().nullslast())
    elif sort_by == "revenue":
        q = q.order_by(latest_revenue.c.latest_revenue_cr.desc().nullslast())
    elif sort_by == "distance":
        q = q.order_by(Company.distance_km.asc().nullslast())

    rows = q.offset(offset).limit(limit).all()

    items = [
        CompanyListItemOut(
            id=company.id,
            name=company.name,
            business_type=company.business_type,
            address=company.address,
            distance_km=company.distance_km,
            site_count=company.site_count,
            latest_revenue_cr=latest_revenue_cr,
            opportunity_score=opp.score if opp else None,
            latest_signal_freshness=opp.latest_signal_freshness if opp else None,
        )
        for company, _score, latest_revenue_cr, opp in rows
    ]
    return CompanyListOut(total=total, items=items)


@router.get("/business-types", response_model=BusinessTypesOut)
def get_business_types(db: Session = Depends(get_db)):
    """Registered above /{company_id} - FastAPI matches routes in registration
    order, so this must come first or it'd be swallowed by the path param route."""
    rows = (
        db.query(Company.business_type, func.count(Company.id))
        .group_by(Company.business_type)
        .order_by(func.count(Company.id).desc())
        .all()
    )
    return BusinessTypesOut(
        items=[BusinessTypeCountOut(business_type=bt, count=cnt) for bt, cnt in rows]
    )


@router.get("/{company_id}", response_model=CompanyDetailOut)
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = (
        db.query(Company)
        .options(
            joinedload(Company.revenue_snapshots),
            joinedload(Company.signals),
            joinedload(Company.opportunity_score),
        )
        .filter(Company.id == company_id)
        .one_or_none()
    )
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company
