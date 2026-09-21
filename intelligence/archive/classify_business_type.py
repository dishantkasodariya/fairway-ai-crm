import csv

SOURCE_CSV = "results/surat_50km_depth0_companies_sorted.csv"
OUTPUT_CSV = "results/surat_50km_depth0_companies_categorized.csv"

# Checked in order, first match wins — more specific categories listed
# before broader ones so e.g. "agrochemical" doesn't fall into "Chemicals"
# before it can hit "Agrochemicals/Fertilizer".
CATEGORY_RULES = [
    ("Solar/Renewable Energy", [
        "solar", "photovoltaic", " pv ", "renewable", "green energy", "biomass", "windmill", "wind energy",
    ]),
    ("Pharma/Life Sciences", [
        "pharma", "lifescience", "life science", "biotech", "drug", "formulation", "healthcare",
    ]),
    ("Agrochemicals/Fertilizer", [
        "agrochem", "agro chem", "pesticide", "fertiliser", "fertilizer", "insecticide",
    ]),
    ("Chemicals", [
        "chemical", "petrochem", "pigment", "dye", "dyestuff", "resin", "polymer", "solvent",
        "intermediate", "acid", "paint", " ink ", "coating", "surfactant",
    ]),
    ("Plastics/Packaging", [
        "plastic", "packaging", "carton", "corrugated", "poly bag", "polybag", "pvc", "pet bottle",
        "moulding", "molding", "wrap",
    ]),
    ("Textile", [
        "textile", "fabric", "weaving", "yarn", "dyeing and printing", "garment", "apparel", "denim",
        "spinning", "embroidery", "saree", "cloth",
    ]),
    ("Flour/Grain Mill", [
        "flour mill", "atta", "rice mill", "pulse mill", "dal mill", "grain", "masala mill",
    ]),
    ("Edible Oil", [
        "oil mill", "edible oil", "castor oil", "ghee", "vanaspati", "cooking oil",
    ]),
    ("Salt Works", [
        "salt work", "salt refinery", " salt ", "salt private", "namak",
    ]),
    ("Food/Beverage", [
        "food", "foods", "bakery", "snacks", "spices", "dairy", "milk", "beverage", "confectionery",
        "namkeen", "agro foods",
    ]),
    ("Water Supply/RO Plant", [
        "water plant", "water supply", "ro plant", "mineral water", "water tenkar", "water tanker",
        "aqua",
    ]),
    ("Ceramics/Tiles", [
        "ceramic", "tiles", "sanitary ware", "sanitaryware", "vitrified",
    ]),
    ("Paper/Board", [
        "paper mill", "paper board", "paperboard", " paper ", "newsprint",
    ]),
    ("Rubber", [
        "rubber",
    ]),
    ("Cement/Construction Materials", [
        "cement", "concrete", "bricks", "ready mix", "rmc ", "construction material",
    ]),
    ("Metal/Engineering/Fabrication", [
        "engineering", "fabrication", "weldmesh", "steel", "metal", "forging", "casting",
        "machinery", "boiler", "pipe", "wire", "alloy", "foundry", "sheet metal",
    ]),
    ("Electronics/Electrical", [
        "electrical", "electronics", "switchgear", "cable", "transformer", "panel board",
    ]),
    ("Automobile/Auto Parts", [
        "auto ", "automobile", "auto parts", "auto spares", "vehicle",
    ]),
    ("Leather", [
        "leather", "tannery",
    ]),
    ("Storage/Warehouse", [
        "cold storage", "warehouse", "godown", "storage", "logistics park",
    ]),
    ("Shipping/Logistics/Transport", [
        "transport", "logistics", "cargo", "shipping", "freight", "courier", "roadways", "carrier",
        "clearing and forwarding", "c&f", "movers",
    ]),
]


def classify(name):
    text = f" {(name or '').lower()} "
    for category, terms in CATEGORY_RULES:
        if any(term in text for term in terms):
            return category
    return "?"


def main():
    with open(SOURCE_CSV) as f:
        rows = list(csv.DictReader(f))

    for row in rows:
        row["business_type"] = classify(row.get("name"))

    fieldnames = list(rows[0].keys()) if rows else []
    with open(OUTPUT_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    counts = {}
    for row in rows:
        counts[row["business_type"]] = counts.get(row["business_type"], 0) + 1

    print(f"Classified {len(rows)} companies -> {OUTPUT_CSV}\n")
    for category, count in sorted(counts.items(), key=lambda kv: -kv[1]):
        print(f"  {category}: {count}")


if __name__ == "__main__":
    main()
