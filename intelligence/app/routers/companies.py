from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased, joinedload

from app.db.models import Company, CompanyWarehouseLink, OpportunityScore, RevenueSnapshot
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
    property_id: str | None = Query(default=None, description="Restrict to companies near one CRM warehouse"),
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

    # Each company's nearest linked warehouse (rn = 1) and how many it's near.
    L = CompanyWarehouseLink
    ranked_links = db.query(
        L.company_id,
        L.property_id,
        func.row_number().over(partition_by=L.company_id, order_by=L.distance_km.asc().nullslast()).label("rn"),
        func.count(L.id).over(partition_by=L.company_id).label("n"),
    ).subquery()
    nearest = (
        db.query(ranked_links.c.company_id, ranked_links.c.property_id, ranked_links.c.n)
        .filter(ranked_links.c.rn == 1)
        .subquery()
    )

    # Distance shown/sorted: to the chosen warehouse when filtering, else the nearest one.
    distance_col = Company.distance_km
    q = (
        db.query(
            Company,
            OpportunityScore.score,
            latest_revenue.c.latest_revenue_cr,
            OpportunityScore,
            nearest.c.property_id,
            nearest.c.n,
        )
        .outerjoin(OpportunityScore, OpportunityScore.company_id == Company.id)
        .outerjoin(latest_revenue, latest_revenue.c.company_id == Company.id)
        .outerjoin(nearest, nearest.c.company_id == Company.id)
    )
    if property_id:
        chosen = aliased(L)
        q = q.join(chosen, (chosen.company_id == Company.id) & (chosen.property_id == property_id))
        distance_col = chosen.distance_km
        q = q.add_columns(chosen.distance_km)
    else:
        q = q.add_columns(Company.distance_km)

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
        q = q.order_by(distance_col.asc().nullslast())

    rows = q.offset(offset).limit(limit).all()

    items = [
        CompanyListItemOut(
            id=company.id,
            name=company.name,
            business_type=company.business_type,
            address=company.address,
            distance_km=distance_km,
            site_count=company.site_count,
            latest_revenue_cr=latest_revenue_cr,
            opportunity_score=opp.score if opp else None,
            latest_signal_freshness=opp.latest_signal_freshness if opp else None,
            nearest_property_id=nearest_property_id,
            warehouse_count=warehouse_count or 0,
        )
        for company, _score, latest_revenue_cr, opp, nearest_property_id, warehouse_count, distance_km in rows
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
            joinedload(Company.warehouse_links),
        )
        .filter(Company.id == company_id)
        .one_or_none()
    )
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company
