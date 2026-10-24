"""
URL feature extractor for phishing detection.
Extracts ~18 lexical/structural signals from a URL string.
"""
from __future__ import annotations

import math
import re
import ipaddress
from urllib.parse import urlparse, parse_qs

# High-risk TLDs commonly abused in phishing campaigns
_HIGH_RISK_TLDS = {
    "tk", "ml", "ga", "cf", "gq", "xyz", "top", "icu",
    "buzz", "club", "work", "link", "click", "email",
    "loan", "online", "site", "website", "tech", "pw",
}

# Keywords that frequently appear in phishing URLs
_SUSPICIOUS_KEYWORDS = [
    "login", "signin", "sign-in", "secure", "account", "verify",
    "update", "bank", "paypal", "ebay", "apple", "amazon",
    "microsoft", "google", "webscr", "confirm", "password",
    "credential", "wp-login", "admin", "billing", "support",
    "wallet", "crypto", "recover", "unlock", "suspended",
]

# Ordered feature names — must match the order returned by extract_url_features
FEATURE_NAMES: list[str] = [
    "url_length",
    "domain_length",
    "path_length",
    "subdomain_depth",
    "hyphen_count",
    "digit_count",
    "digit_ratio",
    "entropy",
    "has_ip",
    "has_at_sign",
    "has_double_slash_redirect",
    "has_hex_encoding",
    "tld_risk",
    "suspicious_keywords",
    "path_depth",
    "query_param_count",
    "https",
    "domain_token_count",
]


def _shannon_entropy(s: str) -> float:
    """Compute Shannon entropy of a string."""
    if not s:
        return 0.0
    freq: dict[str, int] = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    n = len(s)
    return -sum((c / n) * math.log2(c / n) for c in freq.values())


def _is_ip(hostname: str) -> bool:
    """Return True if hostname is an IPv4 or IPv6 address."""
    try:
        ipaddress.ip_address(hostname)
        return True
    except ValueError:
        return False


def extract_url_features(url: str) -> dict[str, float]:
    """
    Extract phishing-detection features from a URL string.

    Returns a dict whose keys match FEATURE_NAMES exactly.
    All values are floats (int-valued where applicable).
    """
    try:
        parsed = urlparse(url)
    except Exception:
        # Malformed URL — return worst-case features
        return {name: 1.0 for name in FEATURE_NAMES}

    hostname: str = parsed.hostname or ""
    path: str = parsed.path or ""
    query: str = parsed.query or ""
    url_lower = url.lower()

    # --- Basic length features ---
    url_length = float(len(url))
    domain_length = float(len(hostname))
    path_length = float(len(path))

    # --- Subdomain depth ---
    # e.g. "a.b.evil.com" → parts = ["a", "b", "evil", "com"] → depth = len-2 = 2
    parts = hostname.split(".")
    subdomain_depth = float(max(0, len(parts) - 2)) if len(parts) >= 2 else 0.0

    # --- Hyphen count (full URL) ---
    hyphen_count = float(url_lower.count("-"))

    # --- Digit features (hostname only) ---
    digit_count = float(sum(ch.isdigit() for ch in hostname))
    digit_ratio = digit_count / domain_length if domain_length > 0 else 0.0

    # --- Entropy of hostname ---
    entropy = _shannon_entropy(hostname)

    # --- IP address as hostname ---
    has_ip = 1.0 if _is_ip(hostname) else 0.0

    # --- @ sign in URL (tricks browser into using text before @ as credentials) ---
    has_at_sign = 1.0 if "@" in url else 0.0

    # --- Double-slash redirect in path ---
    has_double_slash_redirect = 1.0 if "//" in path else 0.0

    # --- Hex/percent encoding ---
    has_hex_encoding = 1.0 if "%" in url else 0.0

    # --- TLD risk ---
    tld = parts[-1].lower() if parts else ""
    tld_risk = 1.0 if tld in _HIGH_RISK_TLDS else 0.0

    # --- Suspicious keyword count ---
    suspicious_keywords = float(
        sum(1 for kw in _SUSPICIOUS_KEYWORDS if kw in url_lower)
    )

    # --- Path depth (number of / segments) ---
    path_depth = float(len([p for p in path.split("/") if p]))

    # --- Query parameter count ---
    if query:
        query_param_count = float(len(parse_qs(query)))
    else:
        query_param_count = 0.0

    # --- HTTPS flag ---
    https = 1.0 if (parsed.scheme or "").lower() == "https" else 0.0

    # --- Domain token count (words split by hyphens) ---
    domain_no_tld = ".".join(parts[:-1]) if len(parts) > 1 else hostname
    domain_token_count = float(len(re.split(r"[-.]", domain_no_tld)))

    return {
        "url_length": url_length,
        "domain_length": domain_length,
        "path_length": path_length,
        "subdomain_depth": subdomain_depth,
        "hyphen_count": hyphen_count,
        "digit_count": digit_count,
        "digit_ratio": digit_ratio,
        "entropy": entropy,
        "has_ip": has_ip,
        "has_at_sign": has_at_sign,
        "has_double_slash_redirect": has_double_slash_redirect,
        "has_hex_encoding": has_hex_encoding,
        "tld_risk": tld_risk,
        "suspicious_keywords": suspicious_keywords,
        "path_depth": path_depth,
        "query_param_count": query_param_count,
        "https": https,
        "domain_token_count": domain_token_count,
    }
