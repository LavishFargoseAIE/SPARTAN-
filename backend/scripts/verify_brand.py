#!/usr/bin/env python3
"""
Admin CLI tool to verify a brand in the registry.
Sets verified=True, updates last_verified, records verified_by, and re-signs the entry.
"""

from datetime import datetime, timezone
import json
import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.config import settings
from app.registry import BrandEntry, BrandRegistry


def verify_brand(brand_id: str, verified_by: str = "security-admin") -> bool:
    root = Path(__file__).resolve().parent.parent.parent
    dest_path = root / "registry" / "brands.json"

    if not dest_path.exists():
        print(f"[ERROR] Registry file {dest_path} not found. Run sign_registry.py first.", file=sys.stderr)
        return False

    priv_b64 = settings.REGISTRY_SIGNING_PRIVATE_KEY
    pub_b64 = settings.REGISTRY_SIGNING_PUBLIC_KEY
    reg = BrandRegistry(private_key_b64=priv_b64, public_key_b64=pub_b64)

    raw_data = json.loads(dest_path.read_text(encoding="utf-8"))
    found = False
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    updated_entries = []
    for item in raw_data:
        entry = BrandEntry(**item)
        if entry.brand_id == brand_id:
            entry.verified = True
            entry.needs_verification = False
            entry.last_verified = now_str
            entry.verified_by = verified_by
            entry.version += 1
            entry.validate_domain_pinning()
            reg.sign_entry(entry)
            found = True
            print(f"[OK] Verified brand '{brand_id}' ({entry.display_name}). New version: {entry.version}")
        updated_entries.append(entry.model_dump())

    if not found:
        print(f"[ERROR] Brand ID '{brand_id}' not found in registry.", file=sys.stderr)
        return False

    dest_path.write_text(json.dumps(updated_entries, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return True


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python verify_brand.py <brand_id> [verified_by]")
        sys.exit(1)

    b_id = sys.argv[1]
    v_by = sys.argv[2] if len(sys.argv) > 2 else "security-admin"
    success = verify_brand(b_id, v_by)
    sys.exit(0 if success else 1)
