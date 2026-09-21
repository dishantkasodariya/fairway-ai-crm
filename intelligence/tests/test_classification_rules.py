from classification.rules import classify


def test_classifies_known_categories():
    assert classify("ABC Solar Energy Pvt Ltd") == "Solar/Renewable Energy"
    assert classify("XYZ Pharma Formulations Ltd") == "Pharma/Life Sciences"
    assert classify("Gujarat Agrochem Industries") == "Agrochemicals/Fertilizer"
    assert classify("National Plastics Packaging Co") == "Plastics/Packaging"
    assert classify("Surat Textile Mills") == "Textile"


def test_more_specific_category_wins_over_broader_one():
    # "agrochem" must match Agrochemicals/Fertilizer, not fall through to Chemicals,
    # even though both categories could plausibly match "chem"-like substrings.
    assert classify("Bharat Agrochem Ltd") == "Agrochemicals/Fertilizer"


def test_unmatched_name_returns_question_mark():
    assert classify("Random Unclassifiable Ventures LLP") == "?"


def test_handles_none_and_empty_name():
    assert classify(None) == "?"
    assert classify("") == "?"


def test_case_insensitive():
    assert classify("SURAT CHEMICAL WORKS") == "Chemicals"
    assert classify("surat chemical works") == "Chemicals"
