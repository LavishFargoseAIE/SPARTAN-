"""
Integration tests for FastAPI endpoints:
/v1/check, /v1/report, /v1/registry/snapshot, /v1/brand/{id}, and /v1/health.
"""

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_endpoint():
    resp = client.get("/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["brands_loaded"] >= 624


def test_check_fake_site():
    # Known fake site with verified brand (examplebank)
    resp = client.post("/v1/check", json={"host": "examplebank-secure-login.xyz", "lang": "en"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["level"] == "DANGEROUS"
    assert data["score"] >= 70
    assert len(data["reasons"]) > 0
    assert data["brand"] is not None
    assert data["brand"]["name"] == "Example Bank"
    # One-tap redirect must be present for verified brand with high confidence
    assert data["brand"]["official_url"] == "https://www.examplebank.bank.in/"
    assert data["brand"]["signature"] is not None
    assert data["brand"]["verified"] is True


def test_check_genuine_site():
    # Genuine bank domain
    resp = client.post("/v1/check", json={"host": "www.examplebank.bank.in"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["level"] == "SAFE"
    assert data["score"] == 0
    assert data["analysis"] == "allowlist"


def test_no_path_or_query_leaks():
    # Attempt to send full URL with secret query parameters and paths
    dirty_input = "https://examplebank-secure-login.xyz/login/step2?token=secret123&session=abc#fragment"
    resp = client.post("/v1/check", json={"host": dirty_input})
    assert resp.status_code == 200
    data = resp.json()
    # The response host MUST only be the cleaned hostname
    assert data["host"] == "examplebank-secure-login.xyz"
    assert "token" not in str(data)
    assert "session" not in str(data)
    assert "secret123" not in str(data)
    assert "step2" not in str(data)


def test_unverified_brand_redirect_disabled():
    # A brand from seed that has verified: false
    # Lookalike attack targeting that unverified brand should flag warning, but NOT offer 1-tap redirect
    resp = client.post("/v1/check", json={"host": "sbi-online-banking-kyc.xyz"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["level"] == "DANGEROUS"
    if data.get("brand") and not data["brand"].get("verified"):
        # For unverified brands, redirect must be disabled
        assert data["brand"]["official_url"] is None


def test_registry_snapshot_and_etag():
    # 1. Fetch snapshot
    resp1 = client.get("/v1/registry/snapshot")
    assert resp1.status_code == 200
    etag = resp1.headers.get("ETag")
    assert etag is not None

    # 2. Re-fetch with If-None-Match header -> must return 304 Not Modified
    resp2 = client.get("/v1/registry/snapshot", headers={"If-None-Match": etag})
    assert resp2.status_code == 304


def test_brand_endpoint():
    # Existing brand
    resp = client.get("/v1/brand/examplebank")
    assert resp.status_code == 200
    b = resp.json()
    assert b["brand_id"] == "examplebank"
    assert b["signature"] is not None

    # Unknown brand
    resp404 = client.get("/v1/brand/non-existent-brand-12345")
    assert resp404.status_code == 404


def test_report_endpoint():
    resp = client.post(
        "/v1/report",
        json={"host": "suspicious-phish.xyz/path?token=123", "comments": "SMS phishing message received"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "received"
    # Stripped host
    assert data["host"] == "suspicious-phish.xyz"
