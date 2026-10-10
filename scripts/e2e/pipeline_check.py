"""
End-to-end check of the lead-to-lease chain on a small dummy dataset:

  coordinates + radius -> discovery run -> business type -> revenue -> signals/score
  -> warehouse on the map -> Add to CRM (owner = warehouse manager) -> touches/follow-up
  -> proposal + space hold -> win -> lease -> free space -> Today -> AI attribution

Our own code runs for real: the intelligence job runners, scoring, both APIs and the CRM
pipeline, against the local databases. Only the outside services (Google Places, the LLM,
Serper) are replaced with deterministic fakes, so it needs no API keys and costs nothing.
Everything it creates is tagged "[E2E]" and deleted at the end (pass --keep to inspect it
in the UI first, then --cleanup-only to remove it).

Run with the intelligence venv, both services up (intelligence :8000, backend :5001):
  /Users/bhavya_040/map-companies/venv/bin/python scripts/e2e/pipeline_check.py
"""

import argparse
import os
import sys
from datetime import date, timedelta
from pathlib import Path
from urllib.parse import urlparse

import psycopg2
import requests

ROOT = Path(__file__).resolve().parents[2]
INTEL_DIR = ROOT / "intelligence"
sys.path.insert(0, str(INTEL_DIR))
os.chdir(INTEL_DIR)  # intelligence settings read intelligence/.env

TAG = "[E2E]"
FAKE_TAG = "[FAKE]"  # rows made while rehearsing with FAKE_PROVIDERS=true
PLACE_PREFIX = "e2e-place-"
# A fresh spot (Kosamba, between Surat and Bharuch) and a 10 km search radius.
CENTER = (21.4630, 72.9560)
RADIUS_KM = 10.0
WAREHOUSE_AREA = 100_000

# name, lat/lng offset, how classification should go
DUMMY_PLACES = [
    ("Shree Ambica Chemicals Pvt Ltd", (0.010, 0.012), "rule"),
    ("Apex Pharma Formulations Ltd", (-0.020, 0.015), "rule"),
    ("Kosamba Textile Mills", (0.030, -0.025), "rule"),
    ("Bharat Polymers & Plastics", (-0.035, -0.020), "rule"),
    ("Mehta Enterprises", (0.045, 0.030), "ai"),
    ("Riverbank Holdings", (0.015, -0.050), "ai_fails"),
    ("Gujarat Salt Works", (-0.012, 0.040), "rule_unsuitable"),
]
SUITABLE = 5  # all but the unclassified one (LLM outage) and the salt works

results: list[tuple[str, bool, str]] = []


def check(label: str, ok: bool, detail: str = "") -> bool:
    results.append((label, bool(ok), detail))
    print(f"  {'PASS' if ok else 'FAIL'}  {label}" + (f"  ({detail})" if detail else ""))
    return bool(ok)


def env_value(path: Path, key: str) -> str:
    for line in path.read_text().splitlines():
        if line.strip().startswith(f"{key}") and "=" in line:
            k, v = line.split("=", 1)
            if k.strip() == key:
                return v.strip().strip('"')
    raise SystemExit(f"{key} missing from {path}")


def require_local(url: str, what: str, allow_remote: bool) -> None:
    host = urlparse(url.replace("postgresql+psycopg2", "postgresql")).hostname
    if host not in ("localhost", "127.0.0.1") and not allow_remote:
        raise SystemExit(f"{what} is not local ({host}); refusing to write test data there. Use --allow-remote to override.")


# ---------------------------------------------------------------- fakes

def fake_places_result(center, names):
    lat0, lng0 = center
    from discovery.geo_utils import haversine_km

    companies = []
    for i, (name, (dlat, dlng), _) in enumerate(names):
        lat, lng = lat0 + dlat, lng0 + dlng
        companies.append({
            "id": f"{PLACE_PREFIX}{i}",
            "name": f"{TAG} {name}",
            "address": f"Plot {100 + i}, GIDC Kosamba, Gujarat",
            "lat": lat,
            "lng": lng,
            "distance_km": haversine_km(lat0, lng0, lat, lng),
            "phone": None,
            "website": f"https://e2e-{i}.example.com",
            "primary_type": "manufacturer",
        })
    return {"companies": companies, "call_log": [{}] * 4, "stats": {"total_calls": 4, "failed_calls": 0}, "failed_circles": []}


