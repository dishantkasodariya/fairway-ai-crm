"""
Group each multi-site company's plants/gates/units under one parent account.
Safe to re-run. Also runs automatically after every discovery run.

Usage:
    python -m scripts.group_company_sites            # apply
    python -m scripts.group_company_sites --dry-run  # print the groups only
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.base import SessionLocal
from app.db.models import Company
from discovery.site_grouping import apply_site_groups, plan_groups

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.dry_run:
            rows = [
                {"id": c.id, "name": c.name, "website": c.website, "parent_company_id": c.parent_company_id}
                for c in db.query(Company).all()
            ]
            for g in plan_groups(rows):
                print(" | ".join(f"{c['id']}:{c['name']}" for c in g))
        else:
            print(apply_site_groups(db))
            db.commit()
    finally:
        db.close()
