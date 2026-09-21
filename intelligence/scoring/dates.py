"""
Signal-date normalization — turns mixed date strings ("2025-07", "2025",
"recent", "unknown") into a comparable YYYYMM sort key, so opportunity
signals can be sorted/filtered by recency. Ported verbatim from the
original find_signals.py logic.
"""

import re
from datetime import datetime

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
    """Given a list of signal dicts (each with a 'date' key), return
    (display_date, sort_key, freshness) for whichever is most recent, or
    ("", None, "unknown") if none have a parseable date."""
    best_key, best_date = None, ""
    for s in signals:
        key = parse_signal_date_key(s.get("date", ""))
        if key is not None and (best_key is None or key > best_key):
            best_key, best_date = key, s.get("date", "")
    return best_date, best_key, freshness_label(best_key)
