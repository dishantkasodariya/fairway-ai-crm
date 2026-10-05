from scoring.fusion import fuse_signals, merge_requirement, sqft_bucket_for_revenue


def test_regulatory_closure_reclassified_as_distress_and_suppresses_score():
    """Regression case: Tatva Chintan's GPCB closure directive was originally
    scored as a positive 'regulatory' signal (+12). It's actually a risk
    event and must be reclassified to 'distress', which suppresses the
    score by 40 (floored at 0) instead of adding to it."""
    signals = [
        {
            "type": "expansion",
            "summary": "Tatva Chintan's board approved a new greenfield unit at Dahej-III, Bharuch.",
            "date": "2026-07",
            "source_name": "MarketScreener",
            "source_url": "https://www.marketscreener.com/news/example",
            "confidence": "high",
        },
        {
            "type": "regulatory",
            "summary": (
                "GPCB issued a closure directive against Tatva Chintan's Ankleshwar GIDC plant, "
                "citing environmental compliance issues."
            ),
            "date": "2024-09",
            "source_name": "Indian Chemical News",
            "source_url": "https://www.indianchemicalnews.com/regulatory/example",
            "confidence": "high",
        },
        {
            "type": "filings",
            "summary": "Board approved raising borrowing limit from Rs 300 crore to Rs 1,000 crore.",
            "date": "2026-07",
            "source_name": "Whalesbook",
            "source_url": "https://www.whalesbook.com/example",
            "confidence": "medium",
        },
        {
            "type": "hiring",
            "summary": "LinkedIn post tagged #hiring indicating active recruitment.",
            "date": "unknown",
            "source_name": "LinkedIn",
            "source_url": "https://www.linkedin.com/posts/example",
            "confidence": "low",
        },
    ]

    result = fuse_signals(revenue_cr=450.0, signals=signals)

    assert result["opportunity_score"] == 8  # expansion(25)+filings(8)+hiring(15)=48, -40 distress -> 8
    assert "distress signal present" in result["why"]
    assert result["recommended_action"].startswith("Risk flag")


def test_normal_expansion_and_funding_signals_score_additively():
    signals = [
        {"type": "expansion", "summary": "x", "date": "2026-01", "source_name": "n", "source_url": "u1", "confidence": "high"},
        {"type": "funding", "summary": "x", "date": "2026-02", "source_name": "n", "source_url": "u2", "confidence": "high"},
    ]
    result = fuse_signals(revenue_cr=200.0, signals=signals)
    assert result["opportunity_score"] == 45  # 25 + 20
    assert result["confidence"] == "high"
    assert result["recommended_action"] == "Add to warm list — revisit in 30 days"  # 40 <= 45 < 60


def test_no_signals_yields_low_confidence_monitor_action():
    result = fuse_signals(revenue_cr=100.0, signals=[])
    assert result["opportunity_score"] == 0
    assert result["signal_count"] == 0
    assert "no corroborating signal" in result["confidence"]
    assert result["recommended_action"].startswith("Monitor only")


def test_signals_missing_source_url_are_ignored():
    signals = [{"type": "expansion", "summary": "x", "date": "2026-01", "source_name": "n", "source_url": "", "confidence": "high"}]
    result = fuse_signals(revenue_cr=100.0, signals=signals)
    assert result["opportunity_score"] == 0
    assert result["signal_count"] == 0


def test_requirement_uses_confirmed_sqft_when_provided():
    result = fuse_signals(revenue_cr=900.0, signals=[], estimated_sqft="120,000 sq.ft.")
    assert result["estimated_requirement"] == "120,000 sq.ft."
    assert result["requirement_basis"] == "Confirmed requirement"


def test_requirement_falls_back_to_revenue_heuristic():
    result = fuse_signals(revenue_cr=900.0, signals=[])
    assert result["requirement_basis"] == "AI-estimated requirement (revenue-based heuristic)"
    assert result["estimated_requirement"] == sqft_bucket_for_revenue(900.0)


def test_sqft_bucket_boundaries():
    assert sqft_bucket_for_revenue(50) == "20,000-50,000 sq.ft."
    assert sqft_bucket_for_revenue(75) == "20,000-50,000 sq.ft."
    assert sqft_bucket_for_revenue(76) == "50,000-100,000 sq.ft."
    assert sqft_bucket_for_revenue(5000) == "500,000+ sq.ft."


def test_confirmed_requirement_survives_a_later_estimate():
    kept = merge_requirement(
        "~20,000 sq.ft. (existing Surat facility)", "Confirmed requirement",
        "20,000-50,000 sq.ft.", "AI-estimated requirement (revenue-based heuristic)",
    )
    assert kept == ("~20,000 sq.ft. (existing Surat facility)", "Confirmed requirement")


def test_new_confirmed_requirement_replaces_old_one_and_estimates_replace_estimates():
    assert merge_requirement("old", "Confirmed requirement", "new 40,000 sq.ft.", "Confirmed requirement") == (
        "new 40,000 sq.ft.", "Confirmed requirement")
    assert merge_requirement("a", "AI-estimated requirement (revenue-based heuristic)", "b", "Unavailable") == (
        "b", "Unavailable")
    assert merge_requirement(None, None, "c", "Unavailable") == ("c", "Unavailable")
