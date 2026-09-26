import enum
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum, Float, ForeignKey, Integer, String, Text
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
    locations: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)

    discovery_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("discovery_runs.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=_utcnow, onupdate=_utcnow)

    discovery_run: Mapped[DiscoveryRun | None] = relationship(back_populates="companies")
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
