import pytest
from app.registry import (
    BrandEntry,
    BrandRegistry,
    canonical_json,
    canonical_redirect_json,
    load_registry,
)
from scripts.gen_keys import generate_keypair


@pytest.fixture
def keys():
    priv, pub = generate_keypair()
    return priv, pub


@pytest.fixture
def registry(keys):
    priv, pub = keys
    return BrandRegistry(private_key_b64=priv, public_key_b64=pub)


def test_domain_pinning_validation():
    # Valid brand
    valid = BrandEntry(
        brand_id="test-bank",
        display_name="Test Bank",
        category="bank",
        official_domains=["testbank.com"],
        canonical_url="https://testbank.com/",
        login_url="https://login.testbank.com/auth",
        tokens=["testbank"],
        token_match="substring",
        verified=True,
        version=1,
    )
    valid.validate_domain_pinning()

    # Invalid canonical_url host
    invalid = BrandEntry(
        brand_id="bad-bank",
        display_name="Bad Bank",
        category="bank",
        official_domains=["goodbank.com"],
        canonical_url="https://evil-phish.xyz/",
        tokens=["badbank"],
        token_match="substring",
        verified=True,
        version=1,
    )
    with pytest.raises(ValueError, match="not in official_domains"):
        invalid.validate_domain_pinning()


def test_registry_signing_and_verification(registry):
    entry = BrandEntry(
        brand_id="test-bank",
        display_name="Test Bank",
        category="bank",
        official_domains=["testbank.com"],
        canonical_url="https://testbank.com/",
        tokens=["testbank"],
        token_match="substring",
        verified=True,
        version=1,
    )

    sig = registry.sign_entry(entry)
    assert sig is not None
    assert registry.verify_entry(entry) is True

    # Tampering with display name
    entry.display_name = "Tampered Bank"
    assert registry.verify_entry(entry) is False


def test_redirect_signature_and_tampering(registry):
    name = "Example Bank"
    url = "https://www.examplebank.bank.in/"
    sig = registry.sign_redirect(name, url)

    assert registry.verify_redirect(name, url, sig) is True

    # Tamper with URL
    assert registry.verify_redirect(name, "https://attacker.com/", sig) is False
    # Tamper with Name
    assert registry.verify_redirect("Fake Bank", url, sig) is False
    # Tamper with signature
    assert registry.verify_redirect(name, url, sig[:-4] + "AAAA") is False


def test_loaded_registry_integrity():
    reg = load_registry()
    brands = reg.all_brands()
    assert len(brands) >= 624

    # Check that examplebank is present
    ex = reg.get("examplebank")
    assert ex is not None
    assert "examplebank.bank.in" in ex.official_domains
    assert ex.verified is True

    # Verify official domain lookup
    assert reg.is_official("sbi.co.in") is True
    assert reg.is_official("hdfcbank.com") is True
    assert reg.is_official("evilbank.com") is False
