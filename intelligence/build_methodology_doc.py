"""
Generates the "Fairway Company Intelligence — Pipeline & Data Sources
Methodology" reference document (.docx) describing every stage of the
company-discovery / revenue-enrichment / signal-research pipeline built in
this project: what source feeds each stage, what data comes out of it, and
how signals get fused into an opportunity score.

Usage:
    python build_methodology_doc.py
Output:
    docs/Fairway_Company_Intelligence_Methodology.docx
"""

from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

INK = RGBColor(0x22, 0x24, 0x1E)
MUTED = RGBColor(0x5B, 0x60, 0x54)
ACCENT = RGBColor(0x9C, 0x52, 0x20)
ACCENT_LIGHT = RGBColor(0xF3, 0xE6, 0xD6)
LINE = RGBColor(0xD7, 0xDB, 0xD0)
GOOD = RGBColor(0x2E, 0x63, 0x38)
GOOD_BG = RGBColor(0xE3, 0xED, 0xE2)
WARN_BG = RGBColor(0xF3, 0xE6, 0xD6)
RISK = RGBColor(0x8A, 0x2E, 0x2E)
RISK_BG = RGBColor(0xF2, 0xDE, 0xDE)

BODY_FONT = "Calibri"
HEAD_FONT = "Calibri"
MONO_FONT = "Consolas"


def set_cell_shading(cell, hex_color):
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), hex_color)
    cell._tc.get_or_add_tcPr().append(shd)


def set_cell_text(cell, text, bold=False, color=None, size=10, mono=False, align=None):
    cell.text = ""
    p = cell.paragraphs[0]
    if align:
        p.alignment = align
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.name = MONO_FONT if mono else BODY_FONT
    run.bold = bold
    if color:
        run.font.color.rgb = color


def add_table(doc, headers, rows, col_widths=None, header_bg="9C5220", mono_cols=None):
    mono_cols = mono_cols or set()
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table.rows[0].cells
    for i, h in enumerate(headers):
        set_cell_text(hdr[i], h, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF), size=10)
        set_cell_shading(hdr[i], header_bg)
    for row in rows:
        cells = table.add_row().cells
        for i, val in enumerate(row):
            set_cell_text(cells[i], str(val), mono=(i in mono_cols), size=9.5)
    if col_widths:
        for i, w in enumerate(col_widths):
            for row in table.rows:
                row.cells[i].width = Cm(w)
    doc.add_paragraph()
    return table


def add_heading(doc, text, level=1, color=ACCENT):
    h = doc.add_heading(level=level)
    run = h.add_run(text)
    run.font.name = HEAD_FONT
    run.font.color.rgb = color if level == 1 else INK
    run.font.size = Pt(20 if level == 1 else (15 if level == 2 else 12.5))
    run.bold = True
    if level == 1:
        pPr = h._p.get_or_add_pPr()
        pBdr = OxmlElement("w:pBdr")
        bottom = OxmlElement("w:bottom")
        bottom.set(qn("w:val"), "single")
        bottom.set(qn("w:sz"), "8")
        bottom.set(qn("w:space"), "4")
        bottom.set(qn("w:color"), "9C5220")
        pBdr.append(bottom)
        pPr.append(pBdr)
        h.paragraph_format.space_before = Pt(22)
        h.paragraph_format.space_after = Pt(10)
    else:
        h.paragraph_format.space_before = Pt(14)
        h.paragraph_format.space_after = Pt(6)
    return h


def add_para(doc, text, size=10.5, color=INK, bold=False, italic=False, space_after=8):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.name = BODY_FONT
    run.font.color.rgb = color
    run.bold = bold
    run.italic = italic
    return p


def add_bullets(doc, items, size=10.5):
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.paragraph_format.space_after = Pt(4)
        run = p.add_run(item)
        run.font.size = Pt(size)
        run.font.name = BODY_FONT
        run.font.color.rgb = INK


def add_callout(doc, label, text, bg="F3E6D6", label_color=ACCENT):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.rows[0].cells[0]
    set_cell_shading(cell, bg)
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    run1 = p.add_run(f"{label}  ")
    run1.bold = True
    run1.font.size = Pt(10)
    run1.font.color.rgb = label_color
    run1.font.name = BODY_FONT
    run2 = p.add_run(text)
    run2.font.size = Pt(10)
    run2.font.color.rgb = INK
    run2.font.name = BODY_FONT
    doc.add_paragraph()


