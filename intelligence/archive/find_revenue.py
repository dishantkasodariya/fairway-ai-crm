"""
Find revenue + fiscal year + source for companies in a classified companies CSV
(e.g. results/surat_50km_depth0_companies_selected_types.csv).

Two-stage lookup per company:
  1. Fuzzy-match against the company/revenue tables already extracted in
     tp_resources.md (verified data with sources) — free, no API call.
  2. For anything unmatched, live web search via Groq's search-capable models
     (groq/compound, groq/compound-mini — the only two Groq models with real
     web search tool-use). Calls round-robin across both models in parallel
     threads so we use two separate rate-limit/quota buckets instead of one.
     The prompt biases toward the same trusted sources tp_resources.md already
     uses (thecompanycheck.com, tracxn.com, tofler.in, screener.in, etc.) but
     allows any other source if that's what search turns up.

Plain (non-search) Groq models are deliberately NOT used as a fallback here —
they have no way to look up a specific private company's actual revenue and
would just be guessing, which is not acceptable for financial figures. If both
search models are exhausted/unavailable, the row is left for a future run
rather than filled with a fabricated number.

Usage:
    python find_revenue.py
    python find_revenue.py --input results/foo.csv --output results/foo_revenue.csv
    python find_revenue.py --limit 20 --workers 4

Requires GROK_API_KEY (a Groq API key, starts with gsk_) in .env.
"""

import argparse
import csv
import json
import os
import re
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from dotenv import load_dotenv

load_dotenv()

API_URL = "https://api.groq.com/openai/v1/chat/completions"

DEFAULT_INPUT = "results/surat_50km_depth0_companies_selected_types.csv"
DEFAULT_OUTPUT = "results/surat_50km_depth0_companies_with_revenue.csv"
DEFAULT_TP_RESOURCES = "tp_resources.md"

SEARCH_MODELS = ["groq/compound-mini"]  # groq/compound hits 429s constantly on this account

PREFERRED_DOMAINS = [
    "thecompanycheck.com", "tracxn.com", "tofler.in", "screener.in",
    "mycorporateinfo.com", "corpintel.io", "infyner.com", "gstpan.com",
    "allindiaitr.com", "marketscreener.com", "scanx.trade", "bseindia.com",
    "stockanalysis.com", "business-standard.com",
]

GENERIC_SUFFIX_WORDS = {
    "limited", "ltd", "pvt", "private", "llp", "inc", "co", "company",
    "corp", "corporation", "the",
}

SKIP_SECTIONS = {"entries in your list that are not standalone companies", "appendix"}


# ---------------------------------------------------------------------------
# tp_resources.md parsing + fuzzy matching
# ---------------------------------------------------------------------------

def parse_tp_resources(path):
    """Extract (company, revenue, fiscal_year, source_name, source_url) records
    from every 4-column `| Company | Revenue | Fin. Year | Source |` table in
    the markdown file, skipping the exclusion table and appendix."""
    records = []
    section = ""
    link_re = re.compile(r"\[(.*?)\]\((.*?)\)")

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

            match = link_re.search(source)
            if match:
                source_name, source_url = match.group(1), match.group(2)
            else:
                source_name, source_url = source, ""

            records.append({
                "company": company,
                "revenue": revenue,
                "fiscal_year": year,
                "source_name": source_name,
                "source_url": source_url,
            })
    return records


def normalize_name(name):
    name = re.sub(r"\(.*?\)", " ", name)  # drop parenthetical plant/unit notes
    name = re.sub(r"[⚠️🟢]", " ", name)
    name = re.sub(r"[^a-zA-Z0-9\s]", " ", name).lower()
    tokens = [t for t in name.split() if t and t not in GENERIC_SUFFIX_WORDS]
    return tokens


def build_tp_index(records):
    index = []
    for r in records:
        tokens = normalize_name(r["company"])
        if tokens:
            index.append((set(tokens), r))
    return index


