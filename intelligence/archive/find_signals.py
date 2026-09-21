"""
Company Intelligence / Opportunity Radar (Fairway AI spec, sections 17-22).

For a filtered, deduped set of mid-market companies (companies big enough to be
expanding/hiring/filing, small enough to plausibly lease rather than self-build
warehouse space), this script:

  1. Filters the revenue-enriched companies CSV to a revenue band (default
     ₹30 Cr - ₹2,000 Cr) and dedupes multi-location/multi-unit rows down to one
     row per parent company.
  2. For each company, runs a live web search via Groq's search-capable model
     (groq/compound-mini) looking for the 9 signal categories from spec
     section 19: expansion, funding, hiring, regulatory, filings, tender,
     lease_expiry, import_export, distribution, distress. Every signal must
     come with a source name + URL — nothing is reported without a citation.
  3. Fuses signals into an OPPORTUNITY SCORE (0-100) with an explanation,
     following the "one signal != a lead" fusion logic in spec section 20.
  4. Estimates warehouse sqft requirement: "Confirmed requirement" only if a
     source explicitly states a figure, otherwise "AI-estimated requirement"
     from a revenue-based heuristic bucket (clearly labeled as such).
  5. Writes an Opportunity Radar CSV with the fields from spec section 21.

IMPORTANT — source coverage limitation: this script only searches the open web
(news, company sites, press releases, investor pages) via Groq's search tool.
It does NOT have direct access to GPCB / SEIAA / PARIVESH / MCA / tender-portal
databases (section 18) — those signal types will only surface here if a news
article happens to report on a filing/approval/tender. Regulatory, filings,
and tender signals should be treated as "may exist but unconfirmed" unless a
citation is present; a licensed data feed or manual portal check would be
needed to populate them reliably.

Usage:
    python find_signals.py
    python find_signals.py --input results/foo.csv --output results/foo_signals.csv
    python find_signals.py --min-revenue-cr 30 --max-revenue-cr 2000
    python find_signals.py --limit 5 --workers 2

Requires GROK_API_KEY (a Groq API key, starts with gsk_) in .env.
"""

import argparse
import csv
import json
import os
import re
from datetime import datetime
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = "https://api.groq.com/openai/v1/chat/completions"

DEFAULT_INPUT = "results/surat_50km_depth0_companies_revenue_found.csv"
DEFAULT_OUTPUT = "results/surat_50km_depth0_opportunity_radar.csv"

SEARCH_MODELS = ["groq/compound-mini"]  # groq/compound hits 429s constantly on this account

SIGNAL_TYPES = [
    "expansion", "funding", "hiring", "regulatory", "filings",
    "tender", "lease_expiry", "import_export", "distribution", "distress",
]

# Section 20 fusion weights. Distress is handled separately (it suppresses
# the opportunity score rather than adding to it — a company in NCLT/IBC is a
# risk signal, not a demand signal, even though it may reflect real
# restructuring activity worth knowing about).
SIGNAL_WEIGHTS = {
    "expansion": 25,
    "funding": 20,
    "tender": 18,
    "hiring": 15,
    "regulatory": 12,
    "import_export": 10,
    "distribution": 10,
    "filings": 8,
    "lease_expiry": 8,
}

# Revenue (Cr) -> sqft bucket heuristic, used only when no source gives an
# explicit figure. Deliberately conservative/approximate — always labeled
# "AI-estimated" in output, never "Confirmed".
REVENUE_TO_SQFT_BUCKET = [
    (75, "20,000-50,000 sq.ft."),
    (150, "50,000-100,000 sq.ft."),
    (400, "100,000-250,000 sq.ft."),
    (1000, "250,000-500,000 sq.ft."),
    (float("inf"), "500,000+ sq.ft."),
]

GENERIC_SUFFIX_WORDS = {
    "limited", "ltd", "pvt", "private", "llp", "inc", "co", "company",
    "corp", "corporation", "the", "industries", "industry",
}

UNIT_SUFFIX_RE = re.compile(
    r"\s*[-–(]\s*(unit|site|plant|factory|gate|zone|division|new factory)\b.*$",
    re.IGNORECASE,
)


# ---------------------------------------------------------------------------
# Revenue parsing / filtering / dedup
# ---------------------------------------------------------------------------