def add_pipeline_diagram(doc, stages):
    """Simple numbered flow rendered as a single-row table with arrows."""
    table = doc.add_table(rows=2, cols=len(stages))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, (num, name) in enumerate(stages):
        c = table.rows[0].cells[i]
        set_cell_shading(c, "9C5220")
        set_cell_text(c, num, bold=True, color=RGBColor(0xFF, 0xFF, 0xFF), size=13, align=WD_ALIGN_PARAGRAPH.CENTER)
        c2 = table.rows[1].cells[i]
        set_cell_shading(c2, "F3E6D6")
        set_cell_text(c2, name, bold=True, color=INK, size=8.5, align=WD_ALIGN_PARAGRAPH.CENTER)
    doc.add_paragraph()


def set_base_styles(doc):
    normal = doc.styles["Normal"]
    normal.font.name = BODY_FONT
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = INK
    normal.paragraph_format.space_after = Pt(8)
    normal.paragraph_format.line_spacing = 1.2


def add_footer_page_numbers(doc):
    section = doc.sections[0]
    footer = section.footer
    p = footer.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    fld1 = OxmlElement("w:fldChar")
    fld1.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = "PAGE"
    fld2 = OxmlElement("w:fldChar")
    fld2.set(qn("w:fldCharType"), "end")
    run._r.append(fld1)
    run._r.append(instr)
    run._r.append(fld2)
    run.font.size = Pt(9)
    run.font.color.rgb = MUTED


