"""
Brand registry: loading, validation, domain mapping, and Ed25519 signing/verification.
"""

from __future__ import annotations
import base64
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from pydantic import BaseModel, Field

from app.config import settings
from app.normalize import normalize_host

logger = logging.getLogger(__name__)


def canonical_json(data: dict) -> bytes:
    """Format dict into canonical JSON bytes with sorted keys and minimal whitespace."""
    filtered = {k: v for k, v in data.items() if k != "signature"}
    return json.dumps(filtered, sort_keys=True, separators=(",", ":")).encode("utf-8")


def canonical_redirect_json(name: str, official_url: str) -> bytes:
    """Canonical representation of the redirect action to verify in the browser."""
    payload = {"name": name, "official_url": official_url}
    return json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")


class BrandEntry(BaseModel):
    brand_id: str
    display_name: str
    aliases: List[str] = Field(default_factory=list)
    category: str
    official_domains: List[str]
    associated_domains: List[str] = Field(default_factory=list)
    canonical_url: str
    login_url: Optional[str] = None
    deep_links: Optional[Dict[str, str]] = None
    tokens: List[str] = Field(default_factory=list)
    token_match: str = "substring"  # 'substring' or 'exact_only'
    logo_hashes: List[str] = Field(default_factory=list)
    languages: List[str] = Field(default_factory=lambda: ["en"])
    verified: bool = False
    needs_verification: bool = True
    last_verified: Optional[str] = None
    verified_by: Optional[str] = None
    source: Optional[str] = None
    version: int = 1
    dev_only: Optional[bool] = False
    shared_hosting_risk: bool = False
    signature: Optional[str] = None

    def validate_domain_pinning(self) -> None:
        """Verify that canonical_url and login_url hosts belong to official_domains."""
        canon_host = urlparse(self.canonical_url).hostname
        if not canon_host:
            raise ValueError(f"Brand {self.brand_id} has invalid canonical_url: {self.canonical_url}")
        canon_norm = normalize_host(canon_host)
        if canon_norm.registrable not in self.official_domains and canon_norm.hostname not in self.official_domains:
            raise ValueError(
                f"Brand {self.brand_id} canonical_url host '{canon_host}' is not in official_domains: {self.official_domains}"
            )

        if self.login_url:
            login_host = urlparse(self.login_url).hostname
            if login_host:
                login_norm = normalize_host(login_host)
                if login_norm.registrable not in self.official_domains and login_norm.hostname not in self.official_domains:
                    raise ValueError(
                        f"Brand {self.brand_id} login_url host '{login_host}' is not in official_domains: {self.official_domains}"
                    )


