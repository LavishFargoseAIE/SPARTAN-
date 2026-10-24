"""
Lookalike and domain spoofing detection engine.
Detects typosquatting, combosquatting, homoglyphs, IDN punycode abuse,
subdomain abuse, and suspicious keyword combinations.
"""

from __future__ import annotations
import re
import unicodedata
from typing import Any, Dict, List, Optional, Set, Tuple

import tldextract
from confusable_homoglyphs import confusables
from rapidfuzz.distance import Levenshtein

from app.normalize import NormalizedHost

# Skeleton normalization table (visual confusables)
SKELETON_TABLE = str.maketrans({
    "0": "o",
    "1": "l",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "8": "b",
    "$": "s",
    "@": "a",
    "|": "l",
    "!": "l",
})

# Suspicious security / trust keywords commonly used in financial phishing
TRUST_WORDS = {
    "login", "signin", "secure", "security", "verify", "verification",
    "update", "kyc", "portal", "netbanking", "auth", "authenticate",
    "banking", "account", "support", "service", "help", "otp",
    "claim", "refund", "card", "alert", "official", "validation", "ebank"
}

# Suspicious TLDs frequently used for throwaway phishing sites
SUSPICIOUS_TLDS = {
    "xyz", "top", "club", "site", "online", "work", "info", "buzz",
    "icu", "vip", "fit", "cfd", "rest", "cam", "loan", "tk", "ml", "ga", "cf", "gq"
}


def skeleton(label: str) -> str:
    """Normalize unicode, replace common ASCII visual substitutions."""
    s = unicodedata.normalize("NFKC", label.lower())
    s = s.replace("rn", "m").replace("vv", "w")
    return s.translate(SKELETON_TABLE)


def has_mixed_scripts_or_confusables(label: str) -> bool:
    """Check if label contains homoglyphs or mixed character scripts."""
    try:
        return bool(confusables.is_confusable(label, preferred_aliases=["latin"]))
    except Exception:
        return False


def is_token_in_text(token: str, text: str, min_len_for_unbounded: int = 4) -> bool:
    """
    Check if token is in text.
    For short tokens (length < 4), require word boundaries (start/end or delimited by hyphens/dots/digits).
    """
    if not token or not text:
        return False
    if len(token) >= min_len_for_unbounded:
        return token in text

    pattern = rf"(?:^|[-._0-9]){re.escape(token)}(?:$|[-._0-9])"
    return bool(re.search(pattern, text))


class LookalikeResult:
    def __init__(
        self,
        score: float,
        brand: Optional[Dict[str, Any]] = None,
        reasons: Optional[List[str]] = None,
        differing_part: Optional[str] = None,
        is_subdomain_abuse: bool = False,
    ):
        self.score = score
        self.brand = brand
        self.reasons = reasons or []
        self.differing_part = differing_part
        self.is_subdomain_abuse = is_subdomain_abuse


