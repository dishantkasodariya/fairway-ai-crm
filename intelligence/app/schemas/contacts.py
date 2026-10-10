from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_id: int
    name: str
    title: str | None
    email: str | None
    email_status: str | None
    phone: str | None
    linkedin_url: str | None
    source: str
    confidence: str | None
    created_at: datetime


class ContactCreate(BaseModel):
    """A key person entered by hand (until Apollo People Search is available)."""

    name: str = Field(min_length=1, max_length=200)
    title: str | None = Field(default=None, max_length=200)
    email: str | None = Field(default=None, max_length=320)
    phone: str | None = Field(default=None, max_length=50)
    linkedin_url: str | None = Field(default=None, max_length=500)


class ContactsListOut(BaseModel):
    items: list[ContactOut]


class ContactWithCompanyOut(ContactOut):
    company_name: str
    business_type: str | None


class AllContactsListOut(BaseModel):
    items: list[ContactWithCompanyOut]


class OutreachDraftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    contact_id: int
    channel: str
    subject: str | None
    body: str
    generated_at: datetime


class DraftMessageOut(BaseModel):
    linkedin: OutreachDraftOut
    email: OutreachDraftOut


class CompanyConnectionsOut(BaseModel):
    """One row on the Connections page: a company and how many people we can reach there."""

    company_id: int
    company_name: str
    business_type: str | None
    opportunity_score: float | None
    estimated_requirement: str | None
    contact_count: int
    with_email: int
    with_linkedin: int
    with_phone: int


class CompanyConnectionsListOut(BaseModel):
    total: int
    items: list[CompanyConnectionsOut]
