#!/usr/bin/env python3
"""
Generate an Ed25519 keypair for signing the SiteGuard Brand Registry.
Writes or updates REGISTRY_SIGNING_PRIVATE_KEY and REGISTRY_SIGNING_PUBLIC_KEY in .env.
Never prints the private key to console.
"""

import base64
import os
import sys
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization


def generate_keys():
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    priv_raw = private_key.private_bytes_raw()
    pub_raw = public_key.public_bytes_raw()

    priv_b64 = base64.b64encode(priv_raw).decode("utf-8")
    pub_b64 = base64.b64encode(pub_raw).decode("utf-8")

    return priv_b64, pub_b64


def update_env_file(env_path: Path, priv_b64: str, pub_b64: str):
    env_lines = []
    if env_path.exists():
        with open(env_path, "r", encoding="utf-8") as f:
            env_lines = f.readlines()

    priv_updated = False
    pub_updated = False
    new_lines = []

    for line in env_lines:
        if line.startswith("REGISTRY_SIGNING_PRIVATE_KEY="):
            new_lines.append(f"REGISTRY_SIGNING_PRIVATE_KEY={priv_b64}\n")
            priv_updated = True
        elif line.startswith("REGISTRY_SIGNING_PUBLIC_KEY="):
            new_lines.append(f"REGISTRY_SIGNING_PUBLIC_KEY={pub_b64}\n")
            pub_updated = True
        else:
            new_lines.append(line)

    if not priv_updated:
        new_lines.append(f"REGISTRY_SIGNING_PRIVATE_KEY={priv_b64}\n")
    if not pub_updated:
        new_lines.append(f"REGISTRY_SIGNING_PUBLIC_KEY={pub_b64}\n")

    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


def main():
    root_dir = Path(__file__).resolve().parent.parent.parent
    env_path = root_dir / ".env"

    priv_b64, pub_b64 = generate_keys()
    update_env_file(env_path, priv_b64, pub_b64)

    print(f"Generated Ed25519 Keypair.")
    print(f"Public Key (base64): {pub_b64}")
    print(f"Keys saved to {env_path}")


if __name__ == "__main__":
    main()
