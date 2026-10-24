"""
Tests for web_surfer.py — uses mocks so no real HTTP calls are made.
"""
from __future__ import annotations
import pytest
from unittest.mock import AsyncMock, patch

from app.web_surfer import analyze_web_reputation


@pytest.mark.asyncio
async def test_genuine_confirmed_via_wikipedia():
    """Wikipedia hit + no scam reports → GENUINE_CONFIRMED, unlock=True."""
    with patch("app.web_surfer.check_wikipedia", new=AsyncMock(
        return_value=(True, "State Bank of India", "SBI official banking site")
    )):
        with patch("app.web_surfer.check_community_discussions", new=AsyncMock(
            return_value=(0, 1, ["Safe site, works fine"])
        )):
            result = await analyze_web_reputation("sbi.co.in", "sbi.co.in")
            assert result["is_genuine"] is True
            assert result["unlock"] is True
            assert result["status"] == "GENUINE_CONFIRMED"
            assert result["wiki_article"] == "State Bank of India"


@pytest.mark.asyncio
async def test_scam_flagged():
    """Multiple scam hits → SCAM_REPORTED, unlock=False."""
    with patch("app.web_surfer.check_wikipedia", new=AsyncMock(
        return_value=(False, None, None)
    )):
        with patch("app.web_surfer.check_community_discussions", new=AsyncMock(
            return_value=(3, 0, ["This is a scam", "Fraud site!", "Beware phishing"])
        )):
            result = await analyze_web_reputation("sbi-phishing.xyz", "sbi-phishing.xyz")
            assert result["is_genuine"] is False
            assert result["unlock"] is False
            assert result["status"] == "SCAM_REPORTED"
            assert result["scam_reports"] == 3


@pytest.mark.asyncio
async def test_community_verified():
    """No Wikipedia, but many legit hits → COMMUNITY_VERIFIED, unlock=True."""
    with patch("app.web_surfer.check_wikipedia", new=AsyncMock(
        return_value=(False, None, None)
    )):
        with patch("app.web_surfer.check_community_discussions", new=AsyncMock(
            return_value=(0, 2, ["Legit website, safe to use", "Verified and genuine"])
        )):
            result = await analyze_web_reputation("newlegit.com", "newlegit.com")
            assert result["is_genuine"] is True
            assert result["unlock"] is True
            assert result["status"] == "COMMUNITY_VERIFIED"


@pytest.mark.asyncio
async def test_unknown_domain():
    """No Wikipedia, no community signals → UNVERIFIED_NEW, unlock=False."""
    with patch("app.web_surfer.check_wikipedia", new=AsyncMock(
        return_value=(False, None, None)
    )):
        with patch("app.web_surfer.check_community_discussions", new=AsyncMock(
            return_value=(0, 0, [])
        )):
            result = await analyze_web_reputation("brandnewdomain123.io", "brandnewdomain123.io")
            assert result["is_genuine"] is False
            assert result["unlock"] is False
            assert result["status"] == "UNVERIFIED_NEW"


@pytest.mark.asyncio
async def test_exception_resilience():
    """If sub-checks raise exceptions, result should still return gracefully."""
    with patch("app.web_surfer.check_wikipedia", new=AsyncMock(
        side_effect=Exception("Network error")
    )):
        with patch("app.web_surfer.check_community_discussions", new=AsyncMock(
            side_effect=Exception("Timeout")
        )):
            result = await analyze_web_reputation("anything.com", "anything.com")
            # Should not raise, should return UNVERIFIED_NEW
            assert result["status"] == "UNVERIFIED_NEW"
            assert result["unlock"] is False
