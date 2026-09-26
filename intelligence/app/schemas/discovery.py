from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from discovery.places_api import MAX_RADIUS_M


class DiscoveryRunCreate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_km: float = Field(gt=0, le=MAX_RADIUS_M / 1000)


class DiscoveryRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    warehouse_lat: float
    warehouse_lng: float
    radius_km: float
    status: str
    companies_found: int
    api_calls_made: int
    revenue_enrichment_status: str
    revenue_enriched_count: int
    created_at: datetime
    completed_at: datetime | None
