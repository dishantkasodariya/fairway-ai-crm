from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, aliased, joinedload

from datetime import datetime, timedelta

from app.config import get_settings
from app.db.models import (
    Company,
    CompanyWarehouseLink,
    DiscoveryRunCompany,
    Job,
    JobType,
    OpportunityScore,
    RevenueSnapshot,
    Signal,
)
from app.deps import get_db, require_api_key
from app.schemas.companies import (
    BusinessTypeCountOut,
    BusinessTypesOut,
    CompanyDetailOut,
    CompanyListItemOut,
    CompanyListOut,
    RecentSignalOut,
    RecentSignalsOut,
    SignalCheckOut,
    SignalOut,
    SignalWatchOut,
    WatchUpdate,
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
    near_lat: float | None = Query(default=None, ge=-90, le=90, description="With near_lng + within_km: companies within a radius of a point"),
    near_lng: float | None = Query(default=None, ge=-180, le=180),
    within_km: float | None = Query(default=None, gt=0, le=200),
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
    geo = near_lat is not None and near_lng is not None and within_km is not None
    if geo:
        # Geography, not discovery history: every known company within the radius,
        # however it was found. Distance = the account's nearest site to the point.
        G = aliased(Company)
        g_account = func.coalesce(G.parent_company_id, G.id) if group_sites else G.id
        dlat = func.radians(G.lat - near_lat)
        dlng = func.radians(G.lng - near_lng)
        a = func.power(func.sin(dlat / 2), 2) + func.cos(func.radians(near_lat)) * func.cos(func.radians(G.lat)) * func.power(func.sin(dlng / 2), 2)
        km = 2 * 6371.0088 * func.asin(func.sqrt(a))
        box = within_km / 111.0
        near = (
            db.query(g_account.label("account_id"), func.min(km).label("distance_km"))
            .filter(G.lat.isnot(None), G.lng.isnot(None))
            .filter(G.lat.between(near_lat - box, near_lat + box))
            .filter(G.lng.between(near_lng - box * 1.2, near_lng + box * 1.2))
            .filter(km <= within_km)
            .group_by(g_account)
            .subquery()
        )
        q = q.join(near, near.c.account_id == Company.id)
        if discovery_run_id is None:
            distance_col = near.c.distance_km
    if property_id:
        chosen = aliased(account_links)
        q = q.join(chosen, (chosen.c.account_id == Company.id) & (chosen.c.property_id == property_id))
        if discovery_run_id is None and not geo:
            distance_col = chosen.c.distance_km
    elif discovery_run_id is None and not geo:
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
            lat=company.lat,
            lng=company.lng,
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
    out = CompanyDetailOut.model_validate(company)
    # Newest first by when we found them, so a re-check's finds sit on top.
    out.signals = sorted(out.signals, key=lambda s: s.created_at or datetime.min, reverse=True)
    out.signal_watch = _signal_watch(db, company)
    return out


def _signal_watch(db: Session, company: Company) -> SignalWatchOut:
    recheck_days = get_settings().signals_recheck_days
    jobs = (
        db.query(Job)
        .filter(Job.company_id == company.id, Job.type == JobType.signal_research)
        .order_by(Job.id.desc())
        .limit(20)
        .all()
    )
    last = company.signals_checked_at
    return SignalWatchOut(
        watching=company.watch_signals,
        recheck_days=recheck_days,
        last_checked_at=last,
        next_check_at=(last + timedelta(days=recheck_days)) if (company.watch_signals and last) else None,
        checks=[
            SignalCheckOut(
                job_id=j.id,
                checked_at=j.finished_at or j.started_at or j.created_at,
                trigger=j.trigger,
                status=j.status.value,
                new_signals=(j.result or {}).get("new_signals_found"),
                already_known=(j.result or {}).get("already_known"),
                error=j.error,
            )
            for j in jobs
        ],
    )


@router.put("/{company_id}/watch", response_model=SignalWatchOut)
def set_watch(company_id: int, body: WatchUpdate, db: Session = Depends(get_db)):
    """Add a company to (or remove it from) the scheduled signal re-checks."""
    company = db.query(Company).filter(Company.id == company_id).one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    # A site's signals are researched on its account.
    target = company.parent if company.parent_company_id and company.parent else company
    target.watch_signals = body.watch
    db.commit()
    return _signal_watch(db, target)


signals_router = APIRouter(prefix="/v1/signals", tags=["signals"], dependencies=[Depends(require_api_key)])


@signals_router.get("/recent", response_model=RecentSignalsOut)
def recent_signals(
    db: Session = Depends(get_db),
    since: datetime = Query(description="Signals first found after this time (UTC)"),
    watched_only: bool = Query(default=True),
    limit: int = Query(default=200, le=500),
):
    """New signals found since a time, for CRM notifications ("3 new signals for X")."""
    q = db.query(Signal, Company.name).join(Company, Company.id == Signal.company_id).filter(Signal.created_at > since)
    if watched_only:
        q = q.filter(Company.watch_signals.is_(True))
    rows = q.order_by(Signal.created_at.desc()).limit(limit).all()
    return RecentSignalsOut(items=[
        RecentSignalOut(**SignalOut.model_validate(sig).model_dump(), company_id=sig.company_id, company_name=name)
        for sig, name in rows
    ])
