"""
Tests for Brand Registry integrity, Ed25519 signing, and signature verification.
"""

import json
from pathlib import Path
import pytest
from app.registry import BrandRegistry, canonical_bytes, sign_entry, validate_entry, verify_entry


@pytest.fixture
def keys_and_entry():
    from cryptography.hazmat.primitives.asymmetric import ed25519
    import base64

    priv = ed25519.Ed25519PrivateKey.generate()
    pub = priv.public_key()
    priv_b64 = base64.b64encode(priv.private_bytes_raw()).decode("utf-8")
    pub_b64 = base64.b64encode(pub.public_bytes_raw()).decode("utf-8")

    sample = {
        "brand_id": "test-bank",
        "display_name": "Test Bank",
        "aliases": ["Test Bank"],
        "category": "bank",
        "official_domains": ["testbank.bank.in"],
        "associated_domains": [],
        "canonical_url": "https://testbank.bank.in/",
        "login_url": None,
        "deep_links": {},
        "tokens": ["testbank"],
        "token_match": "substring",
        "logo_hashes": [],
        "languages": ["en"],
        "verified": True,
        "needs_verification": False,
        "last_verified": "2026-10-24",
        "verified_by": "tester",
        "version": 1,
        "dev_only": False,
        "shared_hosting_risk": False,
        "signature": None,
    }
    return priv_b64, pub_b64, sample


def test_sign_and_verify(keys_and_entry):
    priv_b64, pub_b64, sample = keys_and_entry

    # Sign
    sig = sign_entry(sample, priv_b64)
    assert sig is not None
    sample["signature"] = sig

    # Verify
    assert verify_entry(sample, pub_b64) is True


def test_tamper_detection(keys_and_entry):
    priv_b64, pub_b64, sample = keys_and_entry
    sig = sign_entry(sample, priv_b64)
    sample["signature"] = sig

    # Tamper with official redirect target
    sample["canonical_url"] = "https://attacker.evil.com/"
    assert verify_entry(sample, pub_b64) is False

    # Tamper with display name
    sample["canonical_url"] = "https://testbank.bank.in/"
    sample["display_name"] = "Phishing Bank"
    assert verify_entry(sample, pub_b64) is False

    # Tamper with signature itself
    sample["display_name"] = "Test Bank"
    sample["signature"] = "tampered" + sig[8:]
    assert verify_entry(sample, pub_b64) is False


def test_validation_rules():
    # Valid entry
    valid = {
        "brand_id": "valid-bank",
        "display_name": "Valid Bank",
        "official_domains": ["validbank.com"],
        "associated_domains": [],
        "canonical_url": "https://validbank.com/",
        "tokens": ["validbank"],
        "token_match": "substring",
    }
    assert validate_entry(valid) == []

    # Invalid canonical_url host
    invalid = {
        "brand_id": "invalid-bank",
        "display_name": "Invalid Bank",
        "official_domains": ["validbank.com"],
        "canonical_url": "https://malicious.com/",
        "tokens": ["validbank"],
    }
    errors = validate_entry(invalid)
    assert len(errors) > 0
    assert "canonical_url host" in errors[0]


def test_registry_file_loading():
    root = Path(__file__).resolve().parent.parent.parent
    brands_path = root / "registry" / "brands.json"
    assert brands_path.exists(), "registry/brands.json should exist"

    registry = BrandRegistry(brands_file=brands_path)
    assert len(registry.brands) >= 624

    # Example bank lookup
    eb = registry.get_brand("examplebank")
    assert eb is not None
    assert eb["display_name"] == "Example Bank"

    # Domain lookup
    found = registry.find_by_domain("examplebank.bank.in")
    assert found is not None
    assert found["brand_id"] == "examplebank"
