#!/usr/bin/env python3
"""
Admin CLI tool: Verify a brand in registry/brands.json.
Sets verified: true, needs_verification: false, last_verified: today, and verified_by.
Re-signs the modified entry with the Ed25519 private key.

Usage:
    python backend/scripts/verify_brand.py <brand_id> [--verified-by <name>]
"""

import argparse
from datetime import datetime, timezone
import json
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

root_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(root_dir / "backend"))

from app.registry import sign_entry, validate_entry, verify_entry


def main():
    parser = argparse.ArgumentParser(description="Verify a brand in the SiteGuard registry")
    parser.add_argument("brand_id", help="The brand_id to mark as verified (e.g. state-bank-of-india)")
    parser.add_argument("--verified-by", default="admin", help="Identifier of the verifier")
    args = parser.parse_args()

    load_dotenv(root_dir / ".env")
    priv_key_b64 = os.getenv("REGISTRY_SIGNING_PRIVATE_KEY")
    pub_key_b64 = os.getenv("REGISTRY_SIGNING_PUBLIC_KEY")

    if not priv_key_b64:
        print("ERROR: REGISTRY_SIGNING_PRIVATE_KEY is not set in environment or .env", file=sys.stderr)
        sys.exit(1)

    registry_path = root_dir / "registry" / "brands.json"
    if not registry_path.exists():
        print(f"ERROR: {registry_path} does not exist!", file=sys.stderr)
        sys.exit(1)

    with open(registry_path, "r", encoding="utf-8") as f:
        brands = json.load(f)

    target = None
    for b in brands:
        if b["brand_id"] == args.brand_id:
            target = b
            break

    if not target:
        print(f"ERROR: Brand '{args.brand_id}' not found in registry!", file=sys.stderr)
        sys.exit(1)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    target["verified"] = True
    target["needs_verification"] = False
    target["last_verified"] = today
    target["verified_by"] = args.verified_by
    target["version"] = target.get("version", 1) + 1

    errs = validate_entry(target)
    if errs:
        print("Validation errors on brand entry:", file=sys.stderr)
        for e in errs:
            print(f"  - {e}", file=sys.stderr)
        sys.exit(1)

    # Re-sign
    target["signature"] = sign_entry(target, priv_key_b64)

    if pub_key_b64 and not verify_entry(target, pub_key_b64):
        print("ERROR: Signature verification failed after signing!", file=sys.stderr)
        sys.exit(1)

    with open(registry_path, "w", encoding="utf-8") as f:
        json.dump(brands, f, indent=2, ensure_ascii=False)

    print(f"Successfully verified and re-signed brand '{args.brand_id}'.")
    print(f"Verified by: {args.verified_by}, Date: {today}, Version: {target['version']}")


if __name__ == "__main__":
    main()
