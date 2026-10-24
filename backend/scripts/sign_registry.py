#!/usr/bin/env python3
"""
Sign all brand entries in the registry with the Ed25519 private key.
Outputs the signed list to registry/brands.json.
"""

from datetime import datetime, timezone
import json
import os
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.registry import BrandEntry, BrandRegistry, canonical_json

EXAMPLE_BANK = {
    "brand_id": "examplebank",
    "display_name": "Example Bank",
    "aliases": ["Example Bank Ltd", "EB Net Banking", "examplebank"],
    "category": "bank",
    "official_domains": ["examplebank.bank.in", "examplebank.co.in"],
    "associated_domains": ["pay.examplegateway.in"],
    "canonical_url": "https://www.examplebank.bank.in/",
    "login_url": "https://retail.examplebank.bank.in/login",
    "deep_links": {"cards": "https://www.examplebank.bank.in/cards"},
    "tokens": ["examplebank", "examplebnk", "eb-netbanking"],
    "token_match": "substring",
    "logo_hashes": ["f4c3e1a07b92d548"],
    "languages": ["en", "hi", "mr"],
    "verified_by": "onboarding-2026-09-14",
    "last_verified": "2026-09-14",
    "version": 12,
    "dev_only": True,
    "shared_hosting_risk": False,
    "verified": True,
    "needs_verification": False,
    "signature": None,
}


def main():
    root = Path(__file__).resolve().parent.parent.parent
    seed_path = root / "registry" / "brands_seed.json"
    dest_path = root / "registry" / "brands.json"

    if not seed_path.exists():
        print(f"[ERROR] Seed file not found at {seed_path}", file=sys.stderr)
        sys.exit(1)

    priv_b64 = settings.REGISTRY_SIGNING_PRIVATE_KEY
    pub_b64 = settings.REGISTRY_SIGNING_PUBLIC_KEY
    if not priv_b64:
        print("[ERROR] REGISTRY_SIGNING_PRIVATE_KEY not found in environment.", file=sys.stderr)
        sys.exit(1)

    reg = BrandRegistry(private_key_b64=priv_b64, public_key_b64=pub_b64)

    raw_data = json.loads(seed_path.read_text(encoding="utf-8"))
    entries: list[BrandEntry] = [BrandEntry(**item) for item in raw_data]

    # Include examplebank (fictional bank for dev/test) if not already present
    has_example = any(e.brand_id == "examplebank" for e in entries)
    if not has_example:
        entries.append(BrandEntry(**EXAMPLE_BANK))

    signed_dicts = []
    for entry in entries:
        # Validate domain pinning (canonical_url and login_url in official_domains)
        entry.validate_domain_pinning()
        reg.sign_entry(entry)
        assert reg.verify_entry(entry), f"Verification immediately failed for {entry.brand_id}"
        signed_dicts.append(entry.model_dump())

    dest_path.write_text(json.dumps(signed_dicts, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[OK] Successfully validated and signed {len(signed_dicts)} brand entries.")
    print(f"[OK] Written to {dest_path}")


if __name__ == "__main__":
    main()
