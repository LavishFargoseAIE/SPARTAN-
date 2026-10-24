"""
Tests for Certificate Transparency module (cert_transparency.py).
All external HTTP calls to crt.sh are mocked — no real network I/O.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch

import pytest

from app.cert_transparency import (
    _parse_not_before,
    _extract_domains_from_cert,
    _is_cache_fresh,
    _CT_CACHE,
    analyze_cert_transparency,
    brand_cert_sweep,
    fetch_crtsh,
)


# ---------------------------------------------------------------------------
# Helper: build a fake cert record
# ---------------------------------------------------------------------------

def _make_cert(not_before: datetime, name_value: str, issuer: str = "Let's Encrypt") -> dict:
    return {
        "issuer_name": issuer,
        "common_name": name_value.split("\n")[0],
        "name_value": name_value,
        "not_before": not_before.isoformat(),
        "not_after": (not_before + timedelta(days=90)).isoformat(),
    }


# ---------------------------------------------------------------------------
# Unit tests — pure functions
# ---------------------------------------------------------------------------

def test_parse_not_before_valid():
    dt = _parse_not_before("2024-01-15T10:30:00Z")
    assert dt is not None
    assert dt.year == 2024
    assert dt.tzinfo is not None


def test_parse_not_before_empty():
    assert _parse_not_before("") is None
    assert _parse_not_before(None) is None


def test_extract_domains_single():
    cert = {"name_value": "evil-paypal.tk", "common_name": "evil-paypal.tk"}
    assert _extract_domains_from_cert(cert) == ["evil-paypal.tk"]


def test_extract_domains_wildcard_stripped():
    cert = {"name_value": "*.evil-paypal.tk\nevil-paypal.tk", "common_name": ""}
    domains = _extract_domains_from_cert(cert)
    assert "evil-paypal.tk" in domains
    # Wildcard asterisk should be stripped
    for d in domains:
        assert not d.startswith("*")


def test_extract_domains_multiline():
    cert = {"name_value": "a.example.com\nb.example.com\nc.example.com", "common_name": ""}
    domains = _extract_domains_from_cert(cert)
    assert len(domains) == 3
    assert "a.example.com" in domains


# ---------------------------------------------------------------------------
# analyze_cert_transparency — mocked
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ct_no_certs_scores_risk():
    """Zero certs → 'no_ct_history' signal, score > 0."""
    with patch("app.cert_transparency.fetch_domain_certs", new_callable=AsyncMock, return_value=[]):
        result = await analyze_cert_transparency("brand-new.tk", "brand-new.tk")

    assert result["available"] is True
    assert result["cert_count"] == 0
    assert result["ct_risk_score"] > 0
    assert "no_ct_history" in result["reasons"]


@pytest.mark.asyncio
async def test_ct_old_domain_no_risk():
    """Many old certs → low risk (established domain)."""
    now = datetime.now(timezone.utc)
    old_certs = [
        _make_cert(now - timedelta(days=365 + i * 30), "example.com")
        for i in range(10)
    ]
    with patch("app.cert_transparency.fetch_domain_certs", new_callable=AsyncMock, return_value=old_certs):
        result = await analyze_cert_transparency("example.com", "example.com")

    assert result["available"] is True
    assert result["cert_count"] == 10
    assert result["ct_risk_score"] < 0.4  # Established domain = low risk


@pytest.mark.asyncio
async def test_ct_fresh_cert_raises_score():
    """Single cert issued < 7 days ago → high risk."""
    now = datetime.now(timezone.utc)
    fresh_cert = [_make_cert(now - timedelta(days=2), "paypal-login.tk")]
    with patch("app.cert_transparency.fetch_domain_certs", new_callable=AsyncMock, return_value=fresh_cert):
        result = await analyze_cert_transparency("paypal-login.tk", "paypal-login.tk")

    assert result["available"] is True
    assert result["ct_risk_score"] >= 0.45
    # Should have both first_cert and fresh-domain signals
    assert any("cert" in r or "first" in r for r in result["reasons"])


@pytest.mark.asyncio
async def test_ct_brand_name_in_san():
    """Cert with brand keyword in SAN on a wrong domain → suspicious_names populated."""
    now = datetime.now(timezone.utc)
    cert = _make_cert(now - timedelta(days=1), "paypal-secure-login.xyz\npaypal.xyz")
    with patch("app.cert_transparency.fetch_domain_certs", new_callable=AsyncMock, return_value=[cert]):
        result = await analyze_cert_transparency(
            "paypal-secure-login.xyz", "paypal-secure-login.xyz",
            brand_tokens=["paypal"],
        )

    assert result["available"] is True
    assert len(result["suspicious_names"]) > 0
    assert result["ct_risk_score"] >= 0.55


@pytest.mark.asyncio
async def test_ct_unavailable_on_network_error():
    """If crt.sh is unreachable, available=False and score=0."""
    with patch("app.cert_transparency.fetch_domain_certs", new_callable=AsyncMock, side_effect=Exception("timeout")):
        result = await analyze_cert_transparency("example.com", "example.com")

    assert result["available"] is False
    assert result["ct_risk_score"] == 0.0


# ---------------------------------------------------------------------------
# brand_cert_sweep — mocked
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_brand_sweep_finds_fakes():
    """Sweep returns suspicious certs containing brand token on non-official domains."""
    now = datetime.now(timezone.utc)
    fake_cert = {
        "issuer_name": "Let's Encrypt",
        "common_name": "paypal-secure.tk",
        "name_value": "paypal-secure.tk\npaypal-verify.tk",
        "not_before": (now - timedelta(days=5)).isoformat(),
    }
    with patch("app.cert_transparency.fetch_crtsh", new_callable=AsyncMock, return_value=[fake_cert]):
        findings = await brand_cert_sweep("paypal", ["paypal.com", "paypal.me"], max_results=10, max_age_days=30)

    assert len(findings) >= 1
    assert any("paypal" in d for finding in findings for d in finding["suspicious_domains"])


@pytest.mark.asyncio
async def test_brand_sweep_excludes_official_domains():
    """Official domains should NOT appear in sweep findings."""
    now = datetime.now(timezone.utc)
    official_cert = {
        "issuer_name": "DigiCert",
        "common_name": "paypal.com",
        "name_value": "paypal.com\nwww.paypal.com",
        "not_before": (now - timedelta(days=10)).isoformat(),
    }
    with patch("app.cert_transparency.fetch_crtsh", new_callable=AsyncMock, return_value=[official_cert]):
        findings = await brand_cert_sweep("paypal", ["paypal.com"], max_results=10, max_age_days=30)

    # paypal.com is in official_domains — should not be flagged
    for f in findings:
        assert "paypal.com" not in f["suspicious_domains"]


@pytest.mark.asyncio
async def test_brand_sweep_empty_on_network_error():
    """Network failure → empty list, no crash."""
    with patch("app.cert_transparency.fetch_crtsh", new_callable=AsyncMock, side_effect=Exception("network error")):
        findings = await brand_cert_sweep("paypal", [], max_age_days=30)

    assert findings == []
