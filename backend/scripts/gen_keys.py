#!/usr/bin/env python3
"""
Generate Ed25519 keypair for brand registry signing and verification.
Writes the keys to .env without exposing the private key in console logs.
"""

import base64
import os
import sys
from pathlib import Path
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization


def generate_keypair() -> tuple[str, str]:
    """Generate raw 32-byte Ed25519 keypair, return base64 encoded (private, public)."""
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    priv_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )

    b64_priv = base64.b64encode(priv_bytes).decode("ascii")
    b64_pub = base64.b64encode(pub_bytes).decode("ascii")
    return b64_priv, b64_pub


def update_env_file(env_path: Path, b64_priv: str, b64_pub: str) -> None:
    """Safely write/update the keys in the target .env file."""
    lines = []
    if env_path.exists():
        lines = env_path.read_text(encoding="utf-8").splitlines()
    else:
        example_path = env_path.parent / ".env.example"
        if example_path.exists():
            lines = example_path.read_text(encoding="utf-8").splitlines()

    priv_set = False
    pub_set = False
    new_lines = []

    for line in lines:
        if line.startswith("REGISTRY_SIGNING_PRIVATE_KEY="):
            new_lines.append(f"REGISTRY_SIGNING_PRIVATE_KEY={b64_priv}")
            priv_set = True
        elif line.startswith("REGISTRY_SIGNING_PUBLIC_KEY="):
            new_lines.append(f"REGISTRY_SIGNING_PUBLIC_KEY={b64_pub}")
            pub_set = True
        else:
            new_lines.append(line)

    if not priv_set:
        new_lines.append(f"REGISTRY_SIGNING_PRIVATE_KEY={b64_priv}")
    if not pub_set:
        new_lines.append(f"REGISTRY_SIGNING_PUBLIC_KEY={b64_pub}")

    env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


def main():
    b64_priv, b64_pub = generate_keypair()

    # Determine .env location: look in current dir, or repo root
    cwd = Path.cwd()
    if (cwd / ".env").exists() or (cwd / ".env.example").exists():
        env_path = cwd / ".env"
    elif (cwd.parent / ".env").exists() or (cwd.parent / ".env.example").exists():
        env_path = cwd.parent / ".env"
    else:
        env_path = Path(__file__).resolve().parent.parent.parent / ".env"

    update_env_file(env_path, b64_priv, b64_pub)
    print(f"[OK] Generated Ed25519 signing keypair.")
    print(f"[OK] Saved private & public key to {env_path}")
    print(f"[OK] REGISTRY_SIGNING_PUBLIC_KEY: {b64_pub}")
    print("[WARN] Never commit .env or share the private key.")


if __name__ == "__main__":
    main()
