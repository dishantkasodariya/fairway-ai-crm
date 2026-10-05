"""
Group one company's many sites (plants, gates, units) into one account.

Google Places returns every gate and plant of a big company as its own place
("Reliance Industries Limited Gate 5A", "Aether Industries Limited - Site - II").
Each stays its own row (it has its own location and warehouse links), but the
children point at one parent via companies.parent_company_id so lists show one
account with a site count.

Deliberately conservative — a wrong merge hides a real prospect:
- Text after the legal suffix ("... Limited Gate 5A", "... Ltd. Sayakha") or a
  trailing site word ("Site - II", "Gate No 20A", "Plant") is a site.
- A " - Something" suffix that isn't a site word is a different business
  ("JK Lakshmi Cement Ltd. - Ganesh Trading" is a dealer, not a plant).
- A group needs at least one real website, and all websites must be the same
  domain; members on a different domain form their own group.
"""

import re
from collections import defaultdict
from urllib.parse import urlparse

LEGAL_SUFFIX = re.compile(r"\b(limited|ltd|pvt|private|llp|inc|incorporated|corporation|corp)\b")
SITE_WORDS = re.compile(
    r"\b(site|unit|plant|gate|works|factory|division|phase|campus|godown|warehouse|no|backside|main|rear|"
    r"[ivx]{1,4}|\d+[a-z]?)\b"
)
SEPARATOR = re.compile(r"\s+[-–|]\s+|\s*\(")
# Website hosts that say nothing about who the company is.
GENERIC_HOSTS = {
    "facebook.com", "instagram.com", "linkedin.com", "indiamart.com", "justdial.com",
    "business.site", "sites.google.com", "google.com", "wa.me", "tradeindia.com",
}


def website_domain(url: str | None) -> str | None:
    if not url:
        return None
    try:
        host = urlparse(url if re.match(r"^https?://", url, re.I) else f"https://{url}").hostname or ""
    except ValueError:
        return None
    host = host.lower().removeprefix("www.")
    if not host or any(host == g or host.endswith("." + g) for g in GENERIC_HOSTS):
        return None
    return host


def _clean(text: str) -> str:
    text = text.lower().replace("&", " ")
    text = re.sub(r"[^a-z0-9 ]", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def _is_site_qualifier(text: str) -> bool:
    """True when every word is a site word ("site ii", "gate no 18", "unit 2")."""
    words = _clean(text)
    return bool(words) and not SITE_WORDS.sub(" ", words).strip()


def account_key(name: str) -> str | None:
    """The company name with its site qualifier removed, or None when the name
    carries a suffix that marks a different business (so it's never grouped)."""
    parts = SEPARATOR.split(name or "", maxsplit=1)
    base = parts[0]
    if len(parts) > 1 and not _is_site_qualifier(parts[1]):
        return None

    cleaned = _clean(base)
    legal = LEGAL_SUFFIX.search(cleaned)
    if legal:
        # Everything after "Limited"/"Ltd" is a location: "... Ltd. Sayakha", "... Limited Gate 5A".
        cleaned = cleaned[: legal.start()]
    else:
        # No legal suffix: only strip trailing site words ("L&T Gate No 20A", "XYZ Plant").
        words = cleaned.split()
        while words and SITE_WORDS.fullmatch(words[-1]):
            words.pop()
        cleaned = " ".join(words)

    cleaned = cleaned.strip()
    return cleaned if len(cleaned) >= 3 else None


def plan_groups(companies: list[dict]) -> list[list[dict]]:
    """companies: dicts with id, name, website, parent_company_id, and optionally
    score / has_revenue (used to pick the main row).
    Returns groups of 2+ companies that are one account (first item = parent)."""
    by_key: dict[str, list[dict]] = defaultdict(list)
    for c in companies:
        key = account_key(c["name"])
        if key:
            by_key[key].append(c)

    groups: list[list[dict]] = []
    for members in by_key.values():
        if len(members) < 2:
            continue
        by_domain: dict[str, list[dict]] = defaultdict(list)
        no_site = []
        for c in members:
            d = website_domain(c.get("website"))
            (by_domain[d] if d else no_site).append(c)
        if not by_domain:
            continue  # no website anywhere: too weak to merge
        if len(by_domain) == 1:
            domain_groups = [next(iter(by_domain.values())) + no_site]
        else:
            # Different domains under one name: group each domain separately; members
            # without a website are ambiguous and stay standalone.
            domain_groups = list(by_domain.values())
        for g in domain_groups:
            if len(g) >= 2:
                groups.append(_order_with_parent_first(g))
    return groups


def _order_with_parent_first(group: list[dict]) -> list[dict]:
    ids = {c["id"] for c in group}
    # Keep an existing parent so CRM links and bookmarks stay stable.
    existing = [c for c in group if c.get("parent_company_id") is None
                and any(o.get("parent_company_id") == c["id"] for o in group)]
    if existing:
        parent = existing[0]
    else:
        # The account opens on its main row, so prefer the best-researched site (highest
        # opportunity score, then revenue found), then one with a website, then the
        # plainest (shortest) name, then the oldest.
        parent = min(group, key=lambda c: (
            -(c.get("score") if c.get("score") is not None else -1),
            not c.get("has_revenue"),
            website_domain(c.get("website")) is None,
            len(c["name"]),
            c["id"],
        ))
    assert parent["id"] in ids
    return [parent] + [c for c in group if c["id"] != parent["id"]]


def apply_site_groups(db) -> dict:
    """Recompute groups over every company and write parent_company_id/site_count.
    Idempotent; keeps existing parents; a company no longer in a group is ungrouped.
    Caller commits."""
    # local import keeps the planner importable without a DB
    from app.db.models import Company, OpportunityScore, RevenueSnapshot

    companies = db.query(Company).all()
    by_id = {c.id: c for c in companies}
    scores = dict(db.query(OpportunityScore.company_id, OpportunityScore.score).all())
    with_revenue = {cid for (cid,) in db.query(RevenueSnapshot.company_id).distinct()}
    groups = plan_groups([
        {
            "id": c.id, "name": c.name, "website": c.website, "parent_company_id": c.parent_company_id,
            "score": scores.get(c.id), "has_revenue": c.id in with_revenue,
        }
        for c in companies
    ])

    want_parent: dict[int, int | None] = {c.id: None for c in companies}
    want_sites: dict[int, int] = {}
    for g in groups:
        parent_id = g[0]["id"]
        want_sites[parent_id] = len(g)
        for child in g[1:]:
            want_parent[child["id"]] = parent_id

    changed = 0
    for cid, parent_id in want_parent.items():
        c = by_id[cid]
        sites = want_sites.get(cid, 1)
        if c.parent_company_id != parent_id or (c.site_count or 1) != sites:
            c.parent_company_id = parent_id
            c.site_count = sites
            changed += 1
    return {"groups": len(groups), "sites_grouped": sum(len(g) - 1 for g in groups), "rows_changed": changed}
