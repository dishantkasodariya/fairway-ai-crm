"""
Merge per-batch agent-researched signal JSON files (produced by fanning out
WebSearch-based research across subagents — see conversation/session notes)
into the final Opportunity Radar CSV, reusing the exact scoring/fusion logic
from find_signals.py so results are consistent whether a company was
researched via Groq or via agent WebSearch.

Usage:
    python finalize_signals.py
"""

import csv
import glob
import json
import os

from find_signals import load_and_filter, fuse_signals, sqft_bucket_for_revenue

INPUT_CSV = "results/surat_50km_depth0_companies_revenue_found.csv"
OUTPUT_CSV = "results/surat_50km_depth0_opportunity_radar.csv"
BATCH_GLOB = "/private/tmp/claude-501/-Users-bhavya-040-map-companies/7189feef-ed67-4730-a6e4-41db3e21b6f2/scratchpad/signals_batch_*.json"

# Known duplicate name pairs referring to the same physical company/site,
# left un-merged by the automated dedup in load_and_filter() because the
# name-normalization regex didn't catch these specific suffix styles.
MANUAL_DUPES = {
    "Narmada Bio-Chem Limited (Unit 5)": "Narmada Bio-Chem Limited unit -5 dahej",
    "IDEAL TECHNOPLAST INDUSTRIES LIMITED UNIT - 2": "Ideal Technoplast Industries Limited",
}

OUTPUT_FIELDS = [
    "company", "location", "business_type", "revenue", "revenue_cr",
    "site_count", "estimated_requirement", "requirement_basis",
    "opportunity_score", "why", "evidence", "confidence",
    "recommended_action", "search_method", "status",
]


def main():
    companies = load_and_filter(INPUT_CSV, 30.0, 2000.0)
    by_name = {c["name"]: c for c in companies}

    parsed_by_name = {}
    for path in sorted(glob.glob(BATCH_GLOB)):
        with open(path, encoding="utf-8") as f:
            entries = json.load(f)
        for e in entries:
            parsed_by_name[e["name"]] = {
                "signals": e.get("signals", []),
                "estimated_sqft": e.get("estimated_sqft", ""),
            }

    # Fold manual duplicates into their canonical entry before scoring, then
    # drop the duplicate row entirely so it doesn't double-count in the radar.
    for dupe_name, canonical_name in MANUAL_DUPES.items():
        by_name.pop(dupe_name, None)
        parsed_by_name.pop(dupe_name, None)

    missing = [name for name in by_name if name not in parsed_by_name]
    if missing:
        print(f"WARNING: {len(missing)} companies have no research results: {missing}")

    rows = []
    for name, row in by_name.items():
        parsed = parsed_by_name.get(name, {"signals": [], "estimated_sqft": ""})
        fused = fuse_signals(row, parsed)
        out = {
            "company": row["name"],
            "location": row.get("_locations") or row.get("address", ""),
            "business_type": row.get("business_type", ""),
            "revenue": row.get("revenue", ""),
            "revenue_cr": f"{row['_revenue_cr']:.1f}",
            "site_count": row.get("_site_count", 1),
            "search_method": "agent_web_search",
            "status": "done",
        }
        out.update(fused)
        rows.append(out)

    rows.sort(key=lambda r: -float(r.get("opportunity_score", 0) or 0))

    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS)
        writer.writeheader()
        for r in rows:
            writer.writerow({k: r.get(k, "") for k in OUTPUT_FIELDS})

    print(f"Wrote {len(rows)} companies -> {OUTPUT_CSV}")
    no_signal = sum(1 for r in rows if r["signal_count"] == 0)
    print(f"  {len(rows) - no_signal} with >=1 corroborated signal, {no_signal} with none found")


if __name__ == "__main__":
    main()