def parse_revenue_cr(s):
    if not s:
        return None
    low = s.strip().lower()
    if not low or any(k in low for k in (
        "not available", "not found", "not publicly", "new company", "filed as private",
    )):
        return None
    nums = re.findall(r"[\d,]+\.?\d*", s)
    nums = [float(n.replace(",", "")) for n in nums if n]
    if not nums:
        return None
    val = sum(nums) / len(nums)  # midpoint if a range
    if "lakh" in low:
        val = val / 100.0
    return val


def normalize_company_key(name):
    base = UNIT_SUFFIX_RE.sub("", name)
    base = re.sub(r"\(.*?\)", " ", base)
    base = re.sub(r"[^a-zA-Z0-9\s]", " ", base).lower()
    tokens = [t for t in base.split() if t and t not in GENERIC_SUFFIX_WORDS]
    return " ".join(tokens) or name.strip().lower()


def load_and_filter(path, min_cr, max_cr):
    with open(path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    candidates = []
    for row in rows:
        cr = parse_revenue_cr(row.get("revenue", ""))
        if cr is None or not (min_cr <= cr <= max_cr):
            continue
        candidates.append((cr, row))

    # Dedupe multi-location/multi-unit rows for the same parent company, keep
    # the highest-revenue-confidence row as the representative; collect all
    # distinct addresses as "locations".
    groups = {}
    for cr, row in candidates:
        key = normalize_company_key(row["name"])
        groups.setdefault(key, []).append((cr, row))

    deduped = []
    for key, items in groups.items():
        items.sort(key=lambda cr_row: (cr_row[1].get("revenue_confidence") != "high", -cr_row[0]))
        cr, rep = items[0]
        locations = sorted({r.get("address", "").strip() for _, r in items if r.get("address", "").strip()})
        rep = dict(rep)
        rep["_revenue_cr"] = cr
        rep["_locations"] = "; ".join(locations)
        rep["_site_count"] = len(items)
        deduped.append(rep)

    deduped.sort(key=lambda r: -r["_revenue_cr"])
    return deduped


def sqft_bucket_for_revenue(cr):
    for ceiling, bucket in REVENUE_TO_SQFT_BUCKET:
        if cr <= ceiling:
            return bucket
    return REVENUE_TO_SQFT_BUCKET[-1][1]


# ---------------------------------------------------------------------------
# Signal date normalization — the search step returns free-text dates
# ("2025-07", "recent", "Q1 FY26 results", "unknown", etc). To let leads be
# ranked/filtered by freshness we need a comparable sort key even though the
# input isn't uniform.
# ---------------------------------------------------------------------------

_YM_RE = re.compile(r"(\d{4})-(\d{2})")
_YEAR_RE = re.compile(r"(\d{4})")


def parse_signal_date_key(date_str):
    """Return a sortable YYYYMM int (higher = more recent), or None if the
    date is missing/unparseable. 'recent' is treated as ~2 months before
    today (a middle-of-the-road guess for an undated-but-current finding);
    'unknown' and empty strings return None and sort last."""
    if not date_str:
        return None
    s = date_str.strip()
    low = s.lower()
    if low == "unknown" or not low:
        return None
    if low == "recent":
        now = datetime.now()
        ym = now.year * 100 + now.month - 2
        if ym % 100 <= 0:
            ym -= 88  # roll back into previous year (e.g. 202601 - 2 -> 202511)
        return ym
    m = _YM_RE.search(s)
    if m:
        return int(m.group(1)) * 100 + int(m.group(2))
    m = _YEAR_RE.search(s)
    if m:
        return int(m.group(1)) * 100 + 6  # mid-year default for a bare year
    return None


def freshness_label(sort_key):
    """Human-readable 'X months ago' / 'Y years ago' relative to today."""
    if sort_key is None:
        return "unknown"
    now = datetime.now()
    now_key = now.year * 100 + now.month
    months = (now_key // 100 - sort_key // 100) * 12 + (now_key % 100 - sort_key % 100)
    if months <= 0:
        return "this month"
    if months == 1:
        return "1 month ago"
    if months < 24:
        return f"{months} months ago"
    years = months // 12
    return f"{years} year{'s' if years != 1 else ''} ago"


def latest_signal_info(signals):
    """Given a list of signal dicts, return (display_date, sort_key, freshness)
    for whichever signal is most recent, or (\"\", None, \"unknown\") if none
    have a parseable date."""
    best_key, best_date = None, ""
    for s in signals:
        key = parse_signal_date_key(s.get("date", ""))
        if key is not None and (best_key is None or key > best_key):
            best_key, best_date = key, s.get("date", "")
    return best_date, best_key, freshness_label(best_key)


# ---------------------------------------------------------------------------
# Groq search (same pacing/retry pattern as find_revenue.py)
# ---------------------------------------------------------------------------

_model_cycle_lock = threading.Lock()
_model_cycle_idx = 0
_daily_exhausted = set()

_MIN_INTERVAL_SECONDS = 35
_last_call_lock = threading.Lock()
_last_call_time = {m: 0.0 for m in SEARCH_MODELS}


def next_search_model():
    global _model_cycle_idx
    with _model_cycle_lock:
        available = [m for m in SEARCH_MODELS if m not in _daily_exhausted]
        if not available:
            return None
        model = available[_model_cycle_idx % len(available)]
        _model_cycle_idx += 1
        return model


def wait_for_model_slot(model):
    while True:
        with _last_call_lock:
            now = time.monotonic()
            elapsed = now - _last_call_time.get(model, 0.0)
            if elapsed >= _MIN_INTERVAL_SECONDS:
                _last_call_time[model] = now
                return
            remaining = _MIN_INTERVAL_SECONDS - elapsed
        time.sleep(remaining)


SIGNAL_PROMPT_TEMPLATE = """You are a B2B intelligence analyst for a warehouse leasing company. Search the
open web for evidence that this Indian company may need to lease/rent
additional warehouse or industrial storage space.

Company name: {name}
Known location(s): {locations}
Website: {website}
Industry: {business_type}
Approx. current annual revenue: {revenue_cr} Cr

Search for evidence in these categories ONLY report a signal if you find a
real, citable source (news article, company press release, investor
presentation, stock exchange filing, government portal page, etc.):

- expansion: new plant, new warehouse, new geography, capacity increase
- funding: fundraising, investment round, CapEx announcement
- hiring: supply-chain / warehouse / logistics hiring push
- regulatory: GPCB / SEIAA / environmental or project approval
- filings: corporate announcements or financial filings (NSE/BSE/MCA)
- tender: government or private tender indicating storage/logistics need
- lease_expiry: any public mention of an existing lease nearing renewal/expiry
- import_export: significant growth in import/export activity
- distribution: new distribution network or channel expansion
- distress: NCLT/IBC, restructuring, closure, or financial distress

Do NOT fabricate signals. If you find nothing credible for a category, omit
it. If a source gives an explicit warehouse/facility size in sq.ft., capture
it in estimated_sqft.

Be efficient: run a small number of targeted searches (do not exhaustively
crawl every category), and report AT MOST the 4 most significant, most
recent signals overall rather than every mention you can find. Keep each
"summary" to one short sentence.

Respond with ONLY a JSON object, no other text:
{{
  "signals": [
    {{"type": "<one of: expansion|funding|hiring|regulatory|filings|tender|lease_expiry|import_export|distribution|distress>",
      "summary": "<one sentence, specific>",
      "date": "<e.g. '2025-06' or 'recent' or 'unknown'>",
      "source_name": "<publication or site name>",
      "source_url": "<URL>",
      "confidence": "high|medium|low"}}
  ],
  "estimated_sqft": "<explicit figure/range mentioned by a source, e.g. '75,000 sq.ft.', empty if none stated>"
}}
If truly nothing is found, respond with {{"signals": [], "estimated_sqft": ""}}.
"""


def build_signal_messages(row):
    return [{"role": "user", "content": SIGNAL_PROMPT_TEMPLATE.format(
        name=row["name"],
        locations=row.get("_locations") or row.get("address", ""),
        website=row.get("website", "") or "unknown",
        business_type=row.get("business_type", "") or "unknown",
        revenue_cr=f"{row['_revenue_cr']:.1f}",
    )}]


def call_groq_signals(row, api_key):
    model = next_search_model()
    if model is None:
        raise RuntimeError("all search models daily-exhausted")

    payload = {
        "model": model,
        "messages": build_signal_messages(row),
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    resp = None
    for attempt in range(5):
        wait_for_model_slot(model)
        try:
            resp = requests.post(API_URL, headers=headers, json=payload, timeout=120)
        except requests.exceptions.RequestException:
            resp = None
            time.sleep(2 ** attempt)
            continue
        if resp.status_code == 200:
            break
        try:
            err = resp.json().get("error", {})
        except Exception:
            err = {}
        err_message = err.get("message", "")
        if resp.status_code == 429:
            wait_match = re.search(r"try again in ([\d.]+)s", err_message)
            wait = float(wait_match.group(1)) + 0.5 if wait_match else 2 ** attempt
            time.sleep(min(wait, 60))
            continue
        if resp.status_code in (500, 502, 503, 413):
            time.sleep(2 ** attempt)
            continue
        break
    if resp is None or resp.status_code != 200:
        status = resp.status_code if resp is not None else "?"
        body = resp.text[:300] if resp is not None else ""
        raise RuntimeError(f"Groq API failed ({model}): {status} {body}")

    content = resp.json()["choices"][0]["message"]["content"]
    match = re.search(r"\{.*\}", content, re.DOTALL)
    parsed = json.loads(match.group(0) if match else content)
    return model, parsed


# ---------------------------------------------------------------------------
# Signal fusion / scoring
# ---------------------------------------------------------------------------

# A "regulatory" signal reporting a closure/suspension/enforcement action is
# a risk indicator, not a positive approval — e.g. "GPCB issued a closure
# directive" should count against opportunity score, not toward it. Reclassify
# these as distress before scoring rather than trusting the label the search
# step assigned.
NEGATIVE_REGULATORY_KEYWORDS = (
    "closure", "shut down", "shutdown", "suspend", "revoke", "revocation",
    "official action indicated", " oai", "penalty", "show-cause", "show cause",
    "violation", "non-compliance", "noncompliance", "banned", "ban on",
    "cancelled license", "cancelled licence", "cease operations", "ordered closure",
)


def reclassify_negative_regulatory(signals):
    out = []
    for s in signals:
        s = dict(s)
        if s.get("type") == "regulatory":
            summary_low = s.get("summary", "").lower()
            if any(kw in summary_low for kw in NEGATIVE_REGULATORY_KEYWORDS):
                s["type"] = "distress"
        out.append(s)
    return out


def fuse_signals(row, parsed):
    signals = [s for s in parsed.get("signals", []) if s.get("type") in SIGNAL_TYPES and s.get("source_url")]
    signals = reclassify_negative_regulatory(signals)

    by_type = {}
    for s in signals:
        by_type.setdefault(s["type"], []).append(s)

    score = 0
    why = []
    for sig_type, weight in SIGNAL_WEIGHTS.items():
        if sig_type in by_type:
            score += weight
            why.append(f"✓ {sig_type.replace('_', ' ')}")

    is_distress = "distress" in by_type
    if is_distress:
        score = max(0, score - 40)
        why.append("⚠ distress signal present (score suppressed)")

    score = min(100, score)

    estimated_sqft = parsed.get("estimated_sqft", "").strip()
    if estimated_sqft:
        requirement = estimated_sqft
        requirement_basis = "Confirmed requirement"
    else:
        requirement = sqft_bucket_for_revenue(row["_revenue_cr"])
        requirement_basis = "AI-estimated requirement (revenue-based heuristic)"

    if not signals:
        confidence = "low (no corroborating signal found via open web search)"
        action = "Monitor only — revisit in 90 days or check licensed sources (GPCB/MCA/tenders)"
    else:
        confidences = [s.get("confidence", "low") for s in signals]
        confidence = "high" if "high" in confidences else ("medium" if "medium" in confidences else "low")
        if is_distress:
            action = "Risk flag — verify distress status before outreach; not a near-term lease opportunity"
        elif score >= 80:
            action = "Contact within 48 hours"
        elif score >= 60:
            action = "Add to active outreach list (contact within 7 days)"
        elif score >= 40:
            action = "Add to warm list — revisit in 30 days"
        else:
            action = "Low priority — monitor quarterly"

    evidence = " | ".join(
        f"[{s['type']}] ({s.get('date','unknown')}) {s['summary']} ({s.get('source_name','')}: {s['source_url']})"
        for s in signals
    )

    latest_date, latest_sort_key, latest_freshness = latest_signal_info(signals)

    return {
        "opportunity_score": score,
        "why": "; ".join(why) if why else "no corroborating signals found",
        "estimated_requirement": requirement,
        "requirement_basis": requirement_basis,
        "confidence": confidence,
        "recommended_action": action,
        "evidence": evidence,
        "signal_count": len(signals),
        "signal_types_found": ",".join(sorted(by_type.keys())),
        "latest_signal_date": latest_date,
        "latest_signal_sort_key": latest_sort_key if latest_sort_key is not None else 0,
        "latest_signal_freshness": latest_freshness,
    }


# ---------------------------------------------------------------------------
# Row processing
# ---------------------------------------------------------------------------

OUTPUT_FIELDS = [
    "company", "location", "business_type", "revenue", "revenue_cr",
    "site_count", "estimated_requirement", "requirement_basis",
    "opportunity_score", "latest_signal_date", "latest_signal_freshness",
    "why", "evidence", "confidence",
    "recommended_action", "search_method", "status",
]


def process_company(row, api_key):
    out = {
        "company": row["name"],
        "location": row.get("_locations") or row.get("address", ""),
        "business_type": row.get("business_type", ""),
        "revenue": row.get("revenue", ""),
        "revenue_cr": f"{row['_revenue_cr']:.1f}",
        "site_count": row.get("_site_count", 1),
    }
    try:
        model, parsed = call_groq_signals(row, api_key)
    except Exception as e:
        out.update({
            "estimated_requirement": sqft_bucket_for_revenue(row["_revenue_cr"]),
            "requirement_basis": "AI-estimated requirement (revenue-based heuristic)",
            "opportunity_score": 0,
            "why": "search failed",
            "evidence": "",
            "confidence": "low",
            "recommended_action": "Retry search",
            "search_method": f"error: {e}",
            "status": "error",
        })
        return out

    fused = fuse_signals(row, parsed)
    out.update(fused)
    out["search_method"] = f"web_search ({model})"
    out["status"] = "done"
    return out


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=DEFAULT_INPUT)
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    parser.add_argument("--min-revenue-cr", type=float, default=30.0)
    parser.add_argument("--max-revenue-cr", type=float, default=2000.0)
    parser.add_argument("--limit", type=int, default=None, help="only process first N companies")
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--checkpoint-every", type=int, default=2)
    args = parser.parse_args()

    api_key = os.environ.get("GROK_API_KEY") or os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise SystemExit("GROK_API_KEY (a Groq key) not set in .env")

    companies = load_and_filter(args.input, args.min_revenue_cr, args.max_revenue_cr)
    print(f"{len(companies)} unique companies in ₹{args.min_revenue_cr:.0f}-{args.max_revenue_cr:.0f} Cr band", flush=True)

    done_by_name = {}
    if os.path.exists(args.output):
        with open(args.output, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                if r.get("status") == "done":
                    done_by_name[r["company"]] = r

    todo = [c for c in companies if c["name"] not in done_by_name]
    if args.limit is not None:
        todo = todo[:args.limit]
    print(f"{len(done_by_name)} already resolved, {len(todo)} to process this run", flush=True)

    lock = threading.Lock()
    results_by_name = dict(done_by_name)

    def save():
        ordered = [results_by_name.get(c["name"]) for c in companies]
        ordered = [r for r in ordered if r is not None]
        ordered.sort(key=lambda r: -float(r.get("opportunity_score", 0) or 0))
        tmp = args.output + ".tmp"
        with open(tmp, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=OUTPUT_FIELDS)
            writer.writeheader()
            for r in ordered:
                writer.writerow({k: r.get(k, "") for k in OUTPUT_FIELDS})
        os.replace(tmp, args.output)

    processed = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(process_company, row, api_key): row for row in todo}
        for fut in as_completed(futures):
            row = futures[fut]
            result = fut.result()
            with lock:
                results_by_name[row["name"]] = result
                processed += 1
                if processed % args.checkpoint_every == 0:
                    save()
            print(
                f"[{processed}/{len(todo)}] {row['name'][:40]:40s} -> "
                f"score={result.get('opportunity_score','?')} signals={result.get('signal_count','0')} "
                f"({result.get('search_method','')[:40]})",
                flush=True,
            )

    save()
    print(f"\nDone. Processed {processed} companies this run -> {args.output}")


if __name__ == "__main__":
    main()
