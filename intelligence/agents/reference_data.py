"""
Parsing + fuzzy matching against data/company_revenue_reference.md — the
hand-curated revenue table. Checked first (free, instant, highest trust)
before falling back to the Revenue Agent's live search. Ported from the
original find_revenue.py.
"""

import re

GENERIC_SUFFIX_WORDS = {
    "limited", "ltd", "pvt", "private", "llp", "inc", "co", "company",
    "corp", "corporation", "the",
}
SKIP_SECTIONS = {"entries in your list that are not standalone companies", "appendix"}

_LINK_RE = re.compile(r"\[(.*?)\]\((.*?)\)")


def parse_reference_table(path):
    """Extract (company, revenue, fiscal_year, source_name, source_url) records
    from every 4-column `| Company | Revenue | Fin. Year | Source |` table in
    the markdown file, skipping the exclusion table and appendix."""
    records = []
    section = ""

    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if line.startswith("## "):
                section = re.sub(r"[^\w\s]", "", line[3:]).strip().lower()
                continue
            if any(skip in section for skip in SKIP_SECTIONS):
                continue
            if not line.startswith("|"):
                continue
            cells = [c.strip() for c in line.strip("|").split("|")]
            if len(cells) != 4:
                continue
            company, revenue, year, source = cells
            if company in ("Company", "---") or set(company) <= {"-", " "}:
                continue
            if re.fullmatch(r"-+", company):
                continue

            match = _LINK_RE.search(source)
            if match:
                source_name, source_url = match.group(1), match.group(2)
            else:
                source_name, source_url = source, ""

            records.append(
                {
                    "company": company,
                    "revenue": revenue,
                    "fiscal_year": year,
                    "source_name": source_name,
                    "source_url": source_url,
                }
            )
    return records


def normalize_name(name):
    name = re.sub(r"\(.*?\)", " ", name)  # drop parenthetical plant/unit notes
    name = re.sub(r"[⚠️🟢]", " ", name)
    name = re.sub(r"[^a-zA-Z0-9\s]", " ", name).lower()
    tokens = [t for t in name.split() if t and t not in GENERIC_SUFFIX_WORDS]
    return tokens


def build_reference_index(records):
    index = []
    for r in records:
        tokens = normalize_name(r["company"])
        if tokens:
            index.append((set(tokens), r))
    return index


def parse_revenue_cr(s):
    """Parse a free-text revenue string (e.g. '₹450 Cr', '₹48.11 Lakh', a
    'X-Y Cr' range) into a float in INR Crore, or None if unparseable."""
    if not s:
        return None
    low = s.strip().lower()
    if not low or any(
        k in low for k in ("not available", "not found", "not publicly", "new company", "filed as private")
    ):
        return None
    nums = re.findall(r"[\d,]+\.?\d*", s)
    nums = [float(n.replace(",", "")) for n in nums if n]
    if not nums:
        return None
    val = sum(nums) / len(nums)  # midpoint if a range
    if "lakh" in low:
        val = val / 100.0
    return val


def find_reference_match(company_name, index, min_overlap=0.7):
    query_tokens = set(normalize_name(company_name))
    if not query_tokens:
        return None
    best, best_score = None, 0.0
    for tokens, record in index:
        if not tokens:
            continue
        shared = query_tokens & tokens
        if not shared:
            continue
        score = len(shared) / min(len(query_tokens), len(tokens))
        if score > best_score and any(len(t) > 3 for t in shared):
            best_score, best = score, record
    if best_score >= min_overlap:
        return best, best_score
    return None
