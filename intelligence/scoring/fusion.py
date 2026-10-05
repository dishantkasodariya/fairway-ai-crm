"""
Deterministic signal fusion + opportunity scoring. Ported verbatim (logic
unchanged) from the original find_signals.py — this stays deterministic and
auditable by design: the LLM agent finds and describes signals, but the
score itself is plain arithmetic a CRM user can verify.
"""

from scoring.dates import latest_signal_info

SIGNAL_TYPES = [
    "expansion", "funding", "hiring", "regulatory", "filings",
    "tender", "lease_expiry", "import_export", "distribution", "distress",
]

# Distress is handled separately (it suppresses the opportunity score rather
# than adding to it — a company in NCLT/IBC is a risk signal, not a demand
# signal, even though it may reflect real restructuring activity worth
# knowing about).
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

# Regulatory findings describing closures/enforcement are demand-risk, not
# demand-signal — reclassified as "distress" before scoring rather than
# trusting whatever label the research step assigned.
NEGATIVE_REGULATORY_KEYWORDS = (
    "closure", "shut down", "shutdown", "suspend", "revoke", "revocation",
    "official action indicated", " oai", "penalty", "show-cause", "show cause",
    "violation", "non-compliance", "noncompliance", "banned", "ban on",
    "cancelled license", "cancelled licence", "cease operations", "ordered closure",
)


def sqft_bucket_for_revenue(cr):
    for ceiling, bucket in REVENUE_TO_SQFT_BUCKET:
        if cr <= ceiling:
            return bucket
    return REVENUE_TO_SQFT_BUCKET[-1][1]


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


CONFIRMED_BASIS = "Confirmed requirement"


def merge_requirement(
    existing_requirement: str | None,
    existing_basis: str | None,
    new_requirement: str,
    new_basis: str,
) -> tuple[str, str]:
    """A confirmed (cited) space requirement is kept when a later research pass only
    produced a revenue-based estimate or nothing — a guess must not replace a fact.
    A newly confirmed figure always wins."""
    if new_basis != CONFIRMED_BASIS and existing_basis == CONFIRMED_BASIS and existing_requirement:
        return existing_requirement, existing_basis
    return new_requirement, new_basis


def fuse_signals(revenue_cr: float | None, signals: list[dict], estimated_sqft: str = "") -> dict:
    """signals: list of dicts with type/summary/date/source_name/source_url/confidence."""
    signals = [s for s in signals if s.get("type") in SIGNAL_TYPES and s.get("source_url")]
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

    estimated_sqft = (estimated_sqft or "").strip()
    if estimated_sqft:
        requirement = estimated_sqft
        requirement_basis = CONFIRMED_BASIS
    elif revenue_cr is not None:
        requirement = sqft_bucket_for_revenue(revenue_cr)
        requirement_basis = "AI-estimated requirement (revenue-based heuristic)"
    else:
        requirement = "Unknown (no revenue data)"
        requirement_basis = "Unavailable"

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

    latest_date, latest_sort_key, latest_freshness = latest_signal_info(signals)

    return {
        "opportunity_score": score,
        "why": "; ".join(why) if why else "no corroborating signals found",
        "estimated_requirement": requirement,
        "requirement_basis": requirement_basis,
        "confidence": confidence,
        "recommended_action": action,
        "signal_count": len(signals),
        "signal_types_found": ",".join(sorted(by_type.keys())),
        "latest_signal_date": latest_date,
        "latest_signal_sort_key": latest_sort_key,
        "latest_signal_freshness": latest_freshness,
    }
