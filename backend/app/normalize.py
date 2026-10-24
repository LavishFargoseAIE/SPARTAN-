"""
Host normalisation, IDNA decoding, punycode detection, and Public Suffix List domain extraction.
"""

from __future__ import annotations
import re
from typing import Optional
from urllib.parse import urlparse
import idna
import tldextract
from pydantic import BaseModel


class NormalizedHost(BaseModel):
    raw_input: str
    host: str
    punycode_host: str
    subdomain: str
    domain: str
    suffix: str
    registrable_domain: str
    is_punycode: bool = False
    is_ip: bool = False
    path_or_query_stripped: bool = False


IP_REGEX = re.compile(r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$")


def clean_host_input(raw: str) -> tuple[str, bool]:
    """
    Ensure only the host name is processed.
    Strip protocols, auth, ports, paths, queries and fragments if sent accidentally.
    """
    s = raw.strip()
    path_or_query_stripped = False

    # Check if a scheme was provided
    if "://" in s:
        parsed = urlparse(s)
        s = parsed.netloc or ""
        path_or_query_stripped = True
    elif "/" in s or "?" in s or "#" in s or "\\" in s:
        # Strip path or query
        s = re.split(r"[/\\?#]", s)[0]
        path_or_query_stripped = True

    # Strip username:password@ if present
    if "@" in s:
        s = s.split("@")[-1]
        path_or_query_stripped = True

    # Strip port if present
    if ":" in s:
        s = s.split(":")[0]

    # Lowercase and strip trailing dots
    s = s.lower().rstrip(".")
    return s, path_or_query_stripped


def normalize_host(raw_input: str) -> NormalizedHost:
    """
    Normalise any host representation into a standard NormalizedHost structure.
    Handles IDNA decoding, punycode flag, and PSL domain separation.
    """
    cleaned, stripped = clean_host_input(raw_input)

    is_punycode = "xn--" in cleaned
    punycode_host = cleaned
    decoded_host = cleaned

    if is_punycode:
        try:
            decoded_host = idna.decode(cleaned)
        except Exception:
            decoded_host = cleaned
    else:
        # Check if non-ascii chars that encode to punycode
        try:
            punycode_host = idna.encode(cleaned).decode("ascii")
            if "xn--" in punycode_host:
                is_punycode = True
        except Exception:
            pass

    # Extract via tldextract (Public Suffix List)
    ext = tldextract.extract(cleaned)
    registrable = f"{ext.domain}.{ext.suffix}".lower() if ext.domain and ext.suffix else ext.domain.lower()

    is_ip = bool(IP_REGEX.match(cleaned))

    return NormalizedHost(
        raw_input=raw_input,
        host=decoded_host,
        punycode_host=punycode_host,
        subdomain=ext.subdomain.lower(),
        domain=ext.domain.lower(),
        suffix=ext.suffix.lower(),
        registrable_domain=registrable,
        is_punycode=is_punycode,
        is_ip=is_ip,
        path_or_query_stripped=stripped,
    )
