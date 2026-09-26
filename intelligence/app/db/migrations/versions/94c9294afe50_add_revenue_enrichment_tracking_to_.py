"""add revenue enrichment tracking to discovery runs

Revision ID: 94c9294afe50
Revises: 85dc40021423
Create Date: 2026-09-26 21:11:51.366615

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '94c9294afe50'
down_revision: Union[str, Sequence[str], None] = '85dc40021423'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(bind) -> set[str]:
    inspector = sa.inspect(bind)
    return {c["name"] for c in inspector.get_columns("discovery_runs")}


def upgrade() -> None:
    """Upgrade schema.

    A prior (unrecorded) session already added both columns directly against
    this environment's live DB as plain VARCHAR - guard with an existence
    check so this migration is a no-op here but still creates them correctly
    on a fresh database.
    """
    bind = op.get_bind()
    existing = _existing_columns(bind)

    if "revenue_enrichment_status" not in existing:
        op.add_column(
            "discovery_runs",
            sa.Column(
                "revenue_enrichment_status",
                sa.String(),
                nullable=False,
                server_default="not_started",
            ),
        )
    if "revenue_enriched_count" not in existing:
        op.add_column(
            "discovery_runs",
            sa.Column("revenue_enriched_count", sa.Integer(), nullable=False, server_default="0"),
        )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("discovery_runs", "revenue_enriched_count")
    op.drop_column("discovery_runs", "revenue_enrichment_status")