def build():
    doc = Document()
    set_base_styles(doc)
    add_footer_page_numbers(doc)

    for s in doc.sections:
        s.left_margin = Cm(2.2)
        s.right_margin = Cm(2.2)
        s.top_margin = Cm(2)
        s.bottom_margin = Cm(2)

    # ---------------- Title page ----------------
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    title_p.paragraph_format.space_before = Pt(60)
    run = title_p.add_run("FAIRWAY COMPANY INTELLIGENCE")
    run.font.size = Pt(14)
    run.font.color.rgb = ACCENT
    run.bold = True
    run.font.name = HEAD_FONT

    subtitle_p = doc.add_paragraph()
    subtitle_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = subtitle_p.add_run("Pipeline & Data Sources Methodology")
    run.font.size = Pt(28)
    run.bold = True
    run.font.color.rgb = INK
    run.font.name = HEAD_FONT

    desc_p = doc.add_paragraph()
    desc_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    desc_p.paragraph_format.space_before = Pt(10)
    run = desc_p.add_run(
        "How companies are discovered, enriched with revenue, researched for buying "
        "signals, and scored into a ranked warehouse-leasing opportunity radar."
    )
    run.font.size = Pt(12)
    run.italic = True
    run.font.color.rgb = MUTED
    run.font.name = BODY_FONT

    meta_p = doc.add_paragraph()
    meta_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta_p.paragraph_format.space_before = Pt(30)
    run = meta_p.add_run("Version 1.0  ·  September 2026  ·  Surat–Bharuch–Dahej industrial corridor pilot")
    run.font.size = Pt(9.5)
    run.font.color.rgb = MUTED
    run.font.name = MONO_FONT

    doc.add_page_break()

    # ---------------- Contents ----------------
    add_heading(doc, "Contents", level=1)
    toc_items = [
        "1. Pipeline at a Glance",
        "2. Stage 1 — Company Discovery",
        "3. Stage 2 — Business Classification",
        "4. Stage 3 — Revenue Enrichment",
        "5. Stage 4 — Pre-Filtering (Defining the ICP)",
        "6. Stage 5 — Signal Research",
        "   6.1 Signal Source Categories & Coverage",
        "   6.2 The 10 Signal Types",
        "7. Stage 6 — Signal Fusion & Opportunity Scoring",
        "8. Known Limitations & Coverage Gaps",
        "9. Output Artifacts",
        "10. Roadmap — Contact Discovery (Proposed)",
    ]
    for item in toc_items:
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(3)
        run = p.add_run(item)
        run.font.size = Pt(11)
        run.font.name = BODY_FONT
        run.font.color.rgb = ACCENT if not item.startswith(" ") else MUTED

    doc.add_page_break()

    # ---------------- 1. Pipeline at a glance ----------------
    add_heading(doc, "1. Pipeline at a Glance", level=1)
    add_para(
        doc,
        "The system runs as a sequence of six batch stages, each reading the previous "
        "stage's output CSV and writing an enriched one. It is designed to run "
        "periodically (e.g. annually) rather than continuously — every stage is "
        "resumable and checkpointed so a run can be stopped and restarted without "
        "re-doing completed work."
    )
    add_pipeline_diagram(doc, [
        ("1", "Discover\nCompanies"),
        ("2", "Classify\nBusiness Type"),
        ("3", "Enrich\nRevenue"),
        ("4", "Filter to\nICP Band"),
        ("5", "Research\nSignals"),
        ("6", "Fuse &\nScore"),
    ])
    add_para(
        doc,
        "Each stage is described in its own section below: what feeds it, what it "
        "produces, and — critically — where the underlying data actually comes from."
    )

    # ---------------- 2. Stage 1 ----------------
    add_heading(doc, "2. Stage 1 — Company Discovery", level=1)
    add_para(
        doc,
        "Objective: build a raw list of every business within a set radius of a given "
        "warehouse location."
    )
    add_heading(doc, "Source", level=2)
    add_para(doc, "Google Places API — \"New Nearby Search\" endpoint.")
    add_bullets(doc, [
        "A single API call is capped at a 50 km radius and returns at most 20 results, "
        "so dense industrial belts (e.g. GIDC estates) would silently under-report if "
        "queried once.",
        "The pipeline instead tiles the target radius into a hex grid of overlapping "
        "sub-circles (starting ~3 km radius) and recursively subdivides any tile that "
        "hits the 20-result cap into 4–6 half-radius children, down to a 750 m floor "
        "— this is what the \"depth\" in filenames like surat_50km_depth0 refers to.",
        "Rate-limited, concurrent requests with retry/backoff keep the tiling sweep "
        "within Places API quota.",
    ])
    add_heading(doc, "Data captured per company", level=2)
    add_table(
        doc,
        ["Field", "Description"],
        [
            ("name", "Business name as listed on Google"),
            ("primary_type", "Google's place-type classification (e.g. \"manufacturer\")"),
            ("address", "Full formatted address"),
            ("lat / lng", "Coordinates"),
            ("distance_km", "Straight-line distance from the warehouse (haversine)"),
            ("phone / website", "If Google has them on file"),
            ("id", "Google Place ID — stable identifier used for dedup/checkpointing downstream"),
        ],
        col_widths=[4, 12],
    )
    add_callout(
        doc, "Note —",
        "Google Places data is a discovery index, not a business directory: it tells you "
        "something exists at a location and what Google thinks its category is, but has "
        "no financial or operational detail. That is what Stages 2–3 add."
    )

    # ---------------- 3. Stage 2 ----------------
    add_heading(doc, "3. Stage 2 — Business Classification", level=1)
    add_para(
        doc,
        "Objective: tag each discovered business with an industry category (Chemicals, "
        "Plastics/Packaging, Pharma/Life Sciences, Solar/Renewable Energy, Agrochemicals, "
        "Metal/Engineering, etc.) so downstream filtering and search prompts can be "
        "targeted."
    )
    add_table(
        doc,
        ["Method", "How it works", "Coverage"],
        [
            (
                "Rule-based keyword match",
                "Business name/address checked against ~15 category keyword lists "
                "(e.g. \"pharma\", \"resin\", \"pesticide\") — free, instant, deterministic.",
                "Resolves the majority of clearly-named companies",
            ),
            (
                "AI classification (website text)",
                "For companies with a website but no rule match: the page is fetched, "
                "HTML stripped to plain text, and a language model classifies it "
                "against the same category list.",
                "Resolves most companies with a working website",
            ),
            (
                "AI classification (web search)",
                "For companies with no website: a search-capable model looks the "
                "company up on the open web and classifies from what it finds.",
                "Last resort; lowest confidence",
            ),
        ],
        col_widths=[4, 8.5, 3.5],
    )
    add_para(
        doc,
        "Every classification carries a confidence tag (high/medium) and — for AI-assisted "
        "rows — the model's stated reasoning, so a human can spot-check the weakest calls.",
        space_after=4,
    )

    # ---------------- 4. Stage 3 ----------------
    add_heading(doc, "4. Stage 3 — Revenue Enrichment", level=1)
    add_para(
        doc,
        "Objective: attach an annual revenue figure (and fiscal year) to each company, "
        "used both to filter the list to a realistic customer profile and to estimate "
        "warehouse space requirement when no source states one explicitly."
    )
    add_heading(doc, "Sources, in lookup order", level=2)
    add_table(
        doc,
        ["Order", "Source", "Nature"],
        [
            ("1st", "tp_resources.md (pre-verified internal table)", "Free, instant, highest trust — matched by fuzzy company-name overlap"),
            ("2nd", "Live web search (search-capable LLM), biased toward trusted domains below", "Slower, costs an API call, variable confidence"),
        ],
        col_widths=[2, 9, 6],
    )
    add_heading(doc, "Trusted domains the web-search step is steered toward", level=2)
    domains = (
        "thecompanycheck.com · tracxn.com · tofler.in · screener.in · mycorporateinfo.com · "
        "corpintel.io · infyner.com · gstpan.com · allindiaitr.com · marketscreener.com · "
        "scanx.trade · bseindia.com · stockanalysis.com · business-standard.com"
    )
    p = doc.add_paragraph()
    run = p.add_run(domains)
    run.font.name = MONO_FONT
    run.font.size = Pt(9.5)
    run.font.color.rgb = MUTED
    doc.add_paragraph()
    add_para(
        doc,
        "These are Indian MCA/ROC filing aggregators, stock-exchange sites, and financial "
        "media — chosen because they index audited or self-reported numbers rather than "
        "estimates. The search step is allowed to use any other reliable source if a "
        "company doesn't appear on these, but a plain (non-search) language model is "
        "deliberately never used for revenue — it has no way to look up a real number and "
        "would only guess.",
    )
    add_table(
        doc,
        ["Output field", "Description"],
        [
            ("revenue", "As reported, e.g. \"₹503.1 Cr\", \"₹48.11 Lakh\", or a stated range"),
            ("fiscal_year", "e.g. \"FY 2024-25\""),
            ("source_name / source_url", "Citation for the figure"),
            ("revenue_confidence", "high / medium, based on match quality or source reliability"),
            ("status", "matched (from internal table) / found (from search) / not_found"),
        ],
        col_widths=[4, 12],
    )

    # ---------------- 5. Stage 4 ----------------
    add_heading(doc, "5. Stage 4 — Pre-Filtering (Defining the ICP)", level=1)
    add_para(
        doc,
        "Objective: cut the raw discovery list down to the companies actually worth "
        "spending signal-research effort on."
    )
    add_heading(doc, "Filter 1 — Revenue band", level=2)
    add_para(
        doc,
        "Default band: ₹30 Cr – ₹2,000 Cr annual revenue. This is a deliberate choice, "
        "not the literal top of the revenue list:"
    )
    add_bullets(doc, [
        "Companies below ~₹30 Cr rarely generate real, citable news/signal activity, "
        "and are unlikely to need meaningful warehouse capacity.",
        "Companies above ~₹2,000 Cr in this corridor are dominated by mega-cap "
        "conglomerates and PSU refineries/plants (Reliance, GAIL, HPCL, ArcelorMittal, "
        "UltraTech, Sun Pharma) that build and own captive warehousing rather than "
        "lease from a third party — scoring them highly would be a false positive for "
        "this specific business model.",
    ])
    add_heading(doc, "Filter 2 — Deduplication", level=2)
    add_para(
        doc,
        "Google Places frequently returns the same parent company multiple times under "
        "different site/gate/unit names (e.g. three separate entries for \"GNFC Dahej\", "
        "\"GNFC material entry gate\", \"Ccpp gate GNFC\"). Company names are normalized "
        "(stripping \"Unit 2\", \"Site V\", \"(Plant)\"-style suffixes and generic "
        "corporate words) and collapsed to one representative row per parent, with all "
        "distinct addresses retained as \"locations\" and a site_count so multi-plant "
        "companies aren't silently under- or over-counted.",
    )

    # ---------------- 6. Stage 5 ----------------
    add_heading(doc, "6. Stage 5 — Signal Research", level=1)
    add_para(
        doc,
        "Objective: for each shortlisted company, find real, citable evidence that it "
        "may need to lease additional warehouse space — and nothing is ever reported "
        "without a source URL attached."
    )

    add_heading(doc, "6.1  Signal Source Categories & Coverage", level=2)
    add_table(
        doc,
        ["Category", "Sources", "Current coverage"],
        [
            (
                "Government / Regulatory",
                "GPCB, SEIAA, PARIVESH, MCA, industrial authorities, tender portals",
                "NOT queried directly — surfaces only if a news article independently "
                "reports on a filing/approval/closure",
            ),
            (
                "Financial",
                "NSE, BSE, exchange filings, annual reports, investor presentations",
                "Partial — reached via aggregators (NSE Archives, ScanX Trade, CARE "
                "Ratings) and company IR pages",
            ),
            (
                "Business Media",
                "Economic Times, Business Standard, Moneycontrol, Manufacturing Today, "
                "Logistics Insider",
                "Good — primary source type surfaced by search",
            ),
            (
                "Chemical / Petrochemical",
                "Chemical Weekly, Indian Chemical News, Chemical Industry Digest, oil & "
                "gas publications",
                "Good, given the corridor's chemical/pharma-heavy industry mix",
            ),
            (
                "Company Sources",
                "Company websites, press releases, investor-relations pages",
                "Good",
            ),
            (
                "Professional Network (LinkedIn)",
                "Company pages, job postings, long-form \"Pulse\" articles",
                "Partial — Pulse articles are search-indexed; regular feed posts are "
                "not (login-walled), so hiring signals surface far more often than "
                "direct requirement posts",
            ),
            (
                "Contact / People Data",
                "Apollo.io, Lusha",
                "Not yet built — proposed Stage 7, see Section 10",
            ),
        ],
        col_widths=[3.5, 6.5, 6.5],
    )

    add_heading(doc, "6.2  The 10 Signal Types", level=2)
    add_para(doc, "Every signal found is tagged as exactly one of the following:", space_after=6)
    add_table(
        doc,
        ["Signal", "Definition", "Fusion weight"],
        [
            ("Expansion", "New plant, warehouse, geography, or capacity increase", "25"),
            ("Funding", "Fundraising, investment round, or CapEx announcement", "20"),
            ("Tender", "Government/private tender indicating a storage or logistics need", "18"),
            ("Hiring", "Supply-chain, warehouse, or logistics hiring push", "15"),
            ("Regulatory", "GPCB/SEIAA/environmental or project approval", "12"),
            ("Import/Export", "Significant growth in import or export activity", "10"),
            ("Distribution", "New distribution network or channel expansion", "10"),
            ("Filings", "Corporate announcement or financial filing (NSE/BSE/MCA)", "8"),
            ("Lease Expiry", "Public mention of an existing lease nearing renewal/expiry", "8"),
            ("Distress", "NCLT/IBC, restructuring, closure, or financial distress", "n/a — suppresses score"),
        ],
        col_widths=[3, 10.5, 3],
    )
    add_callout(
        doc, "Data-quality rule —",
        "A \"regulatory\" finding that actually describes a closure, suspension, or "
        "enforcement action (e.g. \"GPCB issued a closure directive\") is automatically "
        "reclassified as Distress rather than scored as a positive approval. This was "
        "found and fixed after an early run mis-scored a plant-closure order as a "
        "positive signal.",
        bg="F3E6D6",
    )

    # ---------------- 7. Stage 6 ----------------
    add_heading(doc, "7. Stage 6 — Signal Fusion & Opportunity Scoring", level=1)
    add_para(
        doc,
        "One signal alone is not a lead. The system sums the weights of every distinct "
        "signal type found for a company (capped at 100) to produce an Opportunity "
        "Score, with two overrides:",
    )
    add_bullets(doc, [
        "If any Distress signal is present, 40 points are subtracted from the score "
        "(floored at 0) — this flags real risk without necessarily erasing genuine "
        "positive activity from the same company.",
        "A company with zero corroborating signals gets a score of 0, not a fabricated "
        "estimate — it's held for a future run rather than misrepresented.",
    ])
    add_heading(doc, "Requirement estimation", level=2)
    add_table(
        doc,
        ["Basis", "When used", "Example"],
        [
            (
                "Confirmed requirement",
                "A source explicitly states a facility size",
                "\"~20,000 sq.ft. existing Surat facility\" (from an IPO prospectus)",
            ),
            (
                "AI-estimated requirement",
                "No explicit figure found — derived from a revenue-to-sqft heuristic "
                "bucket, always labeled as an estimate",
                "₹30–75 Cr → 20K–50K sq.ft.  ·  ₹1,000 Cr+ → 500K+ sq.ft.",
            ),
        ],
        col_widths=[3.5, 7, 6],
    )
    add_heading(doc, "Recommended action, by score", level=2)
    add_table(
        doc,
        ["Score", "Action"],
        [
            ("80+", "Contact within 48 hours"),
            ("60–79", "Add to active outreach list (contact within 7 days)"),
            ("40–59", "Add to warm list — revisit in 30 days"),
            ("< 40", "Low priority — monitor quarterly"),
            ("Any + distress flag", "Risk flag — verify before outreach; not a near-term opportunity"),
        ],
        col_widths=[3, 13.5],
    )
    add_heading(doc, "Signal freshness", level=2)
    add_para(
        doc,
        "Every signal carries a date (or \"recent\"/\"unknown\" when a source doesn't "
        "state one). Dates are normalized to a comparable year-month key so companies "
        "can be sorted or filtered by how recent their latest activity is — a key input "
        "given the goal is finding the latest thing happening at a company, not just the "
        "highest score.",
    )

    # ---------------- 8. Limitations ----------------
    add_heading(doc, "8. Known Limitations & Coverage Gaps", level=1)
    add_bullets(doc, [
        "Government/regulatory portals (GPCB, SEIAA, PARIVESH, MCA, tender sites) are "
        "not directly queried — only what a news article independently reports on them "
        "is captured. A licensed data feed or manual portal check would be needed to "
        "close this gap reliably.",
        "LinkedIn feed posts (linkedin.com/posts/...) are not search-indexed and require "
        "a logged-in session or Sales Navigator access to see — only long-form Pulse "
        "articles and job postings are reliably findable via search.",
        "Direct \"we need warehouse space\" requirement posts were tested explicitly and "
        "found to be almost nonexistent in indexed search results for this corridor — "
        "the one verified example found was six years old and 300 km outside the target "
        "geography. This is a near-zero-yield signal type with current tooling.",
        "Revenue figures for very small/private companies are sometimes unavailable or "
        "given only as a range; the pipeline never fabricates a number in that case.",
        "No contact/people data (names, emails, phone numbers of decision-makers) is "
        "produced yet — see the roadmap in Section 10.",
    ])

    # ---------------- 9. Outputs ----------------
    add_heading(doc, "9. Output Artifacts", level=1)
    add_table(
        doc,
        ["Artifact", "Grain", "Best for"],
        [
            (
                "opportunity_radar.csv",
                "One row per company",
                "Quick ranked overview — score, requirement, recommended action",
            ),
            (
                "opportunity_radar_full.csv",
                "One row per company, signals unpacked into numbered columns",
                "Filtering/sorting on a specific signal's type, date, or source in a "
                "spreadsheet",
            ),
            (
                "opportunity_radar_signals_long.csv",
                "One row per individual signal",
                "Pivoting — e.g. every expansion signal across all companies, sorted "
                "by date",
            ),
            (
                "Interactive dashboard (Artifact)",
                "One row per company, expandable",
                "Visual review — sortable by score or recency, filterable by "
                "confidence/distress/freshness",
            ),
        ],
        col_widths=[5, 6, 6],
    )

    # ---------------- 10. Roadmap ----------------
    add_heading(doc, "10. Roadmap — Contact Discovery (Proposed)", level=1)
    add_para(
        doc,
        "The pipeline currently stops at \"Company X scored 63 — here's why.\" The "
        "next stage needed to actually generate business is turning that into a named "
        "contact who can be called or emailed."
    )
    add_bullets(doc, [
        "Recommended source: Apollo.io or Lusha (both already connected as integrations "
        "in this environment) rather than scraping LinkedIn — these are purpose-built "
        "contact-enrichment databases with verified emails/phone numbers, filterable by "
        "title.",
        "Target titles: Head of Supply Chain, Logistics Manager, Plant Head, Facilities "
        "Manager, Procurement Head (or CFO at smaller companies).",
        "Recommended scope: only run contact lookups against the signal-scored "
        "shortlist (not the raw discovery list) — both tools charge per lookup/credit, "
        "so cost should track actual leads worth pursuing.",
        "Output: an outreach-ready export — company, score, why, contact name, title, "
        "email, phone, and a suggested opening line drawn from the specific signal "
        "found (e.g. referencing a recent capacity expansion).",
    ])
    add_callout(
        doc, "Status —",
        "Not yet built. This is a scoping proposal for the next stage, pending a "
        "decision on which tool (Apollo.io vs. Lusha) and what lookup budget to use.",
        bg="E3EDE2", label_color=GOOD,
    )

    doc.save("docs/Fairway_Company_Intelligence_Methodology.docx")
    print("Saved docs/Fairway_Company_Intelligence_Methodology.docx")


if __name__ == "__main__":
    build()
