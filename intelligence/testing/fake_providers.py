"""
FAKE_PROVIDERS=true: deterministic stand-ins for Google Places, the LLM classifier and
the revenue/signal research agents, so the whole discovery -> revenue -> signals ->
CRM flow can be rehearsed in the UI without API keys or spend. Refused when
ENVIRONMENT=production. Every fake company is named "[FAKE] ..." with a place_id
starting "fake-", so it's easy to spot and to delete
(python -m testing.fake_providers --cleanup).
"""

import hashlib
import logging
import math
from datetime import date, timedelta

from discovery.geo_utils import haversine_km

logger = logging.getLogger(__name__)

TAG = "[FAKE]"
PLACE_PREFIX = "fake-"

# name, business-type hint for the fakes below
_TEMPLATES = [
    ("{area} Speciality Chemicals Pvt Ltd", "Chemicals"),
    ("{area} Pharma Formulations Ltd", "Pharma"),
    ("{area} Polymers & Packaging", "Plastics"),
    ("{area} Textile Processors", "Textiles"),
    ("{area} Agro Foods Pvt Ltd", "Food Processing"),
    ("{area} Engineering Works", "Engineering"),
    ("{area} Trading Company", None),  # ambiguous name -> AI classifier path
    ("{area} Logistics Solutions", "Logistics"),
]


def _area_name(lat: float, lng: float) -> str:
    return "Grid-" + hashlib.sha1(f"{lat:.2f},{lng:.2f}".encode()).hexdigest()[:4].upper()


def fake_find_companies_tiled(lat, lng, radius_m, api_key=None, **_):
    """Eight companies spread inside the radius. The same area always yields the same
    place_ids, so a second search over it finds them as already known."""
    radius_km = radius_m / 1000
    area = _area_name(lat, lng)
    companies = []
    for i, (template, _) in enumerate(_TEMPLATES):
        angle = (i * 137.5) % 360
        dist = radius_km * (0.15 + 0.1 * i)  # 15%..85% of the radius
        dlat = (dist / 111.0) * math.cos(math.radians(angle))
        dlng = (dist / (111.0 * math.cos(math.radians(lat)))) * math.sin(math.radians(angle))
        clat, clng = lat + dlat, lng + dlng
        companies.append({
            "id": f"{PLACE_PREFIX}{lat:.2f}-{lng:.2f}-{i}",
            "name": f"{TAG} {template.format(area=area)}",
            "address": f"Plot {101 + i}, Industrial Estate near {lat:.3f}, {lng:.3f}",
            "lat": clat,
            "lng": clng,
            "distance_km": haversine_km(lat, lng, clat, clng),
            "phone": None,
            "website": f"https://fake-{area.lower()}-{i}.example.com",
            "primary_type": "manufacturer",
        })
    calls = max(1, round((radius_km / 3) ** 2))
    return {"companies": companies, "call_log": [{}] * calls, "stats": {"total_calls": calls, "failed_calls": 0}, "failed_circles": []}


class FakeClassifier:
    def __init__(self, settings=None):
        pass

    def classify(self, name, address="", website=None):
        return {"category": "Trading & Distribution", "confidence": "medium", "reason": "fake provider: name suggests a distributor"}


class FakeRevenueAgent:
    def __init__(self, settings=None):
        pass

    def research(self, name, address="", website=None):
        crore = float(40 + int(hashlib.sha1(name.encode()).hexdigest(), 16) % 1200)
        return {
            "revenue": f"₹{crore:.0f} Cr", "revenue_cr": crore, "fiscal_year": "FY2025",
            "source_name": "Fake provider", "source_url": "https://example.com/fake-revenue",
            "method": "agent", "confidence": "low",
        }


class FakeSignalAgent:
    def __init__(self, settings=None):
        pass

    def research(self, name, address="", business_type=None):
        h = int(hashlib.sha1(name.encode()).hexdigest(), 16)
        recent = (date.today() - timedelta(days=10 + h % 60)).isoformat()
        signals = [{
            "type": "expansion", "summary": f"{name} is adding a production line (fake signal)",
            "date": recent, "source_name": "Fake news", "source_url": "https://example.com/fake-expansion", "confidence": "high",
        }]
        if h % 2 == 0:
            signals.append({
                "type": "lease_expiry", "summary": "Current warehouse lease ends within a year (fake signal)",
                "date": recent, "source_name": "Fake filing", "source_url": "https://example.com/fake-lease", "confidence": "medium",
            })
        if h % 3 == 0:
            signals.append({
                "type": "hiring", "summary": "Hiring warehouse and logistics staff (fake signal)",
                "date": recent, "source_name": "Fake jobs", "source_url": "https://example.com/fake-jobs", "confidence": "medium",
            })
        return {"signals": signals, "estimated_sqft": f"{20 + h % 40},000 sq ft"}


def install() -> None:
    import jobs.discovery_runner as dr
    import jobs.runner as jr

    dr.find_companies_tiled = fake_find_companies_tiled
    dr.AIFallbackClassifier = FakeClassifier
    jr.RevenueAgent = FakeRevenueAgent
    jr.SignalAgent = FakeSignalAgent
    logger.warning("FAKE_PROVIDERS is on: Places, LLM and research agents are fakes. Never use this in production.")


def cleanup(db) -> int:
    """Delete every fake company and its research. Caller commits."""
    from app.db.models import Company

    ids = [c.id for c in db.query(Company.id).filter(Company.place_id.like(PLACE_PREFIX + "%"))]
    if ids:
        for table in ("signals", "revenue_snapshots", "opportunity_scores", "jobs"):
            db.execute(__import__("sqlalchemy").text(f"DELETE FROM {table} WHERE company_id = ANY(:ids)"), {"ids": ids})
        db.execute(__import__("sqlalchemy").text(
            "DELETE FROM outreach_drafts WHERE contact_id IN (SELECT id FROM contacts WHERE company_id = ANY(:ids))"), {"ids": ids})
        db.execute(__import__("sqlalchemy").text("DELETE FROM contacts WHERE company_id = ANY(:ids)"), {"ids": ids})
        db.execute(__import__("sqlalchemy").text("UPDATE companies SET parent_company_id = NULL WHERE parent_company_id = ANY(:ids)"), {"ids": ids})
        db.execute(__import__("sqlalchemy").text("DELETE FROM companies WHERE id = ANY(:ids)"), {"ids": ids})
    return len(ids)


if __name__ == "__main__":
    import sys

    if "--cleanup" in sys.argv:
        from app.db.base import SessionLocal

        session = SessionLocal()
        n = cleanup(session)
        session.commit()
        session.close()
        print(f"removed {n} fake companies")