class BrandRegistry:
    def __init__(self, brands: Optional[List[BrandEntry]] = None, private_key_b64: Optional[str] = None, public_key_b64: Optional[str] = None):
        self._brands: Dict[str, BrandEntry] = {}
        self._domain_to_brand: Dict[str, BrandEntry] = {}
        self._private_key: Optional[ed25519.Ed25519PrivateKey] = None
        self._public_key: Optional[ed25519.Ed25519PublicKey] = None

        if private_key_b64:
            self.set_private_key(private_key_b64)
        if public_key_b64:
            self.set_public_key(public_key_b64)

        if brands:
            for b in brands:
                self.register(b)

    def set_private_key(self, b64_key: str) -> None:
        raw = base64.b64decode(b64_key)
        self._private_key = ed25519.Ed25519PrivateKey.from_private_bytes(raw)
        if not self._public_key:
            self._public_key = self._private_key.public_key()

    def set_public_key(self, b64_key: str) -> None:
        raw = base64.b64decode(b64_key)
        self._public_key = ed25519.Ed25519PublicKey.from_public_bytes(raw)

    def register(self, brand: BrandEntry) -> None:
        brand.validate_domain_pinning()
        self._brands[brand.brand_id] = brand
        for dom in brand.official_domains:
            self._domain_to_brand[dom.lower()] = brand
        for dom in brand.associated_domains:
            self._domain_to_brand[dom.lower()] = brand

    def get(self, brand_id: str) -> Optional[BrandEntry]:
        return self._brands.get(brand_id)

    def find_by_domain(self, domain: str) -> Optional[BrandEntry]:
        """Lookup by exact registrable domain or hostname."""
        return self._domain_to_brand.get(domain.lower())

    def is_official(self, registrable_domain: str, hostname: Optional[str] = None) -> bool:
        """Check if registrable domain or hostname (or any parent official domain) is official."""
        if registrable_domain.lower() in self._domain_to_brand:
            return True
        if hostname:
            clean = hostname.lower()
            if clean in self._domain_to_brand:
                return True
            parts = clean.split(".")
            for i in range(1, len(parts) - 1):
                parent = ".".join(parts[i:])
                if parent in self._domain_to_brand:
                    return True
        return False

    def all_brands(self) -> List[BrandEntry]:
        return list(self._brands.values())

    def sign_entry(self, entry: BrandEntry) -> str:
        if not self._private_key:
            raise RuntimeError("Private key is not configured for registry signing.")
        data = canonical_json(entry.model_dump())
        sig = self._private_key.sign(data)
        sig_b64 = base64.b64encode(sig).decode("ascii")
        entry.signature = sig_b64
        return sig_b64

    def verify_entry(self, entry: BrandEntry) -> bool:
        if not entry.signature:
            return False
        if not self._public_key:
            return False
        data = canonical_json(entry.model_dump())
        sig = base64.b64decode(entry.signature)
        try:
            self._public_key.verify(sig, data)
            return True
        except InvalidSignature:
            return False

    def sign_redirect(self, name: str, official_url: str) -> str:
        """Sign canonical redirect payload for verification in browser extension."""
        if not self._private_key:
            raise RuntimeError("Private key is not configured for signing redirects.")
        data = canonical_redirect_json(name, official_url)
        sig = self._private_key.sign(data)
        return base64.b64encode(sig).decode("ascii")

    def verify_redirect(self, name: str, official_url: str, signature_b64: str) -> bool:
        """Verify redirect signature."""
        if not self._public_key:
            return False
        data = canonical_redirect_json(name, official_url)
        try:
            sig = base64.b64decode(signature_b64)
            self._public_key.verify(sig, data)
            return True
        except Exception:
            return False

    def snapshot(self, etag: Optional[str] = None) -> dict:
        """Generate a signed snapshot for extension allowlisting."""
        official_domains = sorted(list(self._domain_to_brand.keys()))
        verified_brands = [
            {
                "brand_id": b.brand_id,
                "display_name": b.display_name,
                "category": b.category,
                "official_domains": b.official_domains,
                "canonical_url": b.canonical_url,
                "signature": b.signature,
            }
            for b in self._brands.values()
            if b.verified
        ]
        return {
            "version": 1,
            "count": len(self._brands),
            "official_domains": official_domains,
            "verified_brands": verified_brands,
        }


def load_registry(filepath: Optional[str] = None) -> BrandRegistry:
    """Load registry brands from file, with automatic fallback."""
    priv = settings.REGISTRY_SIGNING_PRIVATE_KEY
    pub = settings.REGISTRY_SIGNING_PUBLIC_KEY
    reg = BrandRegistry(private_key_b64=priv, public_key_b64=pub)

    # Candidate file locations
    paths_to_check = []
    if filepath:
        paths_to_check.append(Path(filepath))
    paths_to_check.extend([
        Path(settings.REGISTRY_PATH),
        Path(__file__).resolve().parent.parent.parent / "registry" / "brands.json",
        Path(__file__).resolve().parent.parent.parent / "registry" / "brands_seed.json",
    ])

    loaded = False
    for path in paths_to_check:
        if path.exists():
            try:
                content = json.loads(path.read_text(encoding="utf-8"))
                for item in content:
                    reg.register(BrandEntry(**item))
                logger.info(f"Loaded {len(content)} brands from {path}")
                loaded = True
                break
            except Exception as e:
                logger.warning(f"Failed loading registry from {path}: {e}")

    if not loaded:
        logger.warning("No brand registry file found; initialized empty registry.")

    return reg