class FakeClassifier:
    def __init__(self, settings):
        pass

    def classify(self, name, address="", website=None):
        if "Riverbank" in name:
            raise RuntimeError("simulated LLM outage")
        return {"category": "Shipping/Logistics/Transport", "confidence": "medium", "reason": "fake LLM: distributor of packaged goods"}


class FakeRevenueAgent:
    def __init__(self, settings=None):
        pass

    def research(self, name, address="", website=None):
        crore = 900.0 if "Chemicals" in name else 120.0 if "Pharma" in name else 40.0
        return {
            "revenue": f"₹{crore:.0f} Cr", "revenue_cr": crore, "fiscal_year": "FY2025",
            "source_name": "E2E fixture", "source_url": "https://example.com/e2e-revenue",
            "method": "agent", "confidence": "medium",
        }


class FakeSignalAgent:
    calls: dict[str, int] = {}

    def __init__(self, settings=None):
        pass

    def research(self, name, address="", business_type=None):
        n = FakeSignalAgent.calls[name] = FakeSignalAgent.calls.get(name, 0) + 1
        if "Apex Pharma" in name and n == 1:
            raise RuntimeError("429 Too Many Requests (simulated, first try only)")
        if "Kosamba Textile" in name:
            raise RuntimeError("429 Too Many Requests (simulated, every try)")
        recent = (date.today() - timedelta(days=20)).isoformat()
        signals = [{
            "type": "expansion", "summary": f"{name} announced a new production line at Kosamba",
            "date": recent, "source_name": "E2E news", "source_url": "https://example.com/e2e-expansion", "confidence": "high",
        }]
        if "Chemicals" in name and n >= 3:  # a later scheduled re-check finds one new story
            signals.append({
                "type": "tender", "summary": "Won a GIDC tender for a new storage block",
                "date": recent, "source_name": "E2E tenders", "source_url": "https://example.com/e2e-tender?utm=x", "confidence": "high",
            })
        if "Chemicals" in name:
            signals.append({
                "type": "lease_expiry", "summary": "Current 40,000 sq ft warehouse lease in Ankleshwar ends next year",
                "date": recent, "source_name": "E2E filing", "source_url": "https://example.com/e2e-lease", "confidence": "medium",
            })
            signals.append({
                "type": "hiring", "summary": "Hiring warehouse supervisors", "date": recent,
                "source_name": "E2E jobs", "source_url": None, "confidence": "low",  # no source -> must be dropped
            })
        return {"signals": signals, "estimated_sqft": "30,000-40,000 sq ft"}


def install_fakes():
    import jobs.discovery_runner as dr
    import jobs.runner as jr

    dr.AIFallbackClassifier = FakeClassifier
    jr.RevenueAgent = FakeRevenueAgent
    jr.SignalAgent = FakeSignalAgent
    import jobs.run_pipeline as rp
    from testing.fake_providers import FakeApolloClient

    rp.ApolloClient = FakeApolloClient
    rp.RETRY_PAUSE_S = 0
    rp.get_settings().apollo_api_key = rp.get_settings().apollo_api_key or "fake-key-for-e2e"
    return dr


# ---------------------------------------------------------------- cleanup

