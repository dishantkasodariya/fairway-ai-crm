"""
Reclassify companies still tagged "?" by classify_business_type.py using
Groq's API (api.groq.com — note: this is Groq the fast-inference company,
not xAI's "Grok"; despite the script name, the key/endpoint here are Groq's).

For each unresolved company:
  - If it has a website, we fetch the page ourselves (cheap, deterministic)
    and hand the extracted text to a plain model for classification.
  - If it has no website, we ask groq/compound-mini — a model with built-in
    web search tool-use — to look the company up.
Companies that turn out to be non-businesses (residential areas, GIDC plot
references, etc.) or that cannot be identified are tagged "None" instead of
left as "?".

Usage:
    python classify_with_grok.py
    python classify_with_grok.py --input results/foo.csv --output results/foo_grok.csv
    python classify_with_grok.py --limit 20          # smoke test on 20 rows

Requires GROK_API_KEY (a Groq API key, starts with gsk_) in .env.
"""

import argparse
import csv
import json
import os
import re
import time

import requests
from dotenv import load_dotenv

from classify_business_type import CATEGORY_RULES

load_dotenv()

API_URL = "https://api.groq.com/openai/v1/chat/completions"
CATEGORIES = [name for name, _ in CATEGORY_RULES] + ["None"]

DEFAULT_INPUT = "results/surat_50km_depth0_companies_cleaned.csv"
DEFAULT_OUTPUT = "results/surat_50km_depth0_companies_grok_classified.csv"

PLAIN_MODEL = "allam-2-7b"
SEARCH_MODEL = "groq/compound-mini"

# Set once a daily-quota-exhaustion error is seen for a model, so we stop wasting
# HTTP round trips retrying a model that won't recover until Groq's daily reset.
_DAILY_EXHAUSTED = set()

TAG_RE = re.compile(r"<(script|style)[^>]*>.*?</\1>", re.IGNORECASE | re.DOTALL)
ANY_TAG_RE = re.compile(r"<[^>]+>")
WS_RE = re.compile(r"\s+")


def fetch_website_text(url, max_chars=2500):
    try:
        resp = requests.get(
            url, timeout=8,
            headers={"User-Agent": "Mozilla/5.0 (compatible; company-classifier/1.0)"},
        )
        resp.raise_for_status()
        html = resp.text
    except Exception as e:
        return None, f"fetch failed: {e}"

    text = TAG_RE.sub(" ", html)
    text = ANY_TAG_RE.sub(" ", text)
    import html as html_module
    text = html_module.unescape(text)
    text = WS_RE.sub(" ", text).strip()
    return text[:max_chars], None


def build_category_block():
    return "\n".join(f"- {c}" for c in CATEGORIES)


def build_website_messages(name, address, website, page_text):
    prompt = f"""You are classifying a company near Surat, Gujarat, India into an industry category
for a dataset of manufacturers/suppliers/storage/logistics companies found via Google Places.

Company name: {name}
Address: {address}
Website: {website}

Text extracted from the company's website:
\"\"\"
{page_text}
\"\"\"

Pick exactly ONE category from this fixed list (use the exact spelling):
{build_category_block()}

Rules:
- "None" means the website text gives no real indication of what the business does,
  or this isn't an identifiable business at all.
- Do not invent a category outside the list. If nothing fits perfectly but it IS a
  real company with a discernible industry, pick the closest reasonable category.

Respond with ONLY a JSON object, no other text:
{{"category": "<one of the categories above>", "confidence": "high|medium|low", "reason": "<one short sentence>"}}
"""
    return [{"role": "user", "content": prompt}]


def build_search_messages(name, address):
    prompt = f"""You are classifying a company near Surat, Gujarat, India into an industry category
for a dataset of manufacturers/suppliers/storage/logistics companies found via Google Places.
This company has no website on record, so search the web for it.

Company name: {name}
Address: {address}

Search for this company name (optionally combined with the address/area) to find out what it does.
If it's a well-known Indian industrial group, use what you already know about it.
Many names are transliterated Gujarati/Hindi place, colony, or survey-number labels with no
business information available at all — if search finds nothing indicating a real business,
tag it "None" rather than guessing.

Pick exactly ONE category from this fixed list (use the exact spelling):
{build_category_block()}

Respond with ONLY a JSON object, no other text:
{{"category": "<one of the categories above>", "confidence": "high|medium|low", "reason": "<one short sentence>"}}
"""
    return [{"role": "user", "content": prompt}]


def build_knowledge_only_messages(name, address):
    prompt = f"""You are classifying a company near Surat, Gujarat, India into an industry category
for a dataset of manufacturers/suppliers/storage/logistics companies found via Google Places.
This company has no website on record and web search is unavailable, so rely only on what you
already know from training — do not guess.

Company name: {name}
Address: {address}

If this is a well-known Indian company/industrial group you recognize, classify it using what
you know about it. Many names are transliterated Gujarati/Hindi place, colony, or survey-number
labels, or small local businesses you won't recognize — if you don't have reliable knowledge of
what this specific entity does, tag it "None" rather than guessing.

Pick exactly ONE category from this fixed list (use the exact spelling):
{build_category_block()}

Respond with ONLY a JSON object, no other text:
{{"category": "<one of the categories above>", "confidence": "high|medium|low", "reason": "<one short sentence>"}}
"""
    return [{"role": "user", "content": prompt}]


