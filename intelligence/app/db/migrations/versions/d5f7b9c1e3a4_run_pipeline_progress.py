"""discovery run pipeline progress: revenue -> batched signals -> Apollo contacts

Revision ID: d5f7b9c1e3a4
Revises: c3e5a7b9d1f2
Create Date: 2026-10-10 12:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd5f7b9c1e3a4'
down_revision: Union[str, Sequence[str], None] = 'c3e5a7b9d1f2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

COLUMNS = [
    sa.Column("pipeline_status", sa.String(), nullable=False, server_default="not_started"),
    sa.Column("pipeline_stage", sa.String(), nullable=True),
    sa.Column("suitable_count", sa.Integer(), nullable=False, server_default="0"),
    sa.Column("skipped_count", sa.Integer(), nullable=False, server_default="0"),
    sa.Column("signals_total", sa.Integer(), nullable=False, server_default="0"),
    sa.Column("signals_batch_size", sa.Integer(), nullable=True),
    sa.Column("contacts_status", sa.String(), nullable=False, server_default="not_started"),
    sa.Column("contacts_companies_done", sa.Integer(), nullable=False, server_default="0"),
    sa.Column("contacts_found_count", sa.Integer(), nullable=False, server_default="0"),
    sa.Column("pipeline_note", sa.Text(), nullable=True),
]


def upgrade() -> None:
    for col in COLUMNS:
        op.add_column("discovery_runs", col)


def downgrade() -> None:
    for col in reversed(COLUMNS):
        op.drop_column("discovery_runs", col.name)
