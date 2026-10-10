"""record every company a discovery run found, plus run-level signals research

Revision ID: c3e5a7b9d1f2
Revises: b2d4f6a8c0e1
Create Date: 2026-10-10 10:00:00.000000

companies.discovery_run_id only names the run that first found a company, so a
search over an already-explored area (or around a point with no warehouse) used
to list nothing. discovery_run_companies holds every company each run found,
with its distance from that run's centre. Backfilled from the first-found run
and from warehouse links.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c3e5a7b9d1f2'
down_revision: Union[str, Sequence[str], None] = 'b2d4f6a8c0e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "discovery_run_companies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("discovery_run_id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("distance_km", sa.Float(), nullable=True),
        sa.Column("is_new", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["discovery_run_id"], ["discovery_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("discovery_run_id", "company_id", name="uq_run_company"),
    )
    op.create_index(op.f("ix_discovery_run_companies_discovery_run_id"), "discovery_run_companies", ["discovery_run_id"], unique=False)
    op.create_index(op.f("ix_discovery_run_companies_company_id"), "discovery_run_companies", ["company_id"], unique=False)

    op.add_column("discovery_runs", sa.Column("signals_status", sa.String(), nullable=False, server_default="not_started"))
    op.add_column("discovery_runs", sa.Column("signals_researched_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("discovery_runs", sa.Column("error", sa.Text(), nullable=True))

    op.execute(
        """
        INSERT INTO discovery_run_companies (discovery_run_id, company_id, distance_km, is_new)
        SELECT discovery_run_id, id, distance_km, true FROM companies WHERE discovery_run_id IS NOT NULL
        ON CONFLICT DO NOTHING
        """
    )
    op.execute(
        """
        INSERT INTO discovery_run_companies (discovery_run_id, company_id, distance_km, is_new)
        SELECT discovery_run_id, company_id, distance_km, false FROM company_warehouse_links
        WHERE discovery_run_id IS NOT NULL
        ON CONFLICT DO NOTHING
        """
    )


def downgrade() -> None:
    op.drop_column("discovery_runs", "error")
    op.drop_column("discovery_runs", "signals_researched_count")
    op.drop_column("discovery_runs", "signals_status")
    op.drop_index(op.f("ix_discovery_run_companies_company_id"), table_name="discovery_run_companies")
    op.drop_index(op.f("ix_discovery_run_companies_discovery_run_id"), table_name="discovery_run_companies")
    op.drop_table("discovery_run_companies")