def find_tp_match(company_name, tp_index, min_overlap=0.7):
    query_tokens = set(normalize_name(company_name))
    if not query_tokens:
        return None
    best, best_score = None, 0.0
    for tokens, record in tp_index:
        if not tokens:
            continue
        shared = query_tokens & tokens
        if not shared:
            continue
        # require the match to explain most of whichever side is shorter
        score = len(shared) / min(len(query_tokens), len(tokens))
        if score > best_score and any(len(t) > 3 for t in shared):
            best_score, best = score, record
    if best_score >= min_overlap:
        return best, best_score
    return None


# ---------------------------------------------------------------------------
# Groq search
# ---------------------------------------------------------------------------

_exhausted_lock = threading.Lock()
_daily_exhausted = set()
_model_cycle_lock = threading.Lock()
_model_cycle_idx = 0

# Each search burns ~10-17k tokens against a sub-model with a 30k-tokens/minute
# window (observed on groq/compound's internal llama-4-scout call). Pacing calls
# to roughly one per ~28s per model keeps us under that instead of tripping 429
# and burning retries (each retry is itself a full request against the daily cap).
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


def build_search_messages(name, address, website):
    domains = ", ".join(PREFERRED_DOMAINS)
    website_line = f"Known website: {website}" if website else ""
    prompt = f"""Search the web to find the most recent annual revenue for this Indian company.

Company name: {name}
Address/area: {address}
{website_line}

Prefer these sources if the company appears on them (they index Indian MCA/company
filings and financial results): {domains}
If not found on those, use any other reliable source (news, stock exchange filing,
company press release, MCA/Tofler-style aggregator).

Respond with ONLY a JSON object, no other text:
{{"found": true|false, "revenue": "<e.g. '₹48.11 Lakh' or '₹263 Cr', empty if not found>",
"fiscal_year": "<e.g. 'FY 2024-25', empty if not found>",
"source_name": "<short label for the source>", "source_url": "<the URL you found this at>",
"confidence": "high|medium|low"}}
"""
    return [{"role": "user", "content": prompt}]


def call_groq_search(name, address, website, api_key):
    model = next_search_model()
    if model is None:
        raise RuntimeError("all search models daily-exhausted")

    payload = {
        "model": model,
        "messages": build_search_messages(name, address, website),
        "response_format": {"type": "json_object"},
        "temperature": 0,
    }
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    tried_413_switch = False
    resp = None
    for attempt in range(5):
        wait_for_model_slot(model)
        try:
            resp = requests.post(API_URL, headers=headers, json=payload, timeout=90)
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
        err_code = err.get("code", "")
        err_message = err.get("message", "")
        # Messages saying "per day" (TPD/RPD) turned out NOT to reliably mean a
        # 24h-lasting cap on this API — accounts have recovered within minutes
        # of one, so permanently blacklisting a model on that text was actively
        # harmful (killed a healthy model for the rest of the run). Instead,
        # treat every 429 the same way: respect Groq's suggested wait and retry.
        if resp.status_code == 429:
            wait_match = re.search(r"try again in ([\d.]+)s", err_message)
            wait = float(wait_match.group(1)) + 0.5 if wait_match else 2 ** attempt
            time.sleep(min(wait, 60))
            continue
        if resp.status_code == 413 and err_code == "request_too_large" and not tried_413_switch:
            # deterministic for this query on this model — retrying identically won't
            # help, but the other search model may have a larger context budget
            tried_413_switch = True
            other = [m for m in SEARCH_MODELS if m != model and m not in _daily_exhausted]
            if other:
                model = other[0]
                payload["model"] = model
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
# Row processing
# ---------------------------------------------------------------------------