def cleanup(intel_url: str, crm_url: str) -> None:
    with psycopg2.connect(intel_url.replace("postgresql+psycopg2", "postgresql")) as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM companies WHERE place_id LIKE %s OR place_id LIKE 'fake-%%' OR name LIKE %s",
                    (PLACE_PREFIX + "%", TAG + "%"))
        ids = [r[0] for r in cur.fetchall()]
        # runs whose every company was fake (rehearsals) go too
        cur.execute("""SELECT r.id FROM discovery_runs r WHERE EXISTS (SELECT 1 FROM discovery_run_companies x WHERE x.discovery_run_id = r.id)
                       AND NOT EXISTS (SELECT 1 FROM discovery_run_companies x JOIN companies c ON c.id = x.company_id
                                       WHERE x.discovery_run_id = r.id AND c.place_id NOT LIKE 'fake-%%' AND c.place_id NOT LIKE %s)""",
                    (PLACE_PREFIX + "%",))
        fake_runs = [r[0] for r in cur.fetchall()]
        if ids:
            cur.execute("DELETE FROM outreach_drafts WHERE contact_id IN (SELECT id FROM contacts WHERE company_id = ANY(%s))", (ids,))
            for table in ("signals", "revenue_snapshots", "opportunity_scores", "jobs", "contacts"):
                cur.execute(f"DELETE FROM {table} WHERE company_id = ANY(%s)", (ids,))
            cur.execute("UPDATE companies SET parent_company_id = NULL WHERE parent_company_id = ANY(%s)", (ids,))
            cur.execute("DELETE FROM companies WHERE id = ANY(%s)", (ids,))
        cur.execute("DELETE FROM discovery_runs WHERE (warehouse_lat = %s AND warehouse_lng = %s) OR id = ANY(%s)", (*CENTER, fake_runs))
    print(f"  intelligence: removed {len(ids)} dummy companies and the dummy runs")

    with psycopg2.connect(crm_url.split("?")[0]) as conn, conn.cursor() as cur:
        cur.execute("SELECT id FROM properties WHERE name LIKE %s", (TAG + "%",))
        props = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT id FROM companies WHERE name LIKE %s OR name LIKE %s", (TAG + "%", FAKE_TAG + "%"))
        comps = [r[0] for r in cur.fetchall()]
        cur.execute("SELECT id FROM inquiries WHERE company_name LIKE %s OR company_name LIKE %s OR company_id = ANY(%s)",
                    (TAG + "%", FAKE_TAG + "%", comps))
        inqs = [r[0] for r in cur.fetchall()]
        cur.execute(
            "SELECT table_name FROM information_schema.columns WHERE table_schema='public' AND column_name='inquiry_id'"
        )
        for (table,) in cur.fetchall():
            if table != "inquiries":
                cur.execute(f'DELETE FROM "{table}" WHERE inquiry_id = ANY(%s)', (inqs,))
        cur.execute("DELETE FROM leases WHERE property_id = ANY(%s) OR company_id = ANY(%s)", (props, comps))
        cur.execute("DELETE FROM space_holds WHERE property_id = ANY(%s)", (props,))
        cur.execute("DELETE FROM proposals WHERE inquiry_id = ANY(%s) OR company_id = ANY(%s)", (inqs, comps))
        cur.execute("DELETE FROM tasks WHERE company_id = ANY(%s)", (comps,))
        cur.execute("DELETE FROM activities WHERE company_id = ANY(%s)", (comps,))
        cur.execute("DELETE FROM notifications WHERE entity_id = ANY(%s)", (inqs + props,))
        cur.execute("DELETE FROM inquiries WHERE id = ANY(%s)", (inqs,))
        cur.execute("DELETE FROM contacts WHERE company_id = ANY(%s)", (comps,))
        cur.execute("DELETE FROM companies WHERE id = ANY(%s)", (comps,))
        cur.execute("DELETE FROM properties WHERE id = ANY(%s)", (props,))
    print(f"  crm: removed {len(props)} warehouse(s), {len(comps)} company(ies), {len(inqs)} deal(s) and their history")


# ---------------------------------------------------------------- main flow

