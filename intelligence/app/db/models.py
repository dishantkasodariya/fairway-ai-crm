import enum
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class DiscoveryRunStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    done = "done"
    failed = "failed"


class RevenueEnrichmentStatus(str, enum.Enum):
    not_started = "not_started"
    running = "running"
    done = "done"


class RevenueMethod(str, enum.Enum):
    reference_table = "reference_table"
    agent = "agent"


class SignalType(str, enum.Enum):
    expansion = "expansion"
    funding = "funding"
    tender = "tender"
    hiring = "hiring"
    regulatory = "regulatory"
    import_export = "import_export"
    distribution = "distribution"
    filings = "filings"
    lease_expiry = "lease_expiry"
    distress = "distress"


class JobType(str, enum.Enum):
    revenue_research = "revenue_research"
    signal_research = "signal_research"
    contact_enrichment = "contact_enrichment"


class OutreachChannel(str, enum.Enum):
    linkedin = "linkedin"
    email = "email"


class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    done = "done"
    failed = "failed"


class DiscoveryRun(Base):
    __tablename__ = "discovery_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    warehouse_lat: Mapped[float] = mapped_column(Float)
    warehouse_lng: Mapped[float] = mapped_column(Float)
    radius_km: Mapped[float] = mapped_column(Float)
    # CRM warehouse (properties.id, e.g. "prop_03c74628") this run searched around.
    # Lives in another database, so there's no FK — null for ad-hoc point searches.
    property_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)
    status: Mapped[DiscoveryRunStatus] = mapped_column(
        Enum(DiscoveryRunStatus, name="discovery_run_status"), default=DiscoveryRunStatus.queued
    )
    companies_found: Mapped[int] = mapped_column(Integer, default=0)
    api_calls_made: Mapped[int] = mapped_column(Integer, default=0)
    revenue_enrichment_status: Mapped[RevenueEnrichmentStatus] = mapped_column(
        Enum(
            RevenueEnrichmentStatus,
            name="revenue_enrichment_status",
            native_enum=False,
            create_constraint=False,
        ),
        default=RevenueEnrichmentStatus.not_started,
    )
    revenue_enriched_count: Mapped[int] = mapped_column(Integer, default=0)
    # Run-level signals research: not_started | running | done (same lifecycle as revenue).
    signals_status: Mapped[str] = mapped_column(String, default="not_started", server_default="not_started")
    signals_researched_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    # Why the run failed, shown to the user instead of a bare "failed".
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    # One-click pipeline (jobs/run_pipeline.py): revenue -> batched signals -> Apollo contacts.
    pipeline_status: Mapped[str] = mapped_column(String, default="not_started", server_default="not_started")
    pipeline_stage: Mapped[str | None] = mapped_column(String, nullable=True)  # revenue | signals | contacts
    suitable_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    skipped_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    signals_total: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    signals_batch_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    contacts_status: Mapped[str] = mapped_column(String, default="not_started", server_default="not_started")
    contacts_companies_done: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    contacts_found_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    pipeline_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Lookups that still failed after the retry pass (rate limits, provider errors).
    revenue_failed_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    signals_failed_count: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(default=_utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(nullable=True)

    companies: Mapped[list["Company"]] = relationship(back_populates="discovery_run")


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    place_id: Mapped[str | None] = mapped_column(String, unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String, index=True)
    address: Mapped[str | None] = mapped_column(String, nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    website: Mapped[str | None] = mapped_column(String, nullable=True)
    primary_type: Mapped[str | None] = mapped_column(String, nullable=True)

    business_type: Mapped[str | None] = mapped_column(String, nullable=True)
    business_type_confidence: Mapped[str | None] = mapped_column(String, nullable=True)
    business_type_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    site_count: Mapped[int] = mapped_column(Integer, default=1)
    # Set on a site of a multi-site company ("... Gate 5A") to the account's main row;
    # null for standalone companies and for the parent itself. See discovery/site_grouping.py.
    parent_company_id: Mapped[int | None] = mapped_column(
        ForeignKey("companies.id", ondelete="SET NULL"), nullable=True, index=True
    )
    locations: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)

    discovery_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("discovery_runs.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=_utcnow, onupdate=_utcnow)

    discovery_run: Mapped[DiscoveryRun | None] = relationship(back_populates="companies")
    # The other sites of this account (only populated on a parent).
    sites: Mapped[list["Company"]] = relationship(
        back_populates="parent", foreign_keys=[parent_company_id], order_by="Company.distance_km"
    )
    parent: Mapped["Company | None"] = relationship(back_populates="sites", remote_side="Company.id")
    revenue_snapshots: Mapped[list["RevenueSnapshot"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    signals: Mapped[list["Signal"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )
    opportunity_score: Mapped["OpportunityScore | None"] = relationship(
        back_populates="company", uselist=False, cascade="all, delete-orphan"
    )
    jobs: Mapped[list["Job"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    contacts: Mapped[list["Contact"]] = relationship(back_populates="company", cascade="all, delete-orphan")
    warehouse_links: Mapped[list["CompanyWarehouseLink"]] = relationship(
        back_populates="company",
        cascade="all, delete-orphan",
        order_by="CompanyWarehouseLink.distance_km",
    )


class CompanyWarehouseLink(Base):
    """A company found near a CRM warehouse. One company row can be near several
    warehouses (one link each) instead of being discovered twice."""

    __tablename__ = "company_warehouse_links"
    __table_args__ = (UniqueConstraint("company_id", "property_id", name="uq_company_warehouse"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    property_id: Mapped[str] = mapped_column(String, index=True)
    discovery_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("discovery_runs.id", ondelete="SET NULL"), nullable=True
    )
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    company: Mapped[Company] = relationship(back_populates="warehouse_links")


class DiscoveryRunCompany(Base):
    """Every company a run found, new or already known, with its distance from
    that run's centre. companies.discovery_run_id only names the first run."""

    __tablename__ = "discovery_run_companies"
    __table_args__ = (UniqueConstraint("discovery_run_id", "company_id", name="uq_run_company"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    discovery_run_id: Mapped[int] = mapped_column(ForeignKey("discovery_runs.id", ondelete="CASCADE"), index=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id", ondelete="CASCADE"), index=True)
    distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_new: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class RevenueSnapshot(Base):
    __tablename__ = "revenue_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))

    revenue: Mapped[str | None] = mapped_column(String, nullable=True)
    revenue_cr: Mapped[float | None] = mapped_column(Float, nullable=True)
    fiscal_year: Mapped[str | None] = mapped_column(String, nullable=True)
    source_name: Mapped[str | None] = mapped_column(String, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    method: Mapped[RevenueMethod] = mapped_column(Enum(RevenueMethod, name="revenue_method"))
    confidence: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=_utcnow)

    company: Mapped[Company] = relationship(back_populates="revenue_snapshots")


class Signal(Base):
    __tablename__ = "signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))

    type: Mapped[SignalType] = mapped_column(Enum(SignalType, name="signal_type"))
    summary: Mapped[str] = mapped_column(Text)
    date: Mapped[str | None] = mapped_column(String, nullable=True)
    source_name: Mapped[str | None] = mapped_column(String, nullable=True)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)
    confidence: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=_utcnow)

    company: Mapped[Company] = relationship(back_populates="signals")


class OpportunityScore(Base):
    __tablename__ = "opportunity_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), unique=True)

    score: Mapped[float] = mapped_column(Float, default=0.0)
    why: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_requirement: Mapped[str | None] = mapped_column(String, nullable=True)
    requirement_basis: Mapped[str | None] = mapped_column(String, nullable=True)
    recommended_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[str | None] = mapped_column(String, nullable=True)
    latest_signal_date: Mapped[str | None] = mapped_column(String, nullable=True)
    latest_signal_sort_key: Mapped[int | None] = mapped_column(Integer, nullable=True, index=True)
    latest_signal_freshness: Mapped[str | None] = mapped_column(String, nullable=True)

    computed_at: Mapped[datetime] = mapped_column(default=_utcnow, onupdate=_utcnow)

    company: Mapped[Company] = relationship(back_populates="opportunity_score")


class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[JobType] = mapped_column(Enum(JobType, name="job_type"))
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus, name="job_status"), default=JobStatus.queued)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    callback_url: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(default=_utcnow)
    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)

    company: Mapped[Company] = relationship(back_populates="jobs")


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"), index=True)

    name: Mapped[str] = mapped_column(String)
    title: Mapped[str | None] = mapped_column(String, nullable=True)
    email: Mapped[str | None] = mapped_column(String, nullable=True)
    email_status: Mapped[str | None] = mapped_column(String, nullable=True)
    phone: Mapped[str | None] = mapped_column(String, nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[str] = mapped_column(String, default="apollo")
    confidence: Mapped[str | None] = mapped_column(String, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    company: Mapped[Company] = relationship(back_populates="contacts")
    outreach_drafts: Mapped[list["OutreachDraft"]] = relationship(
        back_populates="contact", cascade="all, delete-orphan"
    )


class OutreachDraft(Base):
    __tablename__ = "outreach_drafts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    contact_id: Mapped[int] = mapped_column(ForeignKey("contacts.id"), index=True)

    channel: Mapped[OutreachChannel] = mapped_column(Enum(OutreachChannel, name="outreach_channel"))
    subject: Mapped[str | None] = mapped_column(String, nullable=True)
    body: Mapped[str] = mapped_column(Text)

    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    contact: Mapped[Contact] = relationship(back_populates="outreach_drafts")