def process_row(row, tp_index, api_key):
    out = dict(row)
    out.setdefault("revenue", "")
    out.setdefault("fiscal_year", "")
    out.setdefault("source_name", "")
    out.setdefault("source_url", "")
    out.setdefault("revenue_confidence", "")
    out.setdefault("revenue_method", "")
    out.setdefault("status", "")

    match = find_tp_match(row["name"], tp_index)
    if match:
        record, score = match
        out["revenue"] = record["revenue"]
        out["fiscal_year"] = record["fiscal_year"]
        out["source_name"] = record["source_name"]
        out["source_url"] = record["source_url"]
        out["revenue_confidence"] = "high" if score >= 0.85 else "medium"
        out["revenue_method"] = f"tp_resources_match ({score:.2f})"
        out["status"] = "matched"
        return out

    try:
        model, parsed = call_groq_search(row["name"], row.get("address", ""), row.get("website", ""), api_key)
    except Exception as e:
        out["revenue_method"] = f"error: {e}"
        out["status"] = "error"
        return out

    if parsed.get("found"):
        out["revenue"] = parsed.get("revenue", "")
        out["fiscal_year"] = parsed.get("fiscal_year", "")
        out["source_name"] = parsed.get("source_name", "")
        out["source_url"] = parsed.get("source_url", "")
        out["revenue_confidence"] = parsed.get("confidence", "")
        out["revenue_method"] = f"web_search ({model})"
        out["status"] = "found"
    else:
        out["revenue_method"] = f"web_search ({model}), no data found"
        out["status"] = "not_found"
    return out


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=DEFAULT_INPUT)
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    parser.add_argument("--tp-resources", default=DEFAULT_TP_RESOURCES)
    parser.add_argument("--limit", type=int, default=None, help="only process first N unresolved rows")
    parser.add_argument("--workers", type=int, default=6, help="parallel worker threads for web search")
    parser.add_argument("--checkpoint-every", type=int, default=2)
    args = parser.parse_args()

    api_key = os.environ.get("GROK_API_KEY") or os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise SystemExit("GROK_API_KEY (a Groq key) not set in .env")

    tp_records = parse_tp_resources(args.tp_resources)
    tp_index = build_tp_index(tp_records)
    print(f"Loaded {len(tp_records)} revenue records from {args.tp_resources}", flush=True)

    with open(args.input, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        in_fieldnames = reader.fieldnames
        rows = list(reader)

    extra_fields = ["revenue", "fiscal_year", "source_name", "source_url", "revenue_confidence", "revenue_method", "status"]
    fieldnames = in_fieldnames + [f for f in extra_fields if f not in in_fieldnames]

    done_by_id = {}
    if os.path.exists(args.output):
        with open(args.output, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                if r.get("status") in ("matched", "found", "not_found"):
                    done_by_id[r["id"]] = r

    lock = threading.Lock()
    results_by_id = dict(done_by_id)

    def save():
        ordered = [results_by_id.get(r["id"], r) for r in rows]
        tmp = args.output + ".tmp"
        with open(tmp, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(ordered)
        os.replace(tmp, args.output)

    todo = [r for r in rows if r["id"] not in done_by_id]
    if args.limit is not None:
        todo = todo[:args.limit]
    print(f"{len(done_by_id)} already resolved, {len(todo)} to process this run", flush=True)

    processed = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(process_row, row, tp_index, api_key): row for row in todo}
        for fut in as_completed(futures):
            row = futures[fut]
            result = fut.result()
            with lock:
                results_by_id[row["id"]] = result
                processed += 1
                if processed % args.checkpoint_every == 0:
                    save()
            tag = result["status"]
            print(f"[{processed}/{len(todo)}] {row['name'][:45]:45s} -> {tag}: {result.get('revenue','')} ({result.get('revenue_method','')[:60]})", flush=True)

    save()
    print(f"\nDone. Processed {processed} rows this run -> {args.output}")
    counts = {}
    for r in rows:
        s = results_by_id.get(r["id"], r).get("status", "")
        counts[s or "unprocessed"] = counts.get(s or "unprocessed", 0) + 1
    for k, v in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
