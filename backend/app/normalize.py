"""
Host normalization, IDNA decoding, Punycode detection, and registrable domain extraction.
"""

from dataclasses import dataclass
import re
from urllib.parse import urlparse
import idna
import tldextract


# Pre-configured tldextract instance using bundled snapshot to ensure fast offline execution
_extractor = tldextract.TLDExtract(cache_dir=None)


@dataclass(frozen=True)
class NormalizedHost:
    raw: str
    hostname: str
    subdomain: str
    domain: str
    suffix: str
    registrable: str
    is_punycode: bool
    decoded_hostname: str


def normalize_host(raw_host: str) -> NormalizedHost:
    """
    Clean, sanitize, and normalize an input host string.
    Strips schemes, paths, queries, ports, and whitespace.
    """
    cleaned = raw_host.strip()
    if not cleaned:
        raise ValueError("Host name cannot be empty")

    # If full URL was provided, strip scheme, path, query, fragment
    if "://" in cleaned:
        parsed = urlparse(cleaned)
        cleaned = parsed.netloc or parsed.path
    elif "/" in cleaned:
        cleaned = cleaned.split("/")[0]

    # Strip userinfo (user:pass@) if present
    if "@" in cleaned:
        cleaned = cleaned.split("@")[-1]

    # Strip port if present
    if ":" in cleaned:
        cleaned = cleaned.split(":")[0]

    cleaned = cleaned.strip(".").lower()
    if not cleaned:
        raise ValueError("Invalid host name after normalization")

    is_punycode = "xn--" in cleaned
    decoded_hostname = cleaned
    if is_punycode:
        try:
            decoded_hostname = idna.decode(cleaned)
        except Exception:
            decoded_hostname = cleaned

    ext = _extractor(cleaned)
    domain = ext.domain.lower() if ext.domain else ""
    suffix = ext.suffix.lower() if ext.suffix else ""
    subdomain = ext.subdomain.lower() if ext.subdomain else ""

    if domain and suffix:
        registrable = f"{domain}.{suffix}"
    elif domain:
        registrable = domain
    else:
        registrable = cleaned

    return NormalizedHost(
        raw=raw_host,
        hostname=cleaned,
        subdomain=subdomain,
        domain=domain,
        suffix=suffix,
        registrable=registrable,
        is_punycode=is_punycode,
        decoded_hostname=decoded_hostname,
    )
