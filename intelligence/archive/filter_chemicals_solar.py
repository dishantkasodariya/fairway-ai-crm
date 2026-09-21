import csv
import sys

SOURCE_CSV = "results/surat_50km_depth0_companies_sorted.csv"
OUTPUT_CSV = "results/surat_50km_chemicals_solar.csv"

# Matched against name + address, case-insensitive. Companies dealing in
# chemicals often don't say "chemical" outright (e.g. "pigments",
# "intermediates", "dyes") so the list covers common chemical-industry
# terms, not just the literal word.
KEYWORDS = {
    "chemical": [
        "chemical", "chemicals", "petrochem", "pigment", "dye", "dyes",
        "intermediate", "intermediates", "polymer", "resin", "solvent",
        "acid", "agrochem", "pesticide", "fertilizer", "fertiliser",
    ],
    "solar": [
        "solar", "photovoltaic", "pv module", "pv panel",
    ],
}


def matched_category(name, address):
    # Name-only matching: addresses often mention nearby landmark businesses
    # (e.g. "opp. Hindustan Chemical Company") which caused false positives
    # when matched against unrelated companies at that address.
    text = (name or "").lower()
    for category, terms in KEYWORDS.items():
        if any(term in text for term in terms):
            return category
    return None


def main():
    with open(SOURCE_CSV) as f:
        rows = list(csv.DictReader(f))

    kept = []
    for row in rows:
        category = matched_category(row.get("name"), row.get("address"))
        if category:
            row["matched_category"] = category
            kept.append(row)

    fieldnames = list(rows[0].keys()) + ["matched_category"] if rows else []
    with open(OUTPUT_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(kept)

    print(f"Scanned {len(rows)} companies")
    print(f"Kept {len(kept)} matching chemicals/solar")
    by_cat = {}
    for row in kept:
        by_cat[row["matched_category"]] = by_cat.get(row["matched_category"], 0) + 1
    for cat, count in by_cat.items():
        print(f"  {cat}: {count}")
    print(f"Saved to {OUTPUT_CSV}")


if __name__ == "__main__":
    main()
