from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased, joinedload

from app.db.models import Company, CompanyWarehouseLink, DiscoveryRunCompany, OpportunityScore, RevenueSnapshot
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
    search: str | None = Query(default=None, description="Case-insensitive substring match on company (or any of its sites') name"),
    business_type: str | None = Query(default=None),
    discovery_run_id: int | None = Query(default=None, description="Restrict to companies found by one discovery run"),
    property_id: str | None = Query(default=None, description="Restrict to companies near one CRM warehouse"),
    group_sites: bool = Query(default=True, description="One row per account (a company's gates/plants folded into it)"),
    min_score: float | None = Query(default=None),
    max_revenue_cr: float | None = Query(default=None),
    min_revenue_cr: float | None = Query(default=None),
    sort_by: str = Query(default="score", pattern="^(score|recency|revenue|distance)$"),
    limit: int = Query(default=50, le=500),
    offset: int = Query(default=0, ge=0),
):
    # Every figure is per account: a company plus its sites. Score/revenue are the
    # best across its sites, distance is its nearest site — so a hot or close gate
    # isn't hidden behind an unscored parent row.
    account_of = func.coalesce(Company.parent_company_id, Company.id) if group_sites else Company.id
    member = aliased(Company)
    member_account = func.coalesce(member.parent_company_id, member.id) if group_sites else member.id

    latest_revenue = (
        db.query(
            member_account.label("account_id"),
            func.max(RevenueSnapshot.revenue_cr).label("latest_revenue_cr"),
        )
        .join(RevenueSnapshot, RevenueSnapshot.company_id == member.id)
        .group_by(member_account)
        .subquery()
    )

    ranked_scores = (
        db.query(
            member_account.label("account_id"),
            OpportunityScore.id.label("opp_id"),
            func.row_number()
            .over(partition_by=member_account, order_by=OpportunityScore.score.desc().nullslast())
            .label("rn"),
        )
        .join(OpportunityScore, OpportunityScore.company_id == member.id)
        .subquery()
    )
    best_score = db.query(ranked_scores.c.account_id, ranked_scores.c.opp_id).filter(ranked_scores.c.rn == 1).subquery()
    BestOpp = aliased(OpportunityScore)

    # Warehouse links per account: nearest distance to each warehouse.
    L = CompanyWarehouseLink
    account_links = (
        db.query(
            member_account.label("account_id"),
            L.property_id.label("property_id"),
            func.min(L.distance_km).label("distance_km"),
        )
        .join(L, L.company_id == member.id)
        .group_by(member_account, L.property_id)
        .subquery()
    )
    ranked_links = db.query(
        account_links.c.account_id,
        account_links.c.property_id,
        account_links.c.distance_km,
        func.row_number()
        .over(partition_by=account_links.c.account_id, order_by=account_links.c.distance_km.asc().nullslast())
        .label("rn"),
        func.count().over(partition_by=account_links.c.account_id).label("n"),
    ).subquery()
    nearest = (
        db.query(ranked_links.c.account_id, ranked_links.c.property_id, ranked_links.c.distance_km, ranked_links.c.n)
        .filter(ranked_links.c.rn == 1)
        .subquery()
    )

    q = (
        db.query(Company, BestOpp, latest_revenue.c.latest_revenue_cr, nearest.c.property_id, nearest.c.n)
        .outerjoin(best_score, best_score.c.account_id == Company.id)
        .outerjoin(BestOpp, BestOpp.id == best_score.c.opp_id)
        .outerjoin(latest_revenue, latest_revenue.c.account_id == Company.id)
        .outerjoin(nearest, nearest.c.account_id == Company.id)
    )
    if group_sites:
        q = q.filter(Company.parent_company_id.is_(None))

    # Distance shown/sorted: from the search point when listing a run's results,
    # to the chosen warehouse when filtering by one, else to the nearest warehouse.
    if discovery_run_id is not None:
        R = aliased(DiscoveryRunCompany)
        run_members = (
            db.query(member_account.label("account_id"), func.min(R.distance_km).label("distance_km"))
            .join(R, R.company_id == member.id)
            .filter(R.discovery_run_id == discovery_run_id)
            .group_by(member_account)
            .subquery()
        )
        q = q.join(run_members, run_members.c.account_id == Company.id)
        distance_col = run_members.c.distance_km
    if property_id:
        chosen = aliased(account_links)
        q = q.join(chosen, (chosen.c.account_id == Company.id) & (chosen.c.property_id == property_id))
        if discovery_run_id is None:
            distance_col = chosen.c.distance_km
    elif discovery_run_id is None:
        distance_col = func.coalesce(nearest.c.distance_km, Company.distance_km)
    q = q.add_columns(distance_col.label("shown_distance_km"))

    if search:
        matching = db.query(member_account).filter(member.name.ilike(f"%{search}%"))
        q = q.filter(Company.id.in_(matching))
    if business_type:
        q = q.filter(Company.business_type == business_type)
    if min_score is not None:
        q = q.filter(BestOpp.score >= min_score)
    if min_revenue_cr is not None:
        q = q.filter(latest_revenue.c.latest_revenue_cr >= min_revenue_cr)
    if max_revenue_cr is not None:
        q = q.filter(latest_revenue.c.latest_revenue_cr <= max_revenue_cr)

    total = q.count()

    if sort_by == "score":
        q = q.order_by(BestOpp.score.desc().nullslast(), Company.id)
    elif sort_by == "recency":
        q = q.order_by(BestOpp.latest_signal_sort_key.desc().nullslast(), Company.id)
    elif sort_by == "revenue":
        q = q.order_by(latest_revenue.c.latest_revenue_cr.desc().nullslast(), Company.id)
    elif sort_by == "distance":
        q = q.order_by(distance_col.asc().nullslast(), Company.id)

    rows = q.offset(offset).limit(limit).all()

    items = [
        CompanyListItemOut(
            id=company.id,
            name=company.name,
            business_type=company.business_type,
            address=company.address,
            distance_km=distance_km,
            site_count=company.site_count if group_sites else 1,
            latest_revenue_cr=latest_revenue_cr,
            opportunity_score=opp.score if opp else None,
            latest_signal_freshness=opp.latest_signal_freshness if opp else None,
            nearest_property_id=nearest_property_id,
            warehouse_count=warehouse_count or 0,
        )
        for company, opp, latest_revenue_cr, nearest_property_id, warehouse_count, distance_km in rows
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
            joinedload(Company.sites),
            joinedload(Company.parent),
        )
        .filter(Company.id == company_id)
        .one_or_none()
    )
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company
