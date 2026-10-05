"""link discovery runs and companies to CRM warehouses

Revision ID: a1c3e5f7b9d2
Revises: 8c31b6448be6
Create Date: 2026-10-05 12:00:00.000000

Schema only. Which run belongs to which CRM warehouse is environment data
(CRM property ids), so it's backfilled by scripts/backfill_warehouse_links.py.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a1c3e5f7b9d2'
down_revision: Union[str, Sequence[str], None] = '8c31b6448be6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("discovery_runs", sa.Column("property_id", sa.String(), nullable=True))
    op.create_index(op.f("ix_discovery_runs_property_id"), "discovery_runs", ["property_id"], unique=False)

    op.create_table(
        "company_warehouse_links",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("company_id", sa.Integer(), nullable=False),
        sa.Column("property_id", sa.String(), nullable=False),
        sa.Column("discovery_run_id", sa.Integer(), nullable=True),
        sa.Column("distance_km", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["discovery_run_id"], ["discovery_runs.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("company_id", "property_id", name="uq_company_warehouse"),
    )
    op.create_index(op.f("ix_company_warehouse_links_company_id"), "company_warehouse_links", ["company_id"], unique=False)
    op.create_index(op.f("ix_company_warehouse_links_property_id"), "company_warehouse_links", ["property_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_company_warehouse_links_property_id"), table_name="company_warehouse_links")
    op.drop_index(op.f("ix_company_warehouse_links_company_id"), table_name="company_warehouse_links")
    op.drop_table("company_warehouse_links")
    op.drop_index(op.f("ix_discovery_runs_property_id"), table_name="discovery_runs")
    op.drop_column("discovery_runs", "property_id")
