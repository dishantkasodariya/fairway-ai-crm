import argparse
import csv
import json
import os

from config import PLACES_API_KEY
from tiling import find_companies_tiled
from map_builder import build_map


def save_call_log_csv(call_log, path):
    fieldnames = ["call_index", "lat", "lng", "radius_m", "depth", "raw_count",
                  "kept_count", "distance_from_center_km", "subdivided", "failed"]
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(call_log)


def save_companies_csv(companies, path):
    fieldnames = ["id", "name", "primary_type", "distance_km", "address",
                  "phone", "website", "rating", "user_rating_count",
                  "business_status", "lat", "lng"]
    with open(path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for c in companies:
            writer.writerow({k: c.get(k) for k in fieldnames})


def main():
    parser = argparse.ArgumentParser(description="Tiled company search over a large radius.")
    parser.add_argument("--lat", type=float, required=True)
    parser.add_argument("--lng", type=float, required=True)
    parser.add_argument("--radius", type=float, default=50000, help="Total coverage radius in meters")
    parser.add_argument("--sub-radius", type=float, default=3000, help="Base sub-circle radius in meters")
    parser.add_argument("--max-depth", type=int, default=2)
    parser.add_argument("--min-radius", type=float, default=750)
    parser.add_argument("--output-prefix", default="results/tiled")
    parser.add_argument("--map-output", default="results/tiled_map.html")
    parser.add_argument("--qps", type=float, default=3, help="Max requests/sec (quota allows up to 10)")
    parser.add_argument("--workers", type=int, default=4, help="Concurrent request threads")
    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.output_prefix) or ".", exist_ok=True)

    result = find_companies_tiled(
        args.lat, args.lng, args.radius, PLACES_API_KEY,
        base_sub_radius_m=args.sub_radius,
        max_depth=args.max_depth,
        min_radius_m=args.min_radius,
        max_workers=args.workers,
        max_qps=args.qps,
    )

    companies = result["companies"]
    call_log = result["call_log"]
    stats = result["stats"]

    print(f"Total API calls: {stats['total_calls']}")
    print(f"Calls by depth: {stats['calls_by_depth']}")
    print(f"Calls that hit the 20-result cap: {stats['capped_calls']}")
    print(f"Calls that permanently failed: {stats['failed_calls']}")
    print(f"Total raw candidates seen (pre-filter, pre-dedup): {stats['total_raw_candidates']}")
    print(f"Unique companies within {args.radius/1000:.1f}km after dedup: {stats['unique_companies']}")

    if result["failed_circles"]:
        print("\nWARNING: coverage is incomplete near these circles (all retries exhausted):")
        for fc in result["failed_circles"]:
            print(f"  - ({fc['lat']:.5f}, {fc['lng']:.5f}) r={fc['radius_m']:.0f}m depth={fc['depth']}: {fc['error']}")

    call_log_path = f"{args.output_prefix}_call_log.csv"
    companies_csv_path = f"{args.output_prefix}_companies.csv"
    companies_json_path = f"{args.output_prefix}_companies.json"
    stats_path = f"{args.output_prefix}_stats.json"

    save_call_log_csv(call_log, call_log_path)
    save_companies_csv(companies, companies_csv_path)
    with open(companies_json_path, "w") as f:
        json.dump(companies, f, indent=2)
    with open(stats_path, "w") as f:
        json.dump(stats, f, indent=2)

    print(f"\nSaved call log to {call_log_path}")
    print(f"Saved companies to {companies_csv_path} and {companies_json_path}")
    print(f"Saved stats to {stats_path}")

    build_map(args.lat, args.lng, args.radius, companies, args.map_output)
    print(f"Map saved to {args.map_output}")


if __name__ == "__main__":
    main()
