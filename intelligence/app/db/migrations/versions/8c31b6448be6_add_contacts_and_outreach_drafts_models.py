"""add contacts and outreach drafts models

Revision ID: 8c31b6448be6
Revises: 94c9294afe50
Create Date: 2026-09-26 22:18:21.767752

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8c31b6448be6'
down_revision: Union[str, Sequence[str], None] = '94c9294afe50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# create_type=False: the type is created explicitly (checkfirst) before the table,
# so create_table must not try to create it again ("type already exists" on a fresh DB).
outreach_channel_enum = postgresql.ENUM("linkedin", "email", name="outreach_channel", create_type=False)


def _existing_tables(bind) -> set[str]:
    return set(sa.inspect(bind).get_table_names())


def upgrade() -> None:
    """Upgrade schema.

    Same drifted-environment situation as 94c9294afe50: a prior (unrecorded)
    session already created contacts/outreach_drafts directly against this
    DB, and job_type already has 'contact_enrichment'. Guard everything with
    existence checks so this is a no-op here but still provisions a fresh
    database correctly.
    """
    bind = op.get_bind()

    op.execute("ALTER TYPE job_type ADD VALUE IF NOT EXISTS 'contact_enrichment'")

    tables = _existing_tables(bind)

    if "contacts" not in tables:
        op.create_table(
            "contacts",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("company_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("title", sa.String(), nullable=True),
            sa.Column("email", sa.String(), nullable=True),
            sa.Column("email_status", sa.String(), nullable=True),
            sa.Column("phone", sa.String(), nullable=True),
            sa.Column("linkedin_url", sa.String(), nullable=True),
            sa.Column("source", sa.String(), nullable=False, server_default="apollo"),
            sa.Column("confidence", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["company_id"], ["companies.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_contacts_company_id"), "contacts", ["company_id"], unique=False)

    if "outreach_drafts" not in tables:
        outreach_channel_enum.create(bind, checkfirst=True)
        op.create_table(
            "outreach_drafts",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("contact_id", sa.Integer(), nullable=False),
            sa.Column("channel", outreach_channel_enum, nullable=False),
            sa.Column("subject", sa.String(), nullable=True),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False),
            sa.ForeignKeyConstraint(["contact_id"], ["contacts.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_outreach_drafts_contact_id"), "outreach_drafts", ["contact_id"], unique=False)


def downgrade() -> None:
    """Downgrade schema.

    Does not remove 'contact_enrichment' from job_type - Postgres can't drop
    a single enum value, only the whole type, which would also break
    revenue_research/signal_research jobs.
    """
    bind = op.get_bind()
    tables = _existing_tables(bind)

    if "outreach_drafts" in tables:
        op.drop_index(op.f("ix_outreach_drafts_contact_id"), table_name="outreach_drafts")
        op.drop_table("outreach_drafts")
        outreach_channel_enum.drop(bind, checkfirst=True)

    if "contacts" in tables:
        op.drop_index(op.f("ix_contacts_company_id"), table_name="contacts")
        op.drop_table("contacts")
