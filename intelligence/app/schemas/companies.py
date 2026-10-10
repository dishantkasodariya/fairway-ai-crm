from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RevenueSnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    revenue: str | None
    revenue_cr: float | None
    fiscal_year: str | None
    source_name: str | None
    source_url: str | None
    method: str
    confidence: str | None
    created_at: datetime


class SignalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    summary: str
    date: str | None
    source_name: str | None
    source_url: str | None
    confidence: str | None
    # When we first found it (date = when the event itself happened, as reported).
    created_at: datetime | None = None


class SignalCheckOut(BaseModel):
    """One signals research run for a company: when, what started it, what it found."""

    job_id: int
    checked_at: datetime | None
    trigger: str | None
    status: str
    new_signals: int | None = None
    already_known: int | None = None
    error: str | None = None


class SignalWatchOut(BaseModel):
    watching: bool
    recheck_days: int
    last_checked_at: datetime | None
    next_check_at: datetime | None
    checks: list[SignalCheckOut] = []


class OpportunityScoreOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    score: float
    why: str | None
    estimated_requirement: str | None
    requirement_basis: str | None
    recommended_action: str | None
    confidence: str | None
    latest_signal_date: str | None
    latest_signal_freshness: str | None
    computed_at: datetime


class CompanyListItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    business_type: str | None
    address: str | None
    lat: float | None = None
    lng: float | None = None
    distance_km: float | None
    site_count: int
    latest_revenue_cr: float | None = None
    opportunity_score: float | None = None
    latest_signal_freshness: str | None = None
    # Nearest CRM warehouse this company is linked to, and how many it's near.
    nearest_property_id: str | None = None
    warehouse_count: int = 0


class WarehouseLinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    property_id: str
    distance_km: float | None
    discovery_run_id: int | None


class SiteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    address: str | None
    distance_km: float | None


class CompanyDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    place_id: str | None
    name: str
    address: str | None
    lat: float | None
    lng: float | None
    distance_km: float | None
    phone: str | None
    website: str | None
    primary_type: str | None
    business_type: str | None
    business_type_confidence: str | None
    business_type_reason: str | None
    site_count: int
    locations: list[str] | None
    created_at: datetime
    updated_at: datetime

    revenue_snapshots: list[RevenueSnapshotOut] = []
    signals: list[SignalOut] = []
    opportunity_score: OpportunityScoreOut | None = None
    warehouse_links: list[WarehouseLinkOut] = []
    # Multi-site accounts: a parent lists its other sites; a site points at its account.
    parent_company_id: int | None = None
    parent: SiteOut | None = None
    sites: list[SiteOut] = []
    signal_watch: SignalWatchOut | None = None


class CompanyListOut(BaseModel):
    total: int
    items: list[CompanyListItemOut]


class BusinessTypeCountOut(BaseModel):
    business_type: str | None
    count: int


class BusinessTypesOut(BaseModel):
    items: list[BusinessTypeCountOut]


class WatchUpdate(BaseModel):
    watch: bool


class RecentSignalOut(SignalOut):
    company_id: int
    company_name: str


class RecentSignalsOut(BaseModel):
    items: list[RecentSignalOut]
