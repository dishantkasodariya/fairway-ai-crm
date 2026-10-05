"""group a company's sites under one parent account

Revision ID: b2d4f6a8c0e1
Revises: a1c3e5f7b9d2
Create Date: 2026-10-05 15:00:00.000000

Schema only; groups are assigned by scripts/group_company_sites.py and after
every discovery run (discovery/site_grouping.py).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b2d4f6a8c0e1'
down_revision: Union[str, Sequence[str], None] = 'a1c3e5f7b9d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("parent_company_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_companies_parent_company_id", "companies", "companies",
        ["parent_company_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index(op.f("ix_companies_parent_company_id"), "companies", ["parent_company_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_companies_parent_company_id"), table_name="companies")
    op.drop_constraint("fk_companies_parent_company_id", "companies", type_="foreignkey")
    op.drop_column("companies", "parent_company_id")
