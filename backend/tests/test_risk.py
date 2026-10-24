import pytest
from app.registry import BrandEntry, BrandRegistry
from app.risk import (
    calculate_brand_confidence,
    compute_risk_score,
    get_verdict_level,
    resolve_official_brand,
)
from scripts.gen_keys import generate_keypair


@pytest.fixture
def mock_registry():
    priv, pub = generate_keypair()
    return BrandRegistry(private_key_b64=priv, public_key_b64=pub)


def test_empty_signals():
    # Must handle empty signals without division by zero
    assert compute_risk_score({}) == 0
    assert compute_risk_score({"L": None, "T": None}) == 0


def test_official_override():
    # Official site must always return 0, regardless of other signals
    signals = {"is_official": True, "L": 0.85, "T": 1.0, "D": 0.5}
    assert compute_risk_score(signals) == 0
    assert get_verdict_level(0) == "SAFE"


def test_threat_feed_override():
    # Threat feed hit (T >= 1.0) must force R >= 90 (Dangerous)
    signals = {"T": 1.0, "L": 0.1, "D": 0.1}
    score = compute_risk_score(signals)
    assert score >= 90
    assert get_verdict_level(score) == "DANGEROUS"


def test_cross_domain_credential_form_override():
    # C_form_cross_domain and L > 0.6 -> R >= 80 (Dangerous)
    signals = {"C_form_cross_domain": True, "L": 0.65, "T": 0.0, "D": 0.2}
    score = compute_risk_score(signals)
    assert score >= 80
    assert get_verdict_level(score) == "DANGEROUS"


def test_verdict_levels():
    assert get_verdict_level(0) == "SAFE"
    assert get_verdict_level(29) == "SAFE"
    assert get_verdict_level(30) == "SUSPICIOUS"
    assert get_verdict_level(69) == "SUSPICIOUS"
    assert get_verdict_level(70) == "DANGEROUS"
    assert get_verdict_level(91) == "DANGEROUS"
    assert get_verdict_level(100) == "DANGEROUS"


def test_worked_cases_from_specification():
    # From Figure A5 and page 16 of report:
    # 1. Official
    assert compute_risk_score({"is_official": True}) == 0

    # 2. Suspicious: L=0.75, D=0.40, category='bank'
    suspicious_score = compute_risk_score({"L": 0.75, "D": 0.40}, category="bank")
    assert 30 <= suspicious_score < 70
    assert get_verdict_level(suspicious_score) == "SUSPICIOUS"

    # 3. Dangerous: lookalike + threat feed hit
    dangerous_score = compute_risk_score({"L": 0.85, "T": 1.0, "D": 0.50}, category="bank")
    assert dangerous_score >= 90
    assert get_verdict_level(dangerous_score) == "DANGEROUS"


def test_brand_confidence_and_resolve_official(mock_registry):
    verified_brand = BrandEntry(
        brand_id="examplebank",
        display_name="Example Bank",
        category="bank",
        official_domains=["examplebank.bank.in"],
        canonical_url="https://www.examplebank.bank.in/",
        tokens=["examplebank"],
        token_match="substring",
        verified=True,
        needs_verification=False,
        version=1,
    )

    unverified_brand = BrandEntry(
        brand_id="unverifiedbank",
        display_name="Unverified Bank",
        category="bank",
        official_domains=["unverifiedbank.com"],
        canonical_url="https://unverifiedbank.com/",
        tokens=["unverifiedbank"],
        token_match="substring",
        verified=False,
        needs_verification=True,
        version=1,
    )

    # 1. Verified brand with confidence >= 0.80 -> returns signed official payload
    conf = calculate_brand_confidence(0.94)
    assert conf == 0.94
    resolved = resolve_official_brand(verified_brand, conf, mock_registry)
    assert resolved is not None
    assert resolved["name"] == "Example Bank"
    assert resolved["official_url"] == "https://www.examplebank.bank.in/"
    assert resolved["confidence"] == 0.94
    assert resolved["signature"] != ""
    assert mock_registry.verify_redirect(resolved["name"], resolved["official_url"], resolved["signature"]) is True

    # 2. Confidence < 0.80 -> returns None (no redirect button)
    low_conf = calculate_brand_confidence(0.75)
    assert resolve_official_brand(verified_brand, low_conf, mock_registry) is None

    # 3. Unverified brand (even with 0.95 confidence) -> returns None (Core Rule)
    assert resolve_official_brand(unverified_brand, 0.95, mock_registry) is None
