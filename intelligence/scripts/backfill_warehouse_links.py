"""
Attach existing discovery runs and their companies to a CRM warehouse.

Runs centred on the warehouse (within --match-km) get property_id set, and
every company from those runs gets a company_warehouse_links row with its
distance to the warehouse. Safe to re-run: links are upserted.

Usage:
    python -m scripts.backfill_warehouse_links --property-id prop_03c74628 \
        --lat 21.4779173 --lng 72.7234733
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy.dialects.postgresql import insert

from app.db.base import SessionLocal
from app.db.models import Company, CompanyWarehouseLink, DiscoveryRun
from discovery.geo_utils import haversine_km


def backfill(property_id: str, lat: float, lng: float, match_km: float) -> dict:
    db = SessionLocal()
    try:
        runs = [
            r for r in db.query(DiscoveryRun).all()
            if haversine_km(lat, lng, r.warehouse_lat, r.warehouse_lng) <= match_km
        ]
        run_ids = [r.id for r in runs]
        for r in runs:
            r.property_id = property_id

        companies = db.query(Company).filter(Company.discovery_run_id.in_(run_ids)).all() if run_ids else []
        for c in companies:
            distance = (
                haversine_km(lat, lng, c.lat, c.lng)
                if c.lat is not None and c.lng is not None
                else c.distance_km
            )
            stmt = insert(CompanyWarehouseLink).values(
                company_id=c.id,
                property_id=property_id,
                discovery_run_id=c.discovery_run_id,
                distance_km=distance,
            )
            db.execute(
                stmt.on_conflict_do_update(
                    constraint="uq_company_warehouse",
                    set_={"distance_km": stmt.excluded.distance_km},
                )
            )
        db.commit()
        return {"runs": sorted(run_ids), "companies_linked": len(companies)}
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--property-id", required=True)
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lng", type=float, required=True)
    parser.add_argument("--match-km", type=float, default=0.5,
                        help="runs centred within this distance belong to the warehouse")
    args = parser.parse_args()
    print(backfill(args.property_id, args.lat, args.lng, args.match_km))
