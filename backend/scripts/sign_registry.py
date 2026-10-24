#!/usr/bin/env python3
"""
Sign the Brand Registry entries using Ed25519 private key from environment/.env.
Validates each entry before signing and writes registry/brands.json.
"""

import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add backend directory to sys.path
root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir / "backend"))

from app.registry import sign_entry, validate_entry, verify_entry


EXAMPLE_BANK_DEV_ENTRY = {
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
    "verified": True,
    "needs_verification": False,
    "last_verified": "2026-09-14",
    "verified_by": "onboarding-2026-09-14",
    "version": 12,
    "dev_only": True,
    "shared_hosting_risk": False,
    "signature": None,
}


def main():
    load_dotenv(root_dir / ".env")
    priv_key_b64 = os.getenv("REGISTRY_SIGNING_PRIVATE_KEY")
    pub_key_b64 = os.getenv("REGISTRY_SIGNING_PUBLIC_KEY")

    if not priv_key_b64:
        print("ERROR: REGISTRY_SIGNING_PRIVATE_KEY is not set in environment or .env", file=sys.stderr)
        sys.exit(1)

    seed_file = root_dir / "registry" / "brands_seed.json"
    out_file = root_dir / "registry" / "brands.json"

    if not seed_file.exists():
        print(f"ERROR: {seed_file} not found!", file=sys.stderr)
        sys.exit(1)

    with open(seed_file, "r", encoding="utf-8") as f:
        brands = json.load(f)

    # Ensure fictional examplebank dev entry is present
    existing_ids = {b["brand_id"] for b in brands}
    if "examplebank" not in existing_ids:
        brands.append(EXAMPLE_BANK_DEV_ENTRY)

    all_errors = []
    signed_count = 0

    for b in brands:
        errs = validate_entry(b)
        if errs:
            all_errors.extend(errs)
            continue

        sig = sign_entry(b, priv_key_b64)
        b["signature"] = sig

        if pub_key_b64:
            if not verify_entry(b, pub_key_b64):
                all_errors.append(f"[{b['brand_id']}] Immediate verification failed after signing!")
        signed_count += 1

    if all_errors:
        print(f"Validation / Signing failed with {len(all_errors)} errors:", file=sys.stderr)
        for e in all_errors[:20]:
            print(f"  - {e}", file=sys.stderr)
        if len(all_errors) > 20:
            print(f"  ... and {len(all_errors) - 20} more", file=sys.stderr)
        sys.exit(1)

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(brands, f, indent=2, ensure_ascii=False)

    print(f"Successfully signed {signed_count} brand entries.")
    print(f"Output saved to {out_file}")


if __name__ == "__main__":
    main()
