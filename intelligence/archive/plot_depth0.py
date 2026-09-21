import csv

from geo_utils import haversine_km
from map_builder import build_map

WAREHOUSE_LAT = 21.4779173
WAREHOUSE_LNG = 72.7234733
RADIUS_M = 50000

with open("results/surat_50km_depth0_companies.csv") as f:
    companies = list(csv.DictReader(f))

for c in companies:
    c["lat"] = float(c["lat"])
    c["lng"] = float(c["lng"])
    c["distance_km"] = haversine_km(WAREHOUSE_LAT, WAREHOUSE_LNG, c["lat"], c["lng"])

companies.sort(key=lambda c: c["distance_km"])

map_path = "results/surat_50km_depth0_map.html"
build_map(WAREHOUSE_LAT, WAREHOUSE_LNG, RADIUS_M, companies, output_path=map_path, cluster=True)
print(f"Map saved to {map_path} ({len(companies)} companies, clustered)")

list_path = "results/surat_50km_depth0_companies_sorted.csv"
with open(list_path, "w", newline="") as f:
    fieldnames = ["name", "primary_type", "distance_km", "address", "phone", "website", "lat", "lng", "id"]
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    for c in companies:
        w.writerow({k: c.get(k) for k in fieldnames})
print(f"Sorted list saved to {list_path}")

print("\nClosest 20 companies:")
for c in companies[:20]:
    print(f"- {c['name']} [{c['primary_type']}] — {c['distance_km']:.2f} km — {c.get('phone') or 'no phone'} — {c.get('website') or 'no website'}")
