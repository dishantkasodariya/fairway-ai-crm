"""
Re-apply the cited (confirmed) warehouse/space facts from the Opportunity Radar
research to opportunity_scores, where a later re-score replaced them with a
revenue-based estimate. Safe to re-run; never touches a row that is already
confirmed or a company that isn't found by exact name.

Usage:
    python -m scripts.import_confirmed_requirements            # apply
    python -m scripts.import_confirmed_requirements --dry-run
"""

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.base import SessionLocal
from app.db.models import Company
from scoring.fusion import CONFIRMED_BASIS

DATA = Path(__file__).resolve().parent.parent / "data" / "opportunity_radar_confirmed_requirements.json"

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    rows = json.loads(DATA.read_text())["companies"]
    db = SessionLocal()
    try:
        summary = {"restored": [], "already_confirmed": 0, "not_found": [], "no_score_row": []}
        for r in rows:
            company = db.query(Company).filter(Company.name == r["company"]).one_or_none()
            if company is None:
                summary["not_found"].append(r["company"])
                continue
            score = company.opportunity_score
            if score is None:
                summary["no_score_row"].append(r["company"])
                continue
            if score.requirement_basis == CONFIRMED_BASIS:
                summary["already_confirmed"] += 1
                continue
            summary["restored"].append(f'{company.id}: {score.estimated_requirement!r} -> {r["estimated_requirement"]!r}')
            score.estimated_requirement = r["estimated_requirement"]
            score.requirement_basis = CONFIRMED_BASIS
        if args.dry_run:
            db.rollback()
        else:
            db.commit()
        print(json.dumps(summary, indent=2, ensure_ascii=False))
    finally:
        db.close()