def call_groq(messages, model, api_key, json_mode=True):
    if model in _DAILY_EXHAUSTED:
        raise RuntimeError(f"{model} daily quota exhausted, skipping")

    payload = {"model": model, "messages": messages, "temperature": 0}
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

    resp = None
    for attempt in range(4):
        resp = requests.post(API_URL, headers=headers, json=payload, timeout=60)
        if resp.status_code == 200:
            break
        try:
            err_body = resp.json().get("error", {})
            err_code = err_body.get("code", "")
            err_message = err_body.get("message", "")
        except Exception:
            err_code, err_message = "", ""
        if resp.status_code == 429 and "per day" in err_message:
            # daily cap — won't recover within this run, stop retrying this model entirely
            _DAILY_EXHAUSTED.add(model)
            break
        if resp.status_code in (429, 500, 502, 503):
            time.sleep(2 ** attempt)
            continue
        if err_code == "request_too_large" and json_mode:
            # drop response_format and retry once, smaller context won't help here
            payload.pop("response_format", None)
            json_mode = False
            continue
        break
    if resp is None or resp.status_code != 200:
        status = resp.status_code if resp is not None else "?"
        body = resp.text[:300] if resp is not None else ""
        raise RuntimeError(f"Groq API failed: {status} {body}")

    data = resp.json()
    return data["choices"][0]["message"]["content"]


def parse_category(content):
    try:
        # model may wrap JSON in prose despite instructions; grab the {...}
        match = re.search(r"\{.*\}", content, re.DOTALL)
        parsed = json.loads(match.group(0) if match else content)
    except Exception:
        return "None", "", f"unparseable response: {content[:200]}"
    category = parsed.get("category", "None")
    if category not in CATEGORIES:
        category = "None"
    return category, parsed.get("confidence", ""), parsed.get("reason", "")


def classify_one(name, address, website, api_key):
    if website:
        page_text, fetch_err = fetch_website_text(website)
        if page_text:
            content = call_groq(build_website_messages(name, address, website, page_text), PLAIN_MODEL, api_key)
            return parse_category(content)
        # website given but unreachable — fall back to search, note the reason
        category, confidence, reason = search_or_knowledge_fallback(name, address, api_key)
        return category, confidence, f"{reason} (website unreachable: {fetch_err})"

    return search_or_knowledge_fallback(name, address, api_key)


def search_or_knowledge_fallback(name, address, api_key):
    try:
        content = call_groq(build_search_messages(name, address), SEARCH_MODEL, api_key)
        return parse_category(content)
    except Exception as e:
        # compound-mini's search tool can exceed this account's per-request token
        # budget (413 request_too_large) regardless of prompt size — fall back to
        # the plain model's own knowledge rather than failing the row outright.
        content = call_groq(build_knowledge_only_messages(name, address), PLAIN_MODEL, api_key)
        category, confidence, reason = parse_category(content)
        return category, confidence, f"{reason} (search unavailable: {e})"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default=DEFAULT_INPUT)
    parser.add_argument("--output", default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, default=None, help="only process first N unresolved rows")
    parser.add_argument("--sleep", type=float, default=1.0, help="seconds between API calls")
    parser.add_argument("--checkpoint-every", type=int, default=20)
    args = parser.parse_args()

    api_key = os.environ.get("GROK_API_KEY") or os.environ.get("GROQ_API_KEY")
    if not api_key:
        raise SystemExit("GROK_API_KEY (a Groq key) not set in .env — see .env.example")

    with open(args.input, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        rows = list(reader)

    if "grok_confidence" not in fieldnames:
        fieldnames = fieldnames + ["grok_confidence", "grok_reason"]

    # Resume: if output already exists, reuse rows it already resolved (business_type
    # != "?") instead of starting over. Rows still "?" in the checkpoint are retried —
    # save() always writes every row, resolved or not, so presence alone isn't enough.
    progress_by_id = {}
    if os.path.exists(args.output):
        with open(args.output, newline="", encoding="utf-8") as f:
            for r in csv.DictReader(f):
                if r.get("business_type") != "?":
                    progress_by_id[r["id"]] = r

    def save(rows_to_write):
        tmp_path = args.output + ".tmp"
        with open(tmp_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows_to_write)
        os.replace(tmp_path, args.output)

    processed_this_run = 0
    for row in rows:
        prior = progress_by_id.get(row["id"])
        if prior is not None:
            row.update(prior)
            continue
        if row.get("business_type") != "?":
            row.setdefault("grok_confidence", "")
            row.setdefault("grok_reason", "")
            progress_by_id[row["id"]] = row
            continue

        if args.limit is not None and processed_this_run >= args.limit:
            continue

        try:
            category, confidence, reason = classify_one(
                row["name"], row.get("address", ""), row.get("website", ""), api_key=api_key,
            )
        except Exception as e:
            print(f"  ERROR classifying '{row['name']}': {e}")
            category, confidence, reason = "?", "", f"error: {e}"

        row["business_type"] = category
        row["grok_confidence"] = confidence
        row["grok_reason"] = reason
        progress_by_id[row["id"]] = row
        processed_this_run += 1

        print(f"[{processed_this_run}] {row['name'][:50]:50s} -> {category} ({confidence})")

        if processed_this_run % args.checkpoint_every == 0:
            save([progress_by_id.get(r["id"], r) for r in rows])

        time.sleep(args.sleep)

    save([progress_by_id.get(r["id"], r) for r in rows])

    print(f"\nDone. Processed {processed_this_run} rows this run -> {args.output}")
    counts = {}
    for r in rows:
        bt = progress_by_id.get(r["id"], r).get("business_type", "?")
        counts[bt] = counts.get(bt, 0) + 1
    for category, count in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {category}: {count}")


if __name__ == "__main__":
    main()