def evaluate_lookalike(
    norm: NormalizedHost,
    brands: List[Dict[str, Any]],
) -> LookalikeResult:
    """
    Evaluate host lookalike risk against all registered brands.
    Precision over recall: exact match on official_domains returns 0.0 immediately.
    """
    host = norm.host
    registrable = norm.registrable_domain
    domain_label = norm.domain
    subdomain = norm.subdomain

    # Map of all registered official/associated domains to their owning brand
    all_registered_official_domains: Dict[str, Dict[str, Any]] = {}
    for b in brands:
        for d in b.get("official_domains", []):
            all_registered_official_domains[d.lower()] = b
        for d in b.get("associated_domains", []):
            all_registered_official_domains[d.lower()] = b

    # Standard subdomain prefixes that are always legitimate for official domains
    SAFE_SUBPREFIXES = {"", "www", "login", "secure", "retail", "portal",
                        "m", "mobile", "app", "api", "netbanking", "online"}

    # 1. Exact match against official domain or safe subdomain of official domain
    for dom, owning_brand in all_registered_official_domains.items():
        if host == dom:
            return LookalikeResult(score=0.0, brand=owning_brand)
        if host.endswith("." + dom):
            # Check if the leftmost subdomain label is a recognized safe prefix
            prefix_part = host[: len(host) - len(dom) - 1]  # e.g. 'www' or 'login.retail'
            top_label = prefix_part.split(".")[0]
            if owning_brand.get("shared_hosting_risk", False):
                # shared_hosting_risk brands: only safe prefixes on the direct subdomain level
                if top_label in SAFE_SUBPREFIXES:
                    return LookalikeResult(score=0.0, brand=owning_brand)
                # Arbitrary user subdomains on shared platforms continue to lookalike analysis
            else:
                return LookalikeResult(score=0.0, brand=owning_brand)

    # If the host's registrable domain exactly matches a registered official domain,
    # the host itself is NOT an attacker lookalike of a different brand.
    # (e.g. en.wikipedia.org registrable=wikipedia.org → wikipedia.org is registered → SAFE)
    if registrable in all_registered_official_domains:
        return LookalikeResult(score=0.0, brand=all_registered_official_domains[registrable])

    clean_domain_label = skeleton(domain_label)
    clean_host_raw = skeleton(host)
    clean_subdomain = skeleton(subdomain) if subdomain else ""

    best_score = 0.0
    best_brand: Optional[Dict[str, Any]] = None
    best_reasons: List[str] = []
    best_differing: Optional[str] = None
    best_token_len = 0
    is_subdomain_abuse = False

    has_homoglyphs = has_mixed_scripts_or_confusables(domain_label) or norm.is_punycode

    for b in brands:
        tokens = [t.lower() for t in b.get("tokens", [])]
        if not tokens:
            continue

        token_match_type = b.get("token_match", "substring")
        brand_score = 0.0
        reasons: List[str] = []
        differing: Optional[str] = None
        sub_abuse = False
        matched_token_len = 0

        for t in tokens:
            skel_t = skeleton(t)
            t_len = len(t)

            # 1. Edit distance similarity on the registrable domain label
            # Guard: short tokens (< 5 chars) use only exact/near-exact match to avoid false positives.
            # Guard: token must be at least half the length of the domain label to flag typosquat.
            max_len = max(len(clean_domain_label), len(skel_t))
            if max_len > 0:
                dist = Levenshtein.distance(clean_domain_label, skel_t)
                sim = 1.0 - (dist / max_len)
            else:
                sim = 0.0

            # Typosquatting: high similarity but not identical.
            # Extra guard: token must cover at least 50% of domain label length to avoid noise.
            length_ratio = len(skel_t) / max(len(clean_domain_label), 1)
            if sim >= 0.80 and dist > 0 and t_len >= 5 and length_ratio >= 0.50:
                score = sim
                if score > brand_score or (score == brand_score and t_len > matched_token_len):
                    brand_score = score
                    differing = domain_label
                    reasons.append("typosquat_domain")
                    matched_token_len = t_len

            # 2. Combosquatting: brand token inside domain or host
            if token_match_type == "substring":
                # 2a. Visual ASCII substitution: skeleton(domain) == skeleton(token) but raw domain != raw token
                # e.g. hdfcb4nk -> skeleton=hdfcbank == token hdfcbank (attacker used '4' instead of 'a')
                if clean_domain_label == skel_t and domain_label.lower() != t:
                    score = 0.93
                    reasons.append("combosquat_with_security_keyword")
                    if score > brand_score or (score == brand_score and t_len > matched_token_len):
                        brand_score = score
                        differing = domain_label
                        matched_token_len = t_len

                elif is_token_in_text(skel_t, clean_domain_label) and clean_domain_label != skel_t:
                    score = 0.85
                    has_trust_word = any(w in domain_label for w in TRUST_WORDS)
                    if has_trust_word:
                        score = 0.92
                        reasons.append("combosquat_with_security_keyword")
                    else:
                        reasons.append("combosquat_domain")
                    if score > brand_score or (score == brand_score and t_len > matched_token_len):
                        brand_score = score
                        differing = domain_label
                        matched_token_len = t_len

                elif is_token_in_text(skel_t, clean_host_raw) and clean_domain_label != skel_t:
                    score = 0.75
                    reasons.append("brand_token_in_hostname")
                    if score > brand_score or (score == brand_score and t_len > matched_token_len):
                        brand_score = score
                        differing = host
                        matched_token_len = t_len

            # 3. Subdomain abuse: attacker puts genuine brand domain/token in the subdomain
            # e.g. "examplebank.bank.in.verify-user.xyz"
            if clean_subdomain and (
                is_token_in_text(skel_t, clean_subdomain)
                or any(dom in clean_subdomain for dom in b.get("official_domains", []))
            ):
                if registrable not in b.get("official_domains", []):
                    score = 0.95
                    sub_abuse = True
                    reasons.append("subdomain_brand_impersonation")
                    if score > brand_score or (score == brand_score and t_len > matched_token_len):
                        brand_score = score
                        differing = subdomain
                        matched_token_len = t_len

        # For exact_only brands (e.g. Meta, Target, Signal, Box, Max, Line):
        if token_match_type == "exact_only":
            for t in tokens:
                skel_t = skeleton(t)
                t_len = len(t)
                if clean_domain_label == skel_t:
                    score = 0.85
                    reasons.append("unauthorized_tld_brand_impersonation")
                    if score > brand_score or (score == brand_score and t_len > matched_token_len):
                        brand_score = score
                        differing = domain_label
                        matched_token_len = t_len
                elif Levenshtein.distance(clean_domain_label, skel_t) == 1 and len(skel_t) >= 4:
                    score = 0.80
                    reasons.append("typosquat_domain")
                    if score > brand_score or (score == brand_score and t_len > matched_token_len):
                        brand_score = score
                        differing = domain_label
                        matched_token_len = t_len

        if brand_score > 0.0:
            if has_homoglyphs:
                brand_score = min(1.0, brand_score + 0.15)
                reasons.append("punycode_or_homoglyph_detected")

            if norm.suffix in SUSPICIOUS_TLDS and b.get("category") in ("bank", "government", "payment"):
                brand_score = min(1.0, brand_score + 0.08)
                reasons.append("suspicious_tld_for_financial_brand")

            if brand_score > best_score or (brand_score == best_score and matched_token_len > best_token_len):
                best_score = brand_score
                best_brand = b
                best_reasons = list(set(reasons))
                best_differing = differing
                best_token_len = matched_token_len
                is_subdomain_abuse = sub_abuse

    return LookalikeResult(
        score=best_score,
        brand=best_brand,
        reasons=best_reasons,
        differing_part=best_differing,
        is_subdomain_abuse=is_subdomain_abuse,
    )
