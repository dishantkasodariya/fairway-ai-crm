SIGNAL_TYPES = [
    "expansion", "funding", "hiring", "regulatory", "filings",
    "tender", "lease_expiry", "import_export", "distribution", "distress",
]

# Authoritative, high-signal-to-noise domains for Indian corporate news — bias
# toward these over random blogs/aggregators when a query surfaces both.
PREFERRED_DOMAINS = [
    "economictimes.indiatimes.com", "business-standard.com", "livemint.com",
    "moneycontrol.com", "thehindubusinessline.com", "financialexpress.com",
    "pib.gov.in", "ibef.org", "vccircle.com", "entrackr.com",
    "bseindia.com", "nseindia.com",
]

SIGNAL_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "signals": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "type": {"type": "string", "enum": SIGNAL_TYPES},
                    "summary": {"type": "string", "description": "1-3 sentence factual summary with numbers where available"},
                    "date": {
                        "type": "string",
                        "description": "e.g. '2026-07', '2026', or 'recent' if only vaguely dated; 'unknown' if truly undated",
                    },
                    "source_name": {"type": "string"},
                    "source_url": {"type": "string", "description": "Required — a signal without a URL is discarded downstream"},
                    "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
                },
                "required": ["type", "summary", "date", "source_name", "source_url", "confidence"],
            },
        },
        "estimated_sqft": {
            "type": "string",
            "description": "Only fill this if a source explicitly states a warehouse/facility size in sq.ft.; otherwise empty string",
        },
    },
    "required": ["signals", "estimated_sqft"],
}

SYSTEM_PROMPT = f"""You are a lead-signal researcher for a warehouse-leasing business. Given
an Indian company, find indirect signals that it may soon need more industrial/warehouse
space, so it can be prioritized for sales outreach.

Look for these signal types specifically:
- expansion: new plant/unit/capacity announcements, greenfield/brownfield projects
- funding: equity raises, PE/VC investment, large capex approvals
- tender: government/PSU tenders won or bid on
- hiring: active recruitment drives, especially supply chain/logistics/plant roles
- regulatory: new licenses, environmental clearances, approvals (NOT closures/penalties —
  those are "distress", see below)
- import_export: new import/export activity, new trade routes, customs/DGFT filings
- distribution: new distributor/dealer network announcements
- filings: financial filings suggesting growth (raised borrowing limits, new subsidiaries)
- lease_expiry: any mention of an existing lease/facility nearing expiry
- distress: closures, penalties, show-cause notices, NCLT/IBC proceedings, plant
  suspensions — report these too, they matter, just don't confuse them with "regulatory"

Use web_search (try a few different angles: company name + "expansion", + "funding",
+ "hiring", + news site searches) and fetch_page to verify details on promising results.
Every signal MUST have a real source_url — do not report a signal without one.

Prefer these sources when a query surfaces them (reliable Indian business news/
government sources, not SEO filler): {", ".join(PREFERRED_DOMAINS)}. Use other
sources too when these don't cover a story, just weigh them with lower confidence.

You have at most 6 web_search calls — the tool stops working after that, so spend
them on your best angles rather than near-duplicate queries. Once you're out (or
you've found enough), call submit_result with whatever you found (an empty signals
list is a valid, honest answer if nothing turns up).
"""


def build_user_message(name: str, address: str, business_type: str | None) -> str:
    return (
        f"Company name: {name}\n"
        f"Address/area: {address}\n"
        f"Business type: {business_type or 'unknown'}\n\n"
        "Research recent signals (last ~18 months preferred) that this company may need "
        "more warehouse/industrial space."
    )
