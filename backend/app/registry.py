"""
Brand Registry management, Ed25519 canonical signing, and signature verification.
"""

from __future__ import annotations
import base64
import hashlib
import json
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import tldextract
from cryptography.hazmat.primitives.asymmetric import ed25519
from pydantic import BaseModel, Field


def canonical_bytes(entry: Dict[str, Any]) -> bytes:
    """
    Produce canonical bytes for signing: sorted keys, signature field removed,
    compact separators, utf-8 encoded.
    """
    data = {k: v for k, v in entry.items() if k != "signature"}
    canonical_str = json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return canonical_str.encode("utf-8")


def sign_entry(entry: Dict[str, Any], private_key_b64: str) -> str:
    """
    Sign an entry with an Ed25519 private key (base64 encoded raw 32-bytes).
    Returns the base64-encoded signature.
    """
    priv_bytes = base64.b64decode(private_key_b64)
    priv_key = ed25519.Ed25519PrivateKey.from_private_bytes(priv_bytes)
    data = canonical_bytes(entry)
    sig = priv_key.sign(data)
    return base64.b64encode(sig).decode("utf-8")


def verify_entry(entry: Dict[str, Any], public_key_b64: str) -> bool:
    """
    Verify the signature of an entry with an Ed25519 public key (base64 encoded raw 32-bytes).
    """
    sig_b64 = entry.get("signature")
    if not sig_b64:
        return False
    try:
        pub_bytes = base64.b64decode(public_key_b64)
        pub_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
        sig = base64.b64decode(sig_b64)
        data = canonical_bytes(entry)
        pub_key.verify(sig, data)
        return True
    except Exception:
        return False


def validate_entry(entry: Dict[str, Any]) -> List[str]:
    """
    Enforce security rules:
    - canonical_url host MUST be inside official_domains
    - login_url host (if given) MUST be inside official_domains or associated_domains
    - official_domains must not be empty
    - token_match must be 'substring' or 'exact_only'
    """
    errors = []
    brand_id = entry.get("brand_id", "<unknown>")
    official_domains = set(entry.get("official_domains", []))
    associated_domains = set(entry.get("associated_domains", []))
    all_domains = official_domains | associated_domains

    if not official_domains:
        errors.append(f"[{brand_id}] official_domains must not be empty")

    canonical_url = entry.get("canonical_url")
    if canonical_url:
        parsed = urlparse(canonical_url)
        host = parsed.netloc.lower()
        if ":" in host:
            host = host.split(":")[0]
        ext = tldextract.extract(host)
        registrable = f"{ext.domain}.{ext.suffix}"
        # Host itself or registrable domain must be in official_domains
        if host not in official_domains and registrable not in official_domains:
            errors.append(
                f"[{brand_id}] canonical_url host '{host}' is not in official_domains: {official_domains}"
            )

    login_url = entry.get("login_url")
    if login_url:
        parsed = urlparse(login_url)
        host = parsed.netloc.lower()
        if ":" in host:
            host = host.split(":")[0]
        ext = tldextract.extract(host)
        registrable = f"{ext.domain}.{ext.suffix}"
        if host not in all_domains and registrable not in all_domains:
            errors.append(
                f"[{brand_id}] login_url host '{host}' is not in official or associated domains"
            )

    token_match = entry.get("token_match", "substring")
    if token_match not in ("substring", "exact_only"):
        errors.append(f"[{brand_id}] token_match must be 'substring' or 'exact_only', got '{token_match}'")

    return errors


class Brand(BaseModel):
    brand_id: str
    display_name: str
    aliases: List[str] = Field(default_factory=list)
    category: str
    official_domains: List[str] = Field(default_factory=list)
    associated_domains: List[str] = Field(default_factory=list)
    canonical_url: Optional[str] = None
    login_url: Optional[str] = None
    deep_links: Dict[str, str] = Field(default_factory=dict)
    tokens: List[str] = Field(default_factory=list)
    token_match: str = "substring"
    logo_hashes: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=lambda: ["en"])
    verified: bool = False
    needs_verification: bool = True
    last_verified: Optional[str] = None
    verified_by: Optional[str] = None
    source: Optional[str] = None
    version: int = 1
    dev_only: bool = False
    shared_hosting_risk: bool = False
    signature: Optional[str] = None


class BrandRegistry:
    def __init__(self, brands_file: Optional[Path] = None, public_key_b64: Optional[str] = None):
        self.brands_file = brands_file
        self.public_key_b64 = public_key_b64
        self.brands: List[Dict[str, Any]] = []
        self.by_id: Dict[str, Dict[str, Any]] = {}
        self.domain_to_brand: Dict[str, Dict[str, Any]] = {}
        self.version: int = 1
        self.etag: str = ""

        if brands_file and brands_file.exists():
            self.load()

    def load(self):
        if not self.brands_file or not self.brands_file.exists():
            return
        with open(self.brands_file, "r", encoding="utf-8") as f:
            raw = f.read()
            self.brands = json.loads(raw)

        # Compute etag based on file content
        self.etag = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]

        self.by_id.clear()
        self.domain_to_brand.clear()

        max_version = 1
        for b in self.brands:
            bid = b["brand_id"]
            self.by_id[bid] = b
            v = b.get("version", 1)
            if v > max_version:
                max_version = v

            for dom in b.get("official_domains", []):
                self.domain_to_brand[dom.lower()] = b
            for dom in b.get("associated_domains", []):
                self.domain_to_brand[dom.lower()] = b

        self.version = max_version

    def get_brand(self, brand_id: str) -> Optional[Dict[str, Any]]:
        return self.by_id.get(brand_id)

    def find_by_domain(self, domain_or_host: str) -> Optional[Dict[str, Any]]:
        """Exact match on full domain or registrable domain."""
        dom = domain_or_host.lower()
        if dom in self.domain_to_brand:
            return self.domain_to_brand[dom]
        ext = tldextract.extract(dom)
        registrable = f"{ext.domain}.{ext.suffix}".lower()
        return self.domain_to_brand.get(registrable)

    def get_snapshot(self) -> Dict[str, Any]:
        return {
            "version": self.version,
            "etag": self.etag,
            "count": len(self.brands),
            "brands": self.brands,
        }
