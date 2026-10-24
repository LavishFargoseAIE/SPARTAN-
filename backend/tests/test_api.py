import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app, registry


@pytest.mark.asyncio
async def test_health_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/v1/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "healthy"
        assert data["brands_loaded"] >= 624


@pytest.mark.asyncio
async def test_check_official_site():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # SBI official
        res = await client.post("/v1/check", json={"host": "sbi.co.in"})
        assert res.status_code == 200
        data = res.json()
        assert data["level"] == "SAFE"
        assert data["score"] == 0
        assert data["brand"] is None

        # Example Bank official
        res2 = await client.post("/v1/check", json={"host": "www.examplebank.bank.in"})
        assert res2.status_code == 200
        data2 = res2.json()
        assert data2["level"] == "SAFE"
        assert data2["score"] == 0


@pytest.mark.asyncio
async def test_check_dangerous_fake_site():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/v1/check", json={"host": "examplebank-secure-login.xyz"})
        assert res.status_code == 200
        data = res.json()
        assert data["level"] == "DANGEROUS"
        assert data["score"] >= 70
        assert data["brand"] is not None
        assert data["brand"]["name"] == "Example Bank"
        assert data["brand"]["official_url"] == "https://www.examplebank.bank.in/"
        assert data["brand"]["confidence"] >= 0.80

        # Cryptographic signature verification of redirect payload
        assert registry.verify_redirect(
            data["brand"]["name"],
            data["brand"]["official_url"],
            data["brand"]["signature"],
        ) is True


@pytest.mark.asyncio
async def test_check_shared_hosting_phishing_site():
    """
    Ensure user-generated subdomains on shared hosting platforms (e.g. wixsite.com)
    impersonating financial brands are detected as DANGEROUS with verified redirect.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/v1/check", json={"host": "sbicardonlin78.wixsite.com"})
        assert res.status_code == 200
        data = res.json()
        assert data["level"] == "DANGEROUS"
        assert data["score"] >= 75
        assert "shared_hosting_abuse" in data["reasons"] or "subdomain_abuse" in data["reasons"]
        assert data["brand"] is not None
        assert data["brand"]["name"] == "SBI Card"
        assert data["brand"]["official_url"] == "https://sbicard.com/"
        assert registry.verify_redirect(
            data["brand"]["name"],
            data["brand"]["official_url"],
            data["brand"]["signature"],
        ) is True


@pytest.mark.asyncio
async def test_no_path_query_in_check():
    """
    Ensure API normalizes and strips any accidental path, query parameters,
    or credentials so no private browsing URL parameters are processed or logged.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Provide path and query in input
        res = await client.post(
            "/v1/check",
            json={"host": "https://examplebank-secure-login.xyz/login/auth?user_id=12345&token=secret"},
        )
        assert res.status_code == 200
        data = res.json()
        # The returned host MUST be strictly the normalized host name, never containing path or query
        assert data["host"] == "examplebank-secure-login.xyz"
        assert "user_id" not in data["host"]
        assert "secret" not in data["host"]


@pytest.mark.asyncio
async def test_registry_snapshot_and_etag():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/v1/registry/snapshot")
        assert res.status_code == 200
        etag = res.headers.get("ETag")
        assert etag is not None
        data = res.json()
        assert "official_domains" in data
        assert len(data["official_domains"]) > 600

        # 304 Not Modified when ETag matches
        res304 = await client.get("/v1/registry/snapshot", headers={"If-None-Match": etag})
        assert res304.status_code == 304


@pytest.mark.asyncio
async def test_report_endpoint():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post(
            "/v1/report",
            json={"host": "phishing-bank-fake.top", "reason": "user_report", "details": "SMS received"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "received"
        assert "report_id" in data


@pytest.mark.asyncio
async def test_benign_corpus_zero_dangerous_verdicts():
    """
    Core Acceptance Criterion:
    Benign corpus (top popular sites + genuine subdomains of registered brands)
    produces 0 DANGEROUS verdicts and false-positive rate under 0.1%.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # 1. Test sample of top popular global domains
        popular_benign = [
            "google.com",
            "youtube.com",
            "wikipedia.org",
            "github.com",
            "stackoverflow.com",
            "microsoft.com",
            "apple.com",
            "amazon.com",
            "netflix.com",
            "linkedin.com",
            "cloudflare.com",
            "python.org",
            "mozilla.org",
            "fastapi.tiangolo.com",
            "w3schools.com",
        ]
        for host in popular_benign:
            res = await client.post("/v1/check", json={"host": host})
            assert res.status_code == 200
            data = res.json()
            assert data["level"] == "SAFE", f"Popular site {host} falsely flagged as {data['level']} (score: {data['score']})"

        # 2. Test genuine subdomains across registered brands
        all_brands = registry.all_brands()
        subdomain_prefixes = ["www.", "login.", "secure.", "retail.", "app.", "portal.", "online."]

        tested_count = 0
        false_dangerous_count = 0

        for b in all_brands[:100]:  # Test across first 100 brands
            for dom in b.official_domains:
                for prefix in subdomain_prefixes:
                    sub_host = f"{prefix}{dom}"
                    tested_count += 1
                    res = await client.post("/v1/check", json={"host": sub_host})
                    data = res.json()
                    if data["level"] == "DANGEROUS":
                        false_dangerous_count += 1

        assert tested_count > 500
        assert false_dangerous_count == 0, f"False dangerous count on genuine subdomains was {false_dangerous_count}"
