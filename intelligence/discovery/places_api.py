import json
import logging
import os
import requests

logger = logging.getLogger("places_api")
if not logger.handlers:
    os.makedirs("logs", exist_ok=True)
    file_handler = logging.FileHandler("logs/places_api.log")
    file_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    file_handler.setLevel(logging.DEBUG)
    logger.addHandler(file_handler)
    logger.setLevel(logging.DEBUG)
    logger.propagate = False

SEARCH_URL = "https://places.googleapis.com/v1/places:searchNearby"

FIELD_MASK = ",".join([
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.primaryType",
    "places.types",
    "places.nationalPhoneNumber",
    "places.internationalPhoneNumber",
    "places.websiteUri",
    "places.rating",
    "places.userRatingCount",
    "places.businessStatus",
])

# Companies that deal in physical goods/commodities — the audience for a
# storage/warehousing facility: makers and movers of goods, and other
# storage operators (potential partners/competitors worth knowing about).
INCLUDED_TYPES = [
    "manufacturer",
    "supplier",
    "shipping_service",
    "storage",
]

MAX_RADIUS_M = 50000


def search_nearby_companies(lat, lng, radius_m, api_key, max_results=20):
    """Fetch businesses near (lat, lng) within radius_m, via Google's New
    Places API searchNearby endpoint, restricted to company-like types.

    Note: Google's includedPrimaryTypes is only a ranking hint, not a hard
    filter — searchNearby still returns some places outside the requested
    types (observed: churches, mosques, breweries slipping through). So this
    also filters client-side on primaryType to enforce the allow-list.

    Also note: searchNearby hard-caps at 20 raw results per call and does
    not support pagination (that's a searchText-only feature). Because some
    of those 20 get dropped by the client-side filter, you may see fewer
    than 20 companies back per call, especially in non-commercial areas.

    Logs the request and raw response (including full JSON at DEBUG level)
    to logs/places_api.log.

    Returns {"companies": [...], "raw_request": {...}, "raw_response": {...}}.
    Each company dict has: name, address, lat, lng, primary_type, types,
    phone, website, rating, user_rating_count, business_status.
    """
    if radius_m > MAX_RADIUS_M:
        raise ValueError(f"radius_m must be <= {MAX_RADIUS_M} (Google's per-call cap)")

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }

    body = {
        # includedPrimaryTypes matches only each place's single primaryType.
        # includedTypes instead matches against the whole secondary "types"
        # array, which Google tags noisily (e.g. breweries/theaters/churches
        # get tagged "manufacturer"/"association_or_organization") and lets
        # in a lot of non-companies, so primary-type matching is precise.
        "includedPrimaryTypes": INCLUDED_TYPES,
        "maxResultCount": min(max_results, 20),
        "locationRestriction": {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": radius_m,
            }
        },
    }

    logger.info(f"Request: lat={lat}, lng={lng}, radius_m={radius_m}, includedPrimaryTypes={INCLUDED_TYPES}")
    logger.debug(f"Request body: {json.dumps(body, indent=2)}")

    resp = requests.post(SEARCH_URL, headers=headers, json=body, timeout=15)

    logger.info(f"Response status: {resp.status_code}")
    logger.debug(f"Raw response body: {resp.text}")

    resp.raise_for_status()
    data = resp.json()

    raw_places = data.get("places", [])
    results = []
    for place in raw_places:
        if place.get("primaryType") not in INCLUDED_TYPES:
            continue
        location = place.get("location", {})
        results.append({
            "id": place.get("id"),
            "name": place.get("displayName", {}).get("text", "Unknown"),
            "address": place.get("formattedAddress"),
            "lat": location.get("latitude"),
            "lng": location.get("longitude"),
            "primary_type": place.get("primaryType"),
            "types": place.get("types", []),
            "phone": place.get("nationalPhoneNumber") or place.get("internationalPhoneNumber"),
            "website": place.get("websiteUri"),
            "rating": place.get("rating"),
            "user_rating_count": place.get("userRatingCount"),
            "business_status": place.get("businessStatus"),
        })

    logger.info(
        f"Raw places returned: {len(raw_places)} | kept after primaryType filter: {len(results)} "
        f"| dropped: {len(raw_places) - len(results)}"
    )

    return {"companies": results, "raw_request": body, "raw_response": data}
