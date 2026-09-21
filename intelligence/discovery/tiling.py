import logging
import math
import os
import random
import threading
import time
import concurrent.futures as futures

import requests

from discovery.geo_utils import haversine_km
from discovery.places_api import search_nearby_companies, MAX_RADIUS_M

logger = logging.getLogger("tiling")
if not logger.handlers:
    os.makedirs("logs", exist_ok=True)
    file_handler = logging.FileHandler("logs/tiling.log")
    file_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(file_handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False

METERS_PER_DEG_LAT = 111320


def hex_grid_centers(center_lat, center_lng, cover_radius_m, sub_radius_m):
    """Sub-circle centers (radius sub_radius_m) on a hex grid that fully
    covers a disk of cover_radius_m around (center_lat, center_lng), with
    no gaps — spacing between centers is sub_radius_m * sqrt(3), the
    largest spacing that still guarantees full coverage.
    """
    d = sub_radius_m * math.sqrt(3)
    row_spacing = d * math.sqrt(3) / 2
    max_row = int(cover_radius_m / row_spacing) + 3
    max_col = int(cover_radius_m / d) + 3

    meters_per_deg_lng = METERS_PER_DEG_LAT * math.cos(math.radians(center_lat))

    centers = []
    for row in range(-max_row, max_row + 1):
        y = row * row_spacing
        x_offset = (d / 2) if (row % 2 != 0) else 0
        for col in range(-max_col, max_col + 1):
            x = col * d + x_offset
            dist = math.hypot(x, y)
            if dist - sub_radius_m <= cover_radius_m:
                lat = center_lat + y / METERS_PER_DEG_LAT
                lng = center_lng + x / meters_per_deg_lng
                centers.append((lat, lng))
    return centers


class RateLimiter:
    """Paces calls to at most max_per_second, shared across threads, so we
    stay under the API's QPS quota instead of bursting and hitting 429s."""

    def __init__(self, max_per_second):
        self.min_interval = 1.0 / max_per_second
        self.lock = threading.Lock()
        self.last_call = 0.0

    def wait(self):
        with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_call
            if elapsed < self.min_interval:
                time.sleep(self.min_interval - elapsed)
            self.last_call = time.monotonic()


def _search_with_retry(lat, lng, radius_m, api_key, rate_limiter, retries=6):
    for attempt in range(retries):
        rate_limiter.wait()
        try:
            return search_nearby_companies(lat, lng, radius_m, api_key)
        except requests.exceptions.HTTPError as e:
            status = e.response.status_code if e.response is not None else None
            if status == 429 and attempt < retries - 1:
                wait = min(30, 2 ** attempt) + random.uniform(0, 1)
                logger.warning(f"429 rate-limited at ({lat},{lng}), retrying in {wait:.1f}s")
                time.sleep(wait)
                continue
            raise


def find_companies_tiled(
    center_lat,
    center_lng,
    radius_m,
    api_key,
    base_sub_radius_m=3000,
    max_depth=2,
    min_radius_m=750,
    max_workers=4,
    max_qps=3,
):
    """Cover a large radius by tiling it into overlapping searchNearby
    sub-circles, merging/deduplicating by place id, and auto-subdividing
    any sub-circle that hits Google's 20-raw-result cap so dense clusters
    (e.g. industrial estates) aren't silently undercounted.

    Processes in depth-based waves: all sub-circles at a given depth run
    concurrently; any that hit the cap spawn 4-6 half-radius children for
    the next wave, down to min_radius_m or max_depth.

    Returns {"companies": [...], "call_log": [...], "stats": {...}}.
    - companies: deduplicated, with distance_km from (center_lat, center_lng).
    - call_log: one entry per API call — lat, lng, radius_m, depth,
      raw_count, kept_count, distance_from_center_km, subdivided.
    - stats: total_calls, total_raw_candidates, unique_companies,
      calls_by_depth, capped_calls.
    """
    if radius_m > MAX_RADIUS_M and base_sub_radius_m > MAX_RADIUS_M:
        raise ValueError(f"base_sub_radius_m must be <= {MAX_RADIUS_M}")

    merged = {}
    call_log = []
    failed_circles = []
    call_index = 0
    rate_limiter = RateLimiter(max_qps)

    base_centers = hex_grid_centers(center_lat, center_lng, radius_m, base_sub_radius_m)
    wave = [(lat, lng, base_sub_radius_m, 0) for (lat, lng) in base_centers]

    while wave:
        next_wave = []
        with futures.ThreadPoolExecutor(max_workers=max_workers) as pool:
            future_to_circle = {
                pool.submit(_search_with_retry, lat, lng, r, api_key, rate_limiter): (lat, lng, r, depth)
                for (lat, lng, r, depth) in wave
            }
            for future in futures.as_completed(future_to_circle):
                lat, lng, r, depth = future_to_circle[future]
                call_index += 1
                try:
                    result = future.result()
                except Exception as e:
                    logger.error(f"Call permanently failed at ({lat},{lng}, r={r}): {e}")
                    failed_circles.append({"lat": lat, "lng": lng, "radius_m": r, "depth": depth, "error": str(e)})
                    call_log.append({
                        "call_index": call_index, "lat": lat, "lng": lng, "radius_m": r, "depth": depth,
                        "raw_count": None, "kept_count": 0,
                        "distance_from_center_km": haversine_km(center_lat, center_lng, lat, lng),
                        "subdivided": False, "failed": True,
                    })
                    continue

                raw_count = len(result["raw_response"].get("places", []))
                kept_count = len(result["companies"])
                dist_from_center = haversine_km(center_lat, center_lng, lat, lng)

                subdivided = raw_count >= 20 and depth < max_depth and (r / 2) >= min_radius_m
                if subdivided:
                    for clat, clng in hex_grid_centers(lat, lng, r, r / 2):
                        next_wave.append((clat, clng, r / 2, depth + 1))

                call_log.append({
                    "call_index": call_index,
                    "lat": lat,
                    "lng": lng,
                    "radius_m": r,
                    "depth": depth,
                    "raw_count": raw_count,
                    "kept_count": kept_count,
                    "distance_from_center_km": dist_from_center,
                    "subdivided": subdivided,
                    "failed": False,
                })

                for company in result["companies"]:
                    if company.get("id"):
                        merged[company["id"]] = company

                logger.info(
                    f"call#{call_index} depth={depth} r={r:.0f}m raw={raw_count} kept={kept_count} "
                    f"subdivided={subdivided} at ({lat:.5f},{lng:.5f})"
                )

        wave = next_wave

    companies = []
    for company in merged.values():
        company["distance_km"] = haversine_km(center_lat, center_lng, company["lat"], company["lng"])
        if company["distance_km"] * 1000 <= radius_m:
            companies.append(company)
    companies.sort(key=lambda c: c["distance_km"])

    if failed_circles:
        logger.error(f"{len(failed_circles)} circles permanently failed — coverage is incomplete near these spots")

    depths = sorted(set(c["depth"] for c in call_log))
    stats = {
        "total_calls": len(call_log),
        "total_raw_candidates": sum(c["raw_count"] for c in call_log if c["raw_count"] is not None),
        "unique_companies": len(companies),
        "calls_by_depth": {depth: sum(1 for c in call_log if c["depth"] == depth) for depth in depths},
        "capped_calls": sum(1 for c in call_log if (c["raw_count"] or 0) >= 20),
        "failed_calls": len(failed_circles),
    }

    return {"companies": companies, "call_log": call_log, "stats": stats, "failed_circles": failed_circles}
