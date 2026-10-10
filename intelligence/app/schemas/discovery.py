from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from discovery.places_api import MAX_RADIUS_M


class DiscoveryRunCreate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_km: float = Field(gt=0, le=MAX_RADIUS_M / 1000)
    # CRM warehouse this search is for. Found companies get linked to it.
    property_id: str | None = Field(default=None, min_length=1, max_length=64)


class DiscoveryRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    warehouse_lat: float
    warehouse_lng: float
    radius_km: float
    property_id: str | None = None
    status: str
    companies_found: int
    api_calls_made: int
    # Companies this run linked to its warehouse: new ones plus already-known
    # ones found again (companies_found counts only the new ones).
    companies_linked: int = 0
    revenue_enrichment_status: str
    revenue_enriched_count: int
    # Every company this search found, new or already known (works with no warehouse too).
    companies_matched: int = 0
    signals_status: str = "not_started"
    signals_researched_count: int = 0
    error: str | None = None
    pipeline_status: str = "not_started"
    pipeline_stage: str | None = None
    suitable_count: int = 0
    skipped_count: int = 0
    signals_total: int = 0
    signals_batch_size: int | None = None
    contacts_status: str = "not_started"
    contacts_companies_done: int = 0
    contacts_found_count: int = 0
    pipeline_note: str | None = None
    revenue_failed_count: int = 0
    signals_failed_count: int = 0
    created_at: datetime
    completed_at: datetime | None


class RunSignalsCreate(BaseModel):
    # How many of the run's best unscored prospects to research (each costs search + LLM calls).
    limit: int = Field(default=10, ge=1, le=25)


class RunPipelineCreate(BaseModel):
    # Overrides for this run; unset = SIGNALS_BATCH_SIZE / SIGNALS_MAX_PER_RUN / CONTACTS_TOP_N.
    signals_batch_size: int | None = Field(default=None, ge=1, le=500)
    signals_max: int | None = Field(default=None, ge=0, le=5000)
    contacts_top_n: int | None = Field(default=None, ge=0, le=200)
