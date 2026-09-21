"""
One-off import of the existing CSV-pipeline outputs into Postgres, so the
work already done (144 companies with revenue, 42 scored opportunities with
signals) isn't lost when the CSV pipeline is retired in favor of the API.

Usage:
    python -m scripts.import_legacy_csv
"""

import csv
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.db.base import SessionLocal
from app.db.models import (
    Company,
    DiscoveryRun,
    DiscoveryRunStatus,
    Job,
    OpportunityScore,
    RevenueMethod,
    RevenueSnapshot,
    Signal,
    SignalType,
)
from agents.reference_data import parse_revenue_cr
from scoring.dates import parse_signal_date_key

REVENUE_FOUND_CSV = "results/surat_50km_depth0_companies_revenue_found.csv"
RADAR_FULL_CSV = "results/surat_50km_depth0_opportunity_radar_full.csv"

WAREHOUSE_LAT = 21.4779173
WAREHOUSE_LNG = 72.7234733
RADIUS_KM = 50.0

MAX_SIGNAL_COLUMNS = 10  # generous upper bound; unpack whatever is present


def revenue_method_enum(raw):
    if raw and raw.startswith("tp_resources_match"):
        return RevenueMethod.reference_table
    return RevenueMethod.agent


def load_revenue_found(path):
    by_name = {}
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            by_name.setdefault(row["name"], []).append(row)
    return by_name


def load_radar_full(path):
    by_name = {}
    with open(path, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            signals = []
            for i in range(1, MAX_SIGNAL_COLUMNS + 1):
                type_key = f"signal_{i}_type"
                if type_key not in row or not row.get(type_key):
                    continue
                signals.append(
                    {
                        "type": row.get(type_key, ""),
                        "summary": row.get(f"signal_{i}_summary", ""),
                        "date": row.get(f"signal_{i}_date", ""),
                        "source_name": row.get(f"signal_{i}_source_name", ""),
                        "source_url": row.get(f"signal_{i}_source_url", ""),
                        "confidence": row.get(f"signal_{i}_confidence", ""),
                    }
                )
            row["_signals"] = signals
            by_name[row["company"]] = row
    return by_name


def main():
    revenue_rows_by_name = load_revenue_found(REVENUE_FOUND_CSV)
    radar_by_name = load_radar_full(RADAR_FULL_CSV)

    db = SessionLocal()
    try:
        run = DiscoveryRun(
            warehouse_lat=WAREHOUSE_LAT,
            warehouse_lng=WAREHOUSE_LNG,
            radius_km=RADIUS_KM,
            status=DiscoveryRunStatus.done,
            companies_found=len(revenue_rows_by_name),
            completed_at=datetime.now(timezone.utc),
        )
        db.add(run)
        db.flush()

        created, skipped = 0, 0
        for name, rows in revenue_rows_by_name.items():
            rep = rows[0]
            addresses = sorted({r["address"] for r in rows if r.get("address")})

            existing = db.query(Company).filter_by(name=name).one_or_none()
            if existing is not None:
                skipped += 1
                continue

            company = Company(
                place_id=rep.get("id") or None,
                name=name,
                address=rep.get("address") or None,
                lat=float(rep["lat"]) if rep.get("lat") else None,
                lng=float(rep["lng"]) if rep.get("lng") else None,
                distance_km=float(rep["distance_km"]) if rep.get("distance_km") else None,
                phone=rep.get("phone") or None,
                website=rep.get("website") or None,
                primary_type=rep.get("primary_type") or None,
                business_type=rep.get("business_type") or None,
                business_type_confidence=rep.get("grok_confidence") or None,
                business_type_reason=rep.get("grok_reason") or None,
                site_count=len(rows),
                locations=addresses if len(rows) > 1 else None,
                discovery_run_id=run.id,
            )
            db.add(company)
            db.flush()

            for r in rows:
                if not r.get("revenue"):
                    continue
                db.add(
                    RevenueSnapshot(
                        company_id=company.id,
                        revenue=r.get("revenue") or None,
                        revenue_cr=parse_revenue_cr(r.get("revenue", "")),
                        fiscal_year=r.get("fiscal_year") or None,
                        source_name=r.get("source_name") or None,
                        source_url=r.get("source_url") or None,
                        method=revenue_method_enum(r.get("revenue_method", "")),
                        confidence=r.get("revenue_confidence") or None,
                    )
                )

            radar = radar_by_name.get(name)
            if radar:
                for s in radar["_signals"]:
                    sig_type = s["type"].strip().lower().replace(" ", "_")
                    if sig_type not in SignalType._value2member_map_:
                        continue
                    db.add(
                        Signal(
                            company_id=company.id,
                            type=SignalType(sig_type),
                            summary=s["summary"] or "",
                            date=s["date"] or None,
                            source_name=s["source_name"] or None,
                            source_url=s["source_url"] or None,
                            confidence=s["confidence"] or None,
                        )
                    )
                db.add(
                    OpportunityScore(
                        company_id=company.id,
                        score=float(radar.get("opportunity_score") or 0),
                        why=radar.get("why") or None,
                        estimated_requirement=radar.get("estimated_requirement") or None,
                        requirement_basis=radar.get("requirement_basis") or None,
                        recommended_action=radar.get("recommended_action") or None,
                        confidence=radar.get("confidence") or None,
                        latest_signal_date=radar.get("latest_signal_date") or None,
                        latest_signal_sort_key=parse_signal_date_key(radar.get("latest_signal_date", "")),
                        latest_signal_freshness=radar.get("latest_signal_freshness") or None,
                    )
                )

            created += 1

        db.commit()
        print(f"Imported discovery_run id={run.id}")
        print(f"Companies created: {created}, skipped (already existed): {skipped}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
