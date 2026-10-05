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


class CompanyListOut(BaseModel):
    total: int
    items: list[CompanyListItemOut]


class BusinessTypeCountOut(BaseModel):
    business_type: str | None
    count: int


class BusinessTypesOut(BaseModel):
    items: list[BusinessTypeCountOut]
