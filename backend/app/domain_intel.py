"""
Domain intelligence signals: age, registrar, DNS, and popularity.
Phase 2 Intelligence enhancements including RDAP age, DNS health, and Tranco ranking.
"""

from __future__ import annotations
import asyncio
from datetime import datetime, timezone
import logging
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
import httpx
import dns.asyncresolver
import dns.exception

from app.config import settings
from app.normalize import NormalizedHost

logger = logging.getLogger(__name__)

# In-memory caches for fast sub-millisecond retrieval
_RDAP_CACHE: Dict[str, Tuple[Optional[datetime], Optional[str]]] = {}
_TRANCO_SET: Optional[Set[str]] = None


def load_tranco_set(tranco_path: str = "./data/tranco.csv") -> Set[str]:
    """Load Tranco top domains from disk into memory if available."""
    global _TRANCO_SET
    if _TRANCO_SET is not None:
        return _TRANCO_SET

    _TRANCO_SET = set()
    p = Path(tranco_path)
    if p.exists() and p.is_file():
        try:
            with open(p, "r", encoding="utf-8") as f:
                for line in f:
                    parts = line.strip().split(",")
                    if len(parts) >= 2:
                        _TRANCO_SET.add(parts[1].strip().lower())
                    elif parts:
                        _TRANCO_SET.add(parts[0].strip().lower())
            logger.info("Loaded %d domains from Tranco list", len(_TRANCO_SET))
        except Exception as e:
            logger.warning("Failed to load Tranco list from %s: %s", tranco_path, e)

    return _TRANCO_SET


def is_in_tranco(registrable: str, tranco_path: str = "./data/tranco.csv") -> bool:
    """Check if domain is in Tranco Top 1M list."""
    t_set = load_tranco_set(tranco_path)
    return registrable.lower() in t_set


def parse_rdap_registration_date(rdap_json: dict) -> Optional[datetime]:
    """Extract registration/creation date from RDAP response JSON."""
    events = rdap_json.get("events", [])
    for event in events:
        action = event.get("eventAction", "")
        if action in ("registration", "created", "creation"):
            date_str = event.get("eventDate")
            if date_str:
                try:
                    # Clean up trailing Z or timezone offsets
                    clean_str = date_str.replace("Z", "+00:00")
                    return datetime.fromisoformat(clean_str)
                except Exception:
                    pass
    return None


async def fetch_rdap_info(registrable: str, timeout_seconds: float = 0.5) -> Tuple[Optional[datetime], Optional[str]]:
    """
    Fetch domain registration date and registrar from RDAP with short timeout.
    Cached in memory to ensure fast subsequent evaluations.
    """
    if registrable in _RDAP_CACHE:
        return _RDAP_CACHE[registrable]

    url = f"https://rdap.org/domain/{registrable}"
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds, follow_redirects=True) as client:
            resp = await client.get(url, headers={"Accept": "application/rdap+json"})
            if resp.status_code == 200:
                data = resp.json()
                created_date = parse_rdap_registration_date(data)
                # Extract registrar if present
                registrar = None
                for entity in data.get("entities", []):
                    roles = entity.get("roles", [])
                    if "registrar" in roles:
                        vcard = entity.get("vcardArray", [])
                        if len(vcard) > 1:
                            for item in vcard[1]:
                                if item and item[0] == "fn":
                                    registrar = item[3]
                                    break
                _RDAP_CACHE[registrable] = (created_date, registrar)
                return _RDAP_CACHE[registrable]
    except Exception as e:
        logger.debug("RDAP query for %s timed out or failed: %s", registrable, e)

    _RDAP_CACHE[registrable] = (None, None)
    return None, None


async def check_dns_health(hostname: str, timeout_seconds: float = 0.4) -> Dict[str, bool]:
    """
    Inspect DNS records for hostname using dnspython.
    """
    resolver = dns.asyncresolver.Resolver()
    resolver.lifetime = timeout_seconds
    resolver.timeout = timeout_seconds

    results = {"has_a": False, "has_mx": False, "resolves": False}
    try:
        a_records = await resolver.resolve(hostname, "A")
        if a_records:
            results["has_a"] = True
            results["resolves"] = True
    except Exception:
        pass

    try:
        mx_records = await resolver.resolve(hostname, "MX")
        if mx_records:
            results["has_mx"] = True
    except Exception:
        pass

    return results


async def get_domain_intel(norm_host: NormalizedHost) -> Tuple[float, List[str]]:
    """
    Compute domain intelligence signal D (0.0 to 1.0).
    Aggregates TLD risk, hyphen structures, RDAP registration age, and Tranco presence.
    """
    reasons: List[str] = []
    d_score = 0.0

    # 1. Suspicious domain naming patterns & high-abuse TLDs
    host = norm_host.hostname
    registrable = norm_host.registrable
    suspicious_tlds = {"xyz", "top", "tk", "ml", "cf", "gq", "buzz", "click", "rest", "surf", "work", "loan"}
    if norm_host.suffix in suspicious_tlds:
        d_score = max(d_score, 0.40)
        reasons.append("suspicious_tld")

    # Excessive hyphens commonly found in generated or combosquatting disposable domains
    if host.count("-") >= 2:
        d_score = max(d_score, 0.30)
        reasons.append("suspicious_domain_structure")

    # 2. Check Tranco popularity list
    in_tranco = is_in_tranco(registrable)
    if in_tranco:
        # High-traffic legitimate domains get a dampening discount on D score
        d_score = max(0.0, d_score - 0.20)

    # 3. RDAP registration age check
    try:
        created_date, registrar = await fetch_rdap_info(registrable, timeout_seconds=0.35)
        if created_date:
            now = datetime.now(timezone.utc)
            if created_date.tzinfo is None:
                created_date = created_date.replace(tzinfo=timezone.utc)
            age_days = (now - created_date).days
            if age_days < 30:
                d_score = max(d_score, 0.70)
                reasons.append("domain_age_under_30d")
            elif age_days < 90:
                d_score = max(d_score, 0.40)
    except Exception as e:
        logger.debug("Error calculating RDAP age: %s", e)

    return round(min(1.0, d_score), 2), reasons
