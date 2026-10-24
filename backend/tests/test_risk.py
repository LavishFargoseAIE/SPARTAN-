"""
Unit tests for risk calculation, signal weight renormalization, and override logic.
"""

import pytest
from app.risk import (
    REDIRECT_MIN_CONFIDENCE,
    calculate_brand_confidence,
    compute_risk,
    get_risk_level,
    is_redirect_allowed,
)


def test_empty_signals():
    # Should not raise ZeroDivisionError
    assert compute_risk({}) == 0
    assert get_risk_level(0) == "SAFE"


def test_standard_scoring():
    # Single L signal of 0.8 -> renormalised weight is 1.0 -> score 80
    assert compute_risk({"L": 0.8}) == 80
    assert get_risk_level(80) == "DANGEROUS"

    # L=0.5, T=0.0 -> weighted: (0.5 * 0.3 + 0.0 * 0.2) / 0.5 = 0.15 / 0.5 = 0.30 -> 30
    score = compute_risk({"L": 0.5, "T": 0.0})
    assert score == 30
    assert get_risk_level(score) == "SUSPICIOUS"

    # Low score
    assert compute_risk({"L": 0.1, "D": 0.05}) < 30
    assert get_risk_level(20) == "SAFE"


def test_threat_feed_override():
    # Threat feed hit (T >= 1.0) must produce score >= 90
    score = compute_risk({"T": 1.0, "L": 0.0})
    assert score >= 90
    assert get_risk_level(score) == "DANGEROUS"


def test_cross_domain_credential_override():
    # Cross domain credential form with L > 0.6 must produce score >= 80
    score = compute_risk({"C_form_cross_domain": 1.0, "L": 0.65})
    assert score >= 80
    assert get_risk_level(score) == "DANGEROUS"


def test_bank_category_multiplier():
    # Category multiplier for bank should boost score
    std_score = compute_risk({"L": 0.6, "D": 0.1})
    bank_score = compute_risk({"L": 0.6, "D": 0.1}, category="bank")
    assert bank_score >= std_score


def test_brand_confidence():
    # V is None
    assert calculate_brand_confidence(0.85, None) == 0.85

    # V is provided
    assert calculate_brand_confidence(0.9, 0.7) == 0.9  # max(0.9, 0.8) = 0.9
    assert calculate_brand_confidence(0.6, 0.8) == 0.7  # max(0.6, 0.7) = 0.7


def test_redirect_rules():
    # Verified brand with high confidence -> Redirect Allowed
    verified_brand = {
        "brand_id": "sbi",
        "verified": True,
        "canonical_url": "https://sbi.co.in/",
    }
    assert is_redirect_allowed(verified_brand, 0.85) is True

    # Low confidence (< 0.80) -> Redirect Disabled
    assert is_redirect_allowed(verified_brand, 0.75) is False

    # Unverified brand (even with high confidence) -> Redirect Disabled (Warning Only)
    unverified_brand = {
        "brand_id": "unverified-bank",
        "verified": False,
        "canonical_url": "https://example.com/",
    }
    assert is_redirect_allowed(unverified_brand, 0.95) is False

    # Missing canonical_url -> Redirect Disabled
    no_url_brand = {"brand_id": "no-url", "verified": True, "canonical_url": None}
    assert is_redirect_allowed(no_url_brand, 0.95) is False
