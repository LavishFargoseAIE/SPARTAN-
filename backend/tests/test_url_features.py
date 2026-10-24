"""
Tests for URL feature extraction and ML inference module.
All tests are fully mocked — no disk I/O or real model loading.
"""
from __future__ import annotations

import math
from unittest.mock import MagicMock, patch

import pytest

from app.url_features import extract_url_features, FEATURE_NAMES, _shannon_entropy


# ---------------------------------------------------------------------------
# Shannon entropy helper
# ---------------------------------------------------------------------------

def test_entropy_empty_string():
    assert _shannon_entropy("") == 0.0


def test_entropy_single_char():
    assert _shannon_entropy("aaaa") == 0.0


def test_entropy_uniform():
    # "abcd" → 4 unique chars, each p=0.25 → entropy = 2.0 bits
    assert abs(_shannon_entropy("abcd") - 2.0) < 1e-9


# ---------------------------------------------------------------------------
# Feature extraction — clean / legit URL
# ---------------------------------------------------------------------------

def test_clean_url_features():
    # Use a neutral domain with no brand names in our suspicious-keywords list
    url = "https://www.example.com/articles/2024?page=1"
    feat = extract_url_features(url)

    assert set(feat.keys()) == set(FEATURE_NAMES), "Feature keys must match FEATURE_NAMES"
    assert feat["https"] == 1.0
    assert feat["has_ip"] == 0.0
    assert feat["has_at_sign"] == 0.0
    assert feat["tld_risk"] == 0.0
    assert feat["suspicious_keywords"] == 0.0
    assert feat["digit_ratio"] == 0.0  # "example" has no digits


def test_feature_order_matches_names():
    """The dict keys must appear in exactly the FEATURE_NAMES order."""
    url = "https://example.com/"
    feat = extract_url_features(url)
    assert list(feat.keys()) == FEATURE_NAMES


# ---------------------------------------------------------------------------
# Feature extraction — phishing-like URLs
# ---------------------------------------------------------------------------

def test_ip_based_url():
    url = "http://192.168.1.1/login/verify?token=abc123"
    feat = extract_url_features(url)
    assert feat["has_ip"] == 1.0
    assert feat["https"] == 0.0
    assert feat["suspicious_keywords"] >= 1.0  # "login" and/or "verify"


def test_high_risk_tld():
    url = "http://paypal-secure-login.tk/account/verify"
    feat = extract_url_features(url)
    assert feat["tld_risk"] == 1.0
    assert feat["suspicious_keywords"] >= 2.0  # paypal, secure/login/verify


def test_at_sign_trick():
    url = "http://legitimate.com@evil-phish.xyz/account"
    feat = extract_url_features(url)
    assert feat["has_at_sign"] == 1.0


def test_hex_encoding():
    url = "http://phish.tk/login%20verify%20secure?token=abc"
    feat = extract_url_features(url)
    assert feat["has_hex_encoding"] == 1.0


def test_suspicious_keywords_count():
    url = "http://fake-bank.xyz/login/signin/account/verify/password/credential"
    feat = extract_url_features(url)
    # Should pick up multiple keywords
    assert feat["suspicious_keywords"] >= 4.0


def test_subdomain_depth():
    url = "http://a.b.evil.com/path"
    feat = extract_url_features(url)
    # a.b.evil.com → parts = [a, b, evil, com] → depth = 2
    assert feat["subdomain_depth"] == 2.0


def test_high_entropy_domain():
    url = "http://xk7qm2z9rpw4.tk/login"
    feat = extract_url_features(url)
    assert feat["entropy"] > 3.0  # random-looking domain


# ---------------------------------------------------------------------------
# url_model.py — predict_url_risk (mocked)
# ---------------------------------------------------------------------------

def test_predict_url_risk_model_not_found():
    """When model file is absent, should return available=False."""
    import app.url_model as url_model_mod
    url_model_mod.reset_model()

    with patch("os.path.exists", return_value=False):
        result = url_model_mod.predict_url_risk("http://example.com/")

    assert result["available"] is False
    assert result["score"] == 0.0
    assert result["is_phishing"] is False


def test_predict_url_risk_model_available():
    """When model is loaded, should return a valid probability."""
    import app.url_model as url_model_mod
    url_model_mod.reset_model()

    # Build a mock sklearn-compatible classifier
    mock_clf = MagicMock()
    mock_clf.predict_proba.return_value = [[0.1, 0.9]]  # 90% phishing

    with patch("os.path.exists", return_value=True), \
         patch("joblib.load", return_value=mock_clf):
        result = url_model_mod.predict_url_risk("http://paypal-fake-login.tk/verify")

    url_model_mod.reset_model()  # cleanup singleton

    assert result["available"] is True
    assert abs(result["score"] - 0.9) < 1e-4
    assert result["is_phishing"] is True


def test_predict_url_risk_below_threshold():
    """Score below 0.7 → is_phishing=False."""
    import app.url_model as url_model_mod
    url_model_mod.reset_model()

    mock_clf = MagicMock()
    mock_clf.predict_proba.return_value = [[0.65, 0.35]]

    with patch("os.path.exists", return_value=True), \
         patch("joblib.load", return_value=mock_clf):
        result = url_model_mod.predict_url_risk("https://google.com/")

    url_model_mod.reset_model()

    assert result["available"] is True
    assert result["is_phishing"] is False
