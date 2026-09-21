import argparse
import json
import logging

from config import PLACES_API_KEY
from geo_utils import haversine_km
from places_api import search_nearby_companies, logger as places_logger
from map_builder import build_map


def find_companies_near(lat, lng, radius_m, max_results=20):
    """Returns (companies, raw) — raw has 'raw_request' and 'raw_response'."""
    result = search_nearby_companies(lat, lng, radius_m, PLACES_API_KEY, max_results)
    companies = result["companies"]
    for company in companies:
        if company["lat"] is not None and company["lng"] is not None:
            company["distance_km"] = haversine_km(lat, lng, company["lat"], company["lng"])
        else:
            company["distance_km"] = None
    companies.sort(key=lambda c: (c["distance_km"] is None, c["distance_km"]))
    return companies, result


def main():
    parser = argparse.ArgumentParser(description="Find companies near a warehouse and plot them on a map.")
    parser.add_argument("--lat", type=float, required=True, help="Warehouse latitude")
    parser.add_argument("--lng", type=float, required=True, help="Warehouse longitude")
    parser.add_argument("--radius", type=float, default=2500, help="Search radius in meters (max 50000)")
    parser.add_argument("--output", default="warehouse_map.html", help="Output HTML map path")
    parser.add_argument("--verbose", action="store_true", help="Print raw API request/response to the console")
    args = parser.parse_args()

    if args.verbose:
        console = logging.StreamHandler()
        console.setLevel(logging.DEBUG)
        console.setFormatter(logging.Formatter("%(levelname)s %(message)s"))
        places_logger.addHandler(console)

    companies, raw = find_companies_near(args.lat, args.lng, args.radius)

    print(f"Found {len(companies)} companies within {args.radius:.0f}m of ({args.lat}, {args.lng})\n")
    for c in companies:
        dist = f"{c['distance_km']:.2f} km" if c["distance_km"] is not None else "?"
        print(f"- {c['name']} [{c.get('primary_type')}] — {dist} — {c.get('phone') or 'no phone'} — {c.get('website') or 'no website'}")

    build_map(args.lat, args.lng, args.radius, companies, args.output)
    print(f"\nMap saved to {args.output}")
    print("Full request/response logged to logs/places_api.log (pass --verbose to also print here)")


if __name__ == "__main__":
    main()
