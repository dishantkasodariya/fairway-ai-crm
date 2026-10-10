"""count failed revenue/signal lookups per run instead of reporting them as researched

Revision ID: e7a9c1d3f5b6
Revises: d5f7b9c1e3a4
Create Date: 2026-10-10 13:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e7a9c1d3f5b6'
down_revision: Union[str, Sequence[str], None] = 'd5f7b9c1e3a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("discovery_runs", sa.Column("revenue_failed_count", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("discovery_runs", sa.Column("signals_failed_count", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("discovery_runs", "signals_failed_count")
    op.drop_column("discovery_runs", "revenue_failed_count")
