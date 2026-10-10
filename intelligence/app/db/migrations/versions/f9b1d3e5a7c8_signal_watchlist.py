"""signal watchlist: which companies are re-checked on a schedule, when they were last
checked, and what triggered each research job

Revision ID: f9b1d3e5a7c8
Revises: e7a9c1d3f5b6
Create Date: 2026-10-10 14:00:00.000000

Backfill: a company already scored >= 40 is watched; its last check is its latest
finished signal job (or its score's computed_at).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f9b1d3e5a7c8'
down_revision: Union[str, Sequence[str], None] = 'e7a9c1d3f5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("watch_signals", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("companies", sa.Column("signals_checked_at", sa.DateTime(), nullable=True))
    op.create_index("ix_companies_watch_signals", "companies", ["watch_signals"], unique=False)
    op.add_column("jobs", sa.Column("trigger", sa.String(), nullable=True))
    op.create_index("ix_signals_company_id", "signals", ["company_id"], unique=False)
    op.create_index("ix_jobs_company_id", "jobs", ["company_id"], unique=False)

    op.execute("UPDATE companies c SET watch_signals = true FROM opportunity_scores o WHERE o.company_id = c.id AND o.score >= 40")
    op.execute(
        """
        UPDATE companies c SET signals_checked_at = x.checked
        FROM (
            SELECT c2.id, COALESCE(
                (SELECT max(j.finished_at) FROM jobs j WHERE j.company_id = c2.id AND j.type = 'signal_research' AND j.status = 'done'),
                (SELECT o.computed_at FROM opportunity_scores o WHERE o.company_id = c2.id)
            ) AS checked
            FROM companies c2
        ) x
        WHERE x.id = c.id AND x.checked IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_jobs_company_id", table_name="jobs")
    op.drop_index("ix_signals_company_id", table_name="signals")
    op.drop_column("jobs", "trigger")
    op.drop_index("ix_companies_watch_signals", table_name="companies")
    op.drop_column("companies", "signals_checked_at")
    op.drop_column("companies", "watch_signals")
