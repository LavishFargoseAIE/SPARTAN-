import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import patch, AsyncMock
from app.normalize import normalize_host
from app.domain_intel import (
    get_domain_intel,
    parse_rdap_registration_date,
    is_in_tranco,
    check_dns_health,
)


def test_parse_rdap_registration_date():
    sample_rdap = {
        "events": [
            {"eventAction": "last update of RDAP database", "eventDate": "2026-10-24T12:00:00Z"},
            {"eventAction": "registration", "eventDate": "2026-10-01T08:30:00Z"},
            {"eventAction": "expiration", "eventDate": "2027-10-01T08:30:00Z"},
        ]
    }
    date = parse_rdap_registration_date(sample_rdap)
    assert date is not None
    assert date.year == 2026
    assert date.month == 10
    assert date.day == 1


def test_tranco_check():
    assert is_in_tranco("google.com") is True
    assert is_in_tranco("sbi.co.in") is True
    assert is_in_tranco("totally-fake-phishing-xyz-123.com") is False


@pytest.mark.asyncio
async def test_domain_intel_suspicious_tld_and_hyphens():
    norm = normalize_host("secure-login-portal.xyz")
    score, reasons = await get_domain_intel(norm)
    assert score >= 0.40
    assert "suspicious_tld" in reasons
    assert "suspicious_domain_structure" in reasons


@pytest.mark.asyncio
async def test_domain_intel_recent_registration():
    recent_date = datetime.now(timezone.utc) - timedelta(days=5)
    with patch("app.domain_intel.fetch_rdap_info", new_callable=AsyncMock) as mock_rdap:
        mock_rdap.return_value = (recent_date, "Example Registrar Inc.")
        norm = normalize_host("brand-update-verify.com")
        score, reasons = await get_domain_intel(norm)
        assert score >= 0.70
        assert "domain_age_under_30d" in reasons


@pytest.mark.asyncio
async def test_domain_intel_fail_safe_on_network_error():
    with patch("app.domain_intel.fetch_rdap_info", new_callable=AsyncMock) as mock_rdap:
        mock_rdap.side_effect = Exception("Network timeout")
        norm = normalize_host("regularsite.org")
        score, reasons = await get_domain_intel(norm)
        # Should not throw exception, returns base assessment
        assert isinstance(score, float)
        assert isinstance(reasons, list)


@pytest.mark.asyncio
async def test_dns_health_check():
    health = await check_dns_health("google.com")
    assert isinstance(health, dict)
    assert "resolves" in health
