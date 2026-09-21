PREFERRED_DOMAINS = [
    "thecompanycheck.com", "tracxn.com", "tofler.in", "screener.in",
    "mycorporateinfo.com", "corpintel.io", "infyner.com", "gstpan.com",
    "allindiaitr.com", "marketscreener.com", "scanx.trade", "bseindia.com",
    "stockanalysis.com", "business-standard.com",
]

REVENUE_OUTPUT_SCHEMA = {
    "type": "object",
    "properties": {
        "found": {"type": "boolean"},
        "revenue_display": {
            "type": "string",
            "description": "e.g. '₹48.11 Lakh' or '₹263 Cr'; empty string if not found",
        },
        "revenue_cr": {
            "type": ["number", "null"],
            "description": "Revenue converted to INR Crore, or null if not found",
        },
        "fiscal_year": {"type": "string", "description": "e.g. 'FY 2024-25'; empty if not found"},
        "source_name": {"type": "string"},
        "source_url": {"type": "string"},
        "confidence": {"type": "string", "enum": ["high", "medium", "low"]},
    },
    "required": ["found", "revenue_display", "revenue_cr", "fiscal_year", "source_name", "source_url", "confidence"],
}

SYSTEM_PROMPT = f"""You are a financial research assistant finding the most recent annual
revenue for an Indian company, to qualify it as a warehouse-leasing lead.

Use web_search and fetch_page to find the number, then call submit_result. Search at
most 3 times — if you can't find a confident number by then, submit your best
partial finding with confidence "low" rather than searching indefinitely.

Prefer these sources if the company appears on them (they index Indian MCA/company
filings and financial results): {", ".join(PREFERRED_DOMAINS)}.
If not found on those, use any other reliable source (news, stock exchange filing,
company press release, MCA/Tofler-style aggregator).

Convert whatever unit the source reports into INR Crore for revenue_cr (1 Crore =
100 Lakh = 10,000,000). If you cannot find any revenue figure, set found=false,
revenue_cr=null, and leave the string fields empty.
"""


def build_user_message(name: str, address: str, website: str | None) -> str:
    website_line = f"Known website: {website}" if website else ""
    return (
        f"Company name: {name}\n"
        f"Address/area: {address}\n"
        f"{website_line}\n\n"
        "Find the most recent annual revenue for this company."
    )