def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--crm", default="http://localhost:5001/api")
    ap.add_argument("--email", default="amit@fairway.co.in")
    ap.add_argument("--password", default="fairway123")
    ap.add_argument("--keep", action="store_true", help="leave the dummy data in place to click through the UI")
    ap.add_argument("--cleanup-only", action="store_true")
    ap.add_argument("--allow-remote", action="store_true")
    args = ap.parse_args()

    intel_url = env_value(INTEL_DIR / ".env", "DATABASE_URL")
    crm_url = env_value(ROOT / "backend" / ".env", "DATABASE_URL")
    intel_api = "http://localhost:8000"
    intel_key = env_value(INTEL_DIR / ".env", "API_KEY")
    require_local(intel_url, "Intelligence DB", args.allow_remote)
    require_local(crm_url, "CRM DB", args.allow_remote)

    print("Removing leftovers from earlier runs")
    cleanup(intel_url, crm_url)
    if args.cleanup_only:
        return 0

    dr = install_fakes()
    from app.db.base import SessionLocal
    from app.db.models import Company, DiscoveryRun, DiscoveryRunStatus, OpportunityScore, RevenueSnapshot, Signal

    ih = {"X-API-Key": intel_key}
    s = requests.Session()

    # -- CRM login + the warehouse the client points at
    print("\n1. CRM: log in and add the warehouse with exact coordinates")
    r = s.post(f"{args.crm}/auth/login", json={"email": args.email, "password": args.password}, timeout=15)
    if not check("login", r.ok, f"HTTP {r.status_code}"):
        return 1
    s.headers["Authorization"] = f"Bearer {r.json()['data']['token']}"
    me = s.get(f"{args.crm}/auth/me", timeout=15).json()["data"]["user"]

    r = s.post(f"{args.crm}/properties", json={
        "name": f"{TAG} Fairway Warehouse - Kosamba", "location": "GIDC Kosamba", "city": "Surat", "state": "Gujarat",
        "totalAreaSqFt": WAREHOUSE_AREA, "availableAreaSqFt": WAREHOUSE_AREA, "baselineOccupiedSqFt": 0, "rentPerSqFtINR": 22,
        "latitude": CENTER[0], "longitude": CENTER[1], "status": "Available",
        "managerUserId": me["id"], "managerName": me.get("name") or "E2E Manager",
    }, timeout=15)
    check("create warehouse", r.status_code in (200, 201), f"HTTP {r.status_code} {r.text[:120] if not r.ok else ''}")
    prop = r.json()["data"]
    prop_id = prop["id"]
    got = s.get(f"{args.crm}/properties/{prop_id}", timeout=15).json()["data"]
    check("warehouse stored at the exact coordinates", abs(float(got["latitude"]) - CENTER[0]) < 1e-6 and abs(float(got["longitude"]) - CENTER[1]) < 1e-6,
          f"{got['latitude']}, {got['longitude']}")

    # -- Discovery: Places outage must fail loudly
    print("\n2. Intelligence: a dead Places key fails the run with a reason (not 'done, 0 companies')")
    db = SessionLocal()
    dr.find_companies_tiled = lambda *a, **k: {
        "companies": [], "call_log": [{}], "stats": {"total_calls": 1, "failed_calls": 1},
        "failed_circles": [{"lat": CENTER[0], "lng": CENTER[1], "radius_m": 3000, "depth": 0, "error": "403 Client Error: Forbidden"}],
    }
    bad = DiscoveryRun(warehouse_lat=CENTER[0], warehouse_lng=CENTER[1], radius_km=RADIUS_KM, status=DiscoveryRunStatus.queued)
    db.add(bad); db.commit()
    dr.run_discovery_job(bad.id)
    db.refresh(bad)
    check("run marked failed", bad.status == DiscoveryRunStatus.failed, bad.status.value)
    check("failure reason recorded", bool(bad.error) and "403" in bad.error, bad.error or "")

    # -- Discovery around the warehouse
    print(f"\n3. Intelligence: discover companies within {RADIUS_KM:.0f} km of the warehouse, classify business types")
    dr.find_companies_tiled = lambda lat, lng, *a, **k: fake_places_result((lat, lng), DUMMY_PLACES)
    run = DiscoveryRun(warehouse_lat=CENTER[0], warehouse_lng=CENTER[1], radius_km=RADIUS_KM, property_id=prop_id, status=DiscoveryRunStatus.queued)
    db.add(run); db.commit()
    dr.run_discovery_job(run.id)
    db.refresh(run)
    check("run done despite one LLM failure", run.status == DiscoveryRunStatus.done, f"{run.status.value} {run.error or ''}")
    check("all dummy companies created", run.companies_found == len(DUMMY_PLACES), str(run.companies_found))
    comps = {c.name.replace(f"{TAG} ", ""): c for c in db.query(Company).filter(Company.place_id.like(PLACE_PREFIX + "%"))}
    check("rule-based business type", comps["Shree Ambica Chemicals Pvt Ltd"].business_type == "Chemicals", comps["Shree Ambica Chemicals Pvt Ltd"].business_type)
    check("AI fallback business type", comps["Mehta Enterprises"].business_type == "Shipping/Logistics/Transport", comps["Mehta Enterprises"].business_type)
    check("LLM outage leaves company unclassified, not lost", comps["Riverbank Holdings"].business_type_confidence == "low", comps["Riverbank Holdings"].business_type_reason)

    rr = requests.get(f"{intel_api}/v1/discovery/runs/{run.id}", headers=ih, timeout=15).json()
    check("API: run shows matched + linked companies", rr["companies_matched"] == len(DUMMY_PLACES) and rr["companies_linked"] == len(DUMMY_PLACES),
          f"matched={rr['companies_matched']} linked={rr['companies_linked']}")
    lst = requests.get(f"{intel_api}/v1/companies", params={"discovery_run_id": run.id, "sort_by": "distance", "limit": 50}, headers=ih, timeout=15).json()
    check("API: run results list every company with distance", lst["total"] == len(DUMMY_PLACES) and all(i["distance_km"] is not None for i in lst["items"]),
          f"total={lst['total']}")

    # -- One-click pipeline: revenue -> rank -> signals in batches -> Apollo contacts
    print("\n4. Intelligence: pipeline (revenue, rank by fit x revenue, signals in batches of 2, Apollo top 2)")
    from jobs.run_pipeline import run_pipeline_job

    run.pipeline_status = "running"; db.commit()
    run_pipeline_job(run.id, signals_batch_size=2, contacts_top_n=2)
    db.expire_all(); db.refresh(run)
    check("pipeline done", run.pipeline_status == "done", f"{run.pipeline_status} {run.pipeline_note or ''}")
    check("suitable vs skipped business types", run.suitable_count == SUITABLE and run.skipped_count == len(DUMMY_PLACES) - SUITABLE,
          f"suitable={run.suitable_count} skipped={run.skipped_count}")
    check("revenue researched for suitable companies only", run.revenue_enriched_count == SUITABLE, str(run.revenue_enriched_count))
    salt = comps["Gujarat Salt Works"]
    check("no research spend on skipped companies",
          not db.query(RevenueSnapshot).filter(RevenueSnapshot.company_id == salt.id).count()
          and not db.query(OpportunityScore).filter(OpportunityScore.company_id == salt.id).count())
    check("signals for every suitable company, in batches", run.signals_total == SUITABLE and run.signals_batch_size == 2,
          f"total={run.signals_total} batch={run.signals_batch_size}")
    check("a rate-limited lookup recovers on the retry pass", db.query(OpportunityScore).filter(
          OpportunityScore.company_id == comps["Apex Pharma Formulations Ltd"].id).count() == 1)
    check("a lookup that keeps failing is counted as failed, not researched",
          run.signals_researched_count == SUITABLE - 1 and run.signals_failed_count == 1 and "failed" in (run.pipeline_note or ""),
          f"ok={run.signals_researched_count} failed={run.signals_failed_count} note={run.pipeline_note}")
    top = comps["Shree Ambica Chemicals Pvt Ltd"]
    sigs = db.query(Signal).filter(Signal.company_id == top.id).all()
    check("uncited signal dropped", all(sg.source_url for sg in sigs) and len(sigs) == 2, f"{len(sigs)} stored")
    score = db.query(OpportunityScore).filter(OpportunityScore.company_id == top.id).one_or_none()
    check("opportunity score computed", score is not None and score.score > 0, f"score={score.score if score else None}")
    check("warehouse requirement estimated", score is not None and bool(score.estimated_requirement), score.estimated_requirement if score else "")
    top_score = max(o.score for o in db.query(OpportunityScore).filter(OpportunityScore.company_id.in_([c.id for c in comps.values()])))
    check("biggest chemicals company scores highest", score is not None and score.score == top_score, f"{score.score if score else None} vs max {top_score}")
    check("Apollo contacts for the top 2", run.contacts_status == "done" and run.contacts_companies_done == 2 and run.contacts_found_count == 6,
          f"{run.contacts_status} companies={run.contacts_companies_done} people={run.contacts_found_count}")
    run.pipeline_status = "running"; db.commit()
    run_pipeline_job(run.id, signals_batch_size=2, contacts_top_n=2)
    db.expire_all(); db.refresh(run)
    check("re-running retries only what failed", run.revenue_enriched_count == 0 and run.signals_total == 1,
          f"revenue={run.revenue_enriched_count} signals={run.signals_total}")

    # -- Overlapping search: known companies must still show up
    print("\n6. Intelligence: a second search over the same area (coordinates only, no warehouse)")
    run2 = DiscoveryRun(warehouse_lat=CENTER[0], warehouse_lng=CENTER[1], radius_km=RADIUS_KM, status=DiscoveryRunStatus.queued)
    db.add(run2); db.commit()
    dr.run_discovery_job(run2.id)
    rr2 = requests.get(f"{intel_api}/v1/discovery/runs/{run2.id}", headers=ih, timeout=15).json()
    check("no duplicates created", rr2["companies_found"] == 0, str(rr2["companies_found"]))
    check("already-known companies listed in the new run", rr2["companies_matched"] == len(DUMMY_PLACES), str(rr2["companies_matched"]))
    run_id, run2_id, top_id = run.id, run2.id, top.id
    dummy_ids = {c.id for c in comps.values()}
    db.close()

    # -- CRM side
    print("\n7. CRM: browse the run's prospects through the CRM and add the best one")
    r = s.get(f"{args.crm}/intelligence/companies", params={"discoveryRunId": run_id, "sortBy": "score"}, timeout=20)
    items = r.json()["data"]["items"] if r.ok else []
    check("CRM lists the run's prospects, best score first", r.ok and items and items[0]["name"].endswith("Shree Ambica Chemicals Pvt Ltd"),
          items[0]["name"] if items else r.text[:120])
    prospect_id = top_id
    r = s.get(f"{args.crm}/intelligence/companies", params={"propertyId": prop_id}, timeout=20)
    check("prospects filter by warehouse", r.ok and r.json()["data"]["total"] == len(DUMMY_PLACES), str(r.json()["data"]["total"]) if r.ok else r.text[:120])

    r = s.post(f"{args.crm}/intelligence/companies/{prospect_id}/contacts", json={
        "name": "Rakesh Shah", "title": "Head of Supply Chain", "email": "rakesh@e2e.example.com", "phone": "+91 98250 00000"}, timeout=20)
    check("add key person", r.status_code == 201, f"HTTP {r.status_code}")
    contact_id = r.json()["data"]["id"] if r.ok else None

    r = s.post(f"{args.crm}/intelligence/companies/{prospect_id}/add-to-crm", json={"contactId": contact_id}, timeout=20)
    check("Add to CRM", r.status_code == 201, f"HTTP {r.status_code} {r.text[:160] if not r.ok else ''}")
    added = r.json()["data"] if r.ok else {}
    inq_id = added.get("inquiryId")
    check("owner = the nearest warehouse's manager", (added.get("owner") or {}).get("propertyId") == prop_id,
          str((added.get("owner") or {}).get("propertyName")))
    check("key person carried onto the deal", added.get("contactName") == "Rakesh Shah", str(added.get("contactName")))
    r = s.post(f"{args.crm}/intelligence/companies/{prospect_id}/add-to-crm", json={}, timeout=20)
    check("adding again is refused (no duplicate deal)", r.status_code in (409, 400), f"HTTP {r.status_code}")
    st = s.get(f"{args.crm}/intelligence/companies/{prospect_id}/crm-status", timeout=20).json()["data"]
    check("prospect shows 'In CRM'", bool(st.get("inCrm") or st.get("openInquiry")), str({k: st.get(k) for k in ("inCrm",)}))

    r = s.get(f"{args.crm}/intelligence/contacts/by-company", params={"search": TAG}, timeout=20)
    rows = r.json()["data"]["items"] if r.ok else []
    mine = next((x for x in rows if x["companyId"] == prospect_id), None)
    check("Connections: one row per company with its people count", mine is not None and mine["contactCount"] == 4,
          f"{mine['contactCount'] if mine else r.text[:120]} (3 from Apollo + 1 added by hand)")
    r = s.get(f"{args.crm}/intelligence/companies/{prospect_id}/contacts", timeout=20)
    people = r.json()["data"]["items"] if r.ok else []
    check("Connections: opening the company lists its people", len(people) == 4 and any(p["source"] == "apollo" for p in people), str(len(people)))

    print("\n7b. Scheduled signal hunt: watchlist, re-check every N days, history")
    from datetime import datetime as _dt, timedelta as _td
    import jobs.scheduler as sched

    db = SessionLocal()
    top_row = db.query(Company).filter(Company.id == prospect_id).one()
    check("added to CRM -> on the signal watchlist", top_row.watch_signals is True)
    checked_at = top_row.signals_checked_at
    check("last check recorded", checked_at is not None, str(checked_at))
    db.close()
    later = (checked_at or _dt.utcnow()) + _td(days=sched.get_settings().signals_recheck_days + 1)
    due, _fresh = sched.select_hunt_batch(now=later)
    check(f"due for a re-check after {sched.get_settings().signals_recheck_days} days", prospect_id in due)
    due_now, _ = sched.select_hunt_batch(now=checked_at + _td(hours=1))
    check("not re-checked before it's due", prospect_id not in due_now)
    # Never let the fake agent touch real companies: hunt only the dummy ones.
    real_select = sched.select_hunt_batch
    sched.select_hunt_batch = lambda now=None: tuple([i for i in ids if i in dummy_ids] for ids in real_select(now))
    try:
        first = sched.run_signals_hunt(now=later)
        second_later = later + _td(days=sched.get_settings().signals_recheck_days + 1)
        second = sched.run_signals_hunt(now=second_later)
    finally:
        sched.select_hunt_batch = real_select
    check("hunt ran the due company", first.get("ok", 0) >= 1 and second.get("ok", 0) >= 1, f"{first} / {second}")
    detail = requests.get(f"{intel_api}/v1/companies/{prospect_id}", headers=ih, timeout=15).json()
    watch = detail["signal_watch"]
    scheduled = [c for c in watch["checks"] if c["trigger"] == "scheduled"]
    check("re-check with nothing new is in the history, signals not duplicated",
          any(c["new_signals"] == 0 and (c["already_known"] or 0) >= 2 for c in scheduled), str(scheduled))
    check("a later re-check's new signal is recorded as new", any(c["new_signals"] == 1 for c in scheduled), str(scheduled))
    types = [x["type"] for x in detail["signals"]]
    check("timeline: newest find first, no duplicates", types[0] == "tender" and len(types) == len(set(types)), str(types))
    recent = requests.get(f"{intel_api}/v1/signals/recent", params={"since": checked_at.isoformat()}, headers=ih, timeout=15).json()
    check("new signals feed for CRM notifications", any(x["company_id"] == prospect_id and x["type"] == "tender" for x in recent["items"]))
    r = s.put(f"{args.crm}/intelligence/companies/{prospect_id}/watch", json={"watch": False}, timeout=20)
    check("stop tracking from the CRM", r.ok and r.json()["data"]["watching"] is False, f"HTTP {r.status_code}")

    print("\n8. CRM: follow-up loop")
    r = s.post(f"{args.crm}/inquiries/{inq_id}/touches", json={"channel": "Call", "outcome": "no_reply", "note": "E2E: no answer"}, timeout=20)
    check("log touch (no reply)", r.ok, f"HTTP {r.status_code} {r.text[:160] if not r.ok else ''}")
    inq = s.get(f"{args.crm}/inquiries/{inq_id}", timeout=20).json()["data"]
    check("first touch moves New -> Contacted", inq["stage"] == "contacted", inq["stage"])
    nfu = (inq.get("next_follow_up_date") or inq.get("nextFollowUpDate") or "")[:10]
    check("next follow-up in 5 days", bool(nfu) and nfu >= (date.today() + timedelta(days=4)).isoformat(), nfu)
    r = s.post(f"{args.crm}/inquiries/{inq_id}/touches", json={"channel": "WhatsApp", "outcome": "interested", "note": "E2E: needs 30k sq ft"}, timeout=20)
    check("log touch (interested)", r.ok, f"HTTP {r.status_code}")
    touches = s.get(f"{args.crm}/inquiries/{inq_id}/touches", timeout=20).json()["data"]
    check("touch timeline has both touches", len(touches if isinstance(touches, list) else touches.get("touches", [])) >= 2)

    print("\n9. CRM: proposal holds the space")
    r = s.post(f"{args.crm}/proposals", json={
        "inquiryId": inq_id, "companyId": added.get("companyId"), "companyName": added.get("companyName"),
        "propertyId": prop_id, "propertyName": prop["name"], "proposedAreaSqFt": 30000, "baseRentPerSqFtINR": 22,
        "leaseTenureYears": 5, "lockInMonths": 36, "escalationPercentPerYear": 5}, timeout=20)
    check("create proposal", r.status_code in (200, 201), f"HTTP {r.status_code} {r.text[:160] if not r.ok else ''}")
    p = s.get(f"{args.crm}/properties/{prop_id}", timeout=20).json()["data"]
    check("free space drops by the held 30,000 sq ft", int(float(p["availableAreaSqFt"])) == WAREHOUSE_AREA - 30000, str(p["availableAreaSqFt"]))
    cap = s.get(f"{args.crm}/properties/capacity", params={"areaSqFt": 200000}, timeout=20)
    check("capacity check answers a 2,00,000 sq ft ask", cap.ok, f"HTTP {cap.status_code}")

    print("\n10. CRM: win -> lease -> warehouse space")
    r = s.post(f"{args.crm}/inquiries/{inq_id}/win", json={
        "propertyId": prop_id, "areaSqFt": 30000, "startDate": date.today().isoformat(), "rentPerSqFtINR": 22,
        "tenureYears": 5, "lockInMonths": 36, "escalationPercent": 5, "comments": "E2E win"}, timeout=20)
    check("mark won with lease terms", r.ok, f"HTTP {r.status_code} {r.text[:160] if not r.ok else ''}")
    inq = s.get(f"{args.crm}/inquiries/{inq_id}", timeout=20).json()["data"]
    check("deal stage = won", inq["stage"] == "won", inq["stage"])
    leases = s.get(f"{args.crm}/leases", params={"propertyId": prop_id}, timeout=20).json()["data"]
    leases = leases if isinstance(leases, list) else leases.get("items", [])
    check("one active lease on the warehouse", len(leases) == 1, str(len(leases)))
    p = s.get(f"{args.crm}/properties/{prop_id}", timeout=20).json()["data"]
    check("free space = total - lease (hold converted, not double counted)", int(float(p["availableAreaSqFt"])) == WAREHOUSE_AREA - 30000,
          f"available={p['availableAreaSqFt']} leased={p.get('leasedAreaSqFt')} held={p.get('heldAreaSqFt')}")
    check("no space left on hold", int(float(p.get("heldAreaSqFt") or 0)) == 0, str(p.get("heldAreaSqFt")))

    print("\n11. CRM: Today list and AI attribution")
    r = s.get(f"{args.crm}/today", timeout=20)
    check("Today list loads", r.ok, f"HTTP {r.status_code}")
    r = s.get(f"{args.crm}/reports/ai-attribution", timeout=20)
    rep = r.json().get("data", {}) if r.ok else {}
    check("attribution report loads", r.ok, f"HTTP {r.status_code}")
    mine = [w for w in rep.get("leasedByWarehouse", []) if w.get("propertyId") == prop_id]
    check("report credits AI with the win", rep.get("ai", {}).get("won", 0) >= 1 and bool(mine),
          f"ai.won={rep.get('ai', {}).get('won')} warehouse rows={mine}")

    passed = sum(1 for _, ok, _ in results if ok)
    print(f"\n{passed}/{len(results)} checks passed")
    if args.keep:
        print(f"Dummy data kept: warehouse {prop_id}, deal {inq_id}, runs {run_id}/{run2_id}. Remove with --cleanup-only.")
    else:
        print("\nCleaning up")
        cleanup(intel_url, crm_url)
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
