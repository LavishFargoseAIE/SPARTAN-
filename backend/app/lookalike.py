"""
Lookalike engine: detects typosquatting, homoglyphs, combosquatting,
subdomain abuse, and Punycode tricks against registered brands.
"""

from __future__ import annotations
import re
import unicodedata
from dataclasses import dataclass
from typing import List, Optional, Tuple

import tldextract
from confusable_homoglyphs import confusables
from rapidfuzz.distance import Levenshtein

from app.normalize import NormalizedHost, normalize_host
from app.registry import BrandEntry

TABLE = str.maketrans("0135$@", "oleass")

TRUST_WORDS = {
    "login", "signin", "secure", "security", "kyc", "update",
    "verify", "verification", "support", "helpdesk", "account",
    "portal", "netbanking", "banking", "auth", "otp", "password",
    "service", "pay", "payment", "refund", "claim", "alert"
}

SUSPICIOUS_TLDS = {
    "xyz", "top", "tk", "ml", "ga", "cf", "gq", "buzz", "club",
    "work", "click", "link", "online", "site", "shop", "vip",
    "icu", "rest", "cam", "loan", "stream", "download"
}


def skeleton(label: str) -> str:
    """Normalize label into skeleton format: NFKC, rn->m, vv->w, leetspeak mapping."""
    s = unicodedata.normalize("NFKC", label.lower())
    s = s.replace("rn", "m").replace("vv", "w")
    return s.translate(TABLE)


@dataclass
class LookalikeResult:
    score: float
    brand: Optional[BrandEntry]
    reasons: List[str]
    matched_token: Optional[str] = None


def compute_lookalike(
    norm_host: NormalizedHost,
    brands: List[BrandEntry],
) -> LookalikeResult:
    """
    Score L (0.0 to 1.0) and identify the closest brand if impersonation is detected.
    Genuine registrable domains in official_domains return score 0.0 immediately.
    """
    host = norm_host.hostname
    registrable = norm_host.registrable
    subdomain = norm_host.subdomain
    domain_label = norm_host.domain

    label_skel = skeleton(domain_label)
    sub_skel = skeleton(subdomain)
    host_no_dash = skeleton(host.replace("-", "").replace(".", ""))

    # Segment tokens from host for exact_only boundary matching
    host_tokens = set(re.findall(r"[a-z0-9]+", skeleton(host)))

    best_score = 0.0
    best_match_len = 0
    best_brand: Optional[BrandEntry] = None
    best_reasons: List[str] = []
    best_token: Optional[str] = None

    for b in brands:
        # Core Rule: Genuine registrable domain or exact official domain match -> 0.0 immediately
        if registrable in b.official_domains or host in b.official_domains:
            return LookalikeResult(score=0.0, brand=b, reasons=[])

        for tok in b.tokens:
            tok_skel = skeleton(tok)
            t_len = len(tok_skel)
            if t_len == 0:
                continue

            # 1. Edit similarity on the primary domain label
            l_len = len(label_skel)
            max_len = max(l_len, t_len)
            dist = Levenshtein.distance(label_skel, tok_skel)
            sim = (1.0 - dist / max_len) if max_len > 0 else 0.0

            # 2. Contains brand token inside host / domain (Combosquatting)
            contains = False
            # Short tokens (< 3 chars, e.g. 'x', 'db', 'sc') or exact_only brands must match isolated segments
            if b.token_match == "exact_only" or t_len < 3:
                if tok_skel in host_tokens or label_skel == tok_skel:
                    contains = True
                elif dist <= 1 and t_len >= 4:
                    contains = True
            else:
                if tok_skel in host_no_dash:
                    contains = True

            # 3. Subdomain abuse: brand token is inside the subdomain of an unrelated registrable domain
            in_subdomain = False
            if b.token_match == "exact_only" or t_len < 3:
                if tok_skel in re.findall(r"[a-z0-9]+", sub_skel):
                    in_subdomain = True
            else:
                if tok_skel in sub_skel:
                    in_subdomain = True

            # Calculate base score for this token
            cand_score = sim
            reasons = []

            if sim >= 0.80:
                reasons.append("imitates_brand")

            if contains:
                cand_score = max(cand_score, 0.75)
                reasons.append("imitates_brand")
                reasons.append("combosquatting")

            if in_subdomain:
                cand_score = max(cand_score, 0.90)
                reasons.append("subdomain_abuse")
                reasons.append("imitates_brand")

            # Trust word detection alongside lookalike
            found_trust_words = [tw for tw in TRUST_WORDS if tw in host_tokens or tw in host_no_dash]
            if found_trust_words and cand_score >= 0.60:
                cand_score = min(1.0, cand_score + 0.10)
                reasons.append("trust_word_abuse")

            # TLD risk signal
            ext_suffix = norm_host.suffix
            if ext_suffix in SUSPICIOUS_TLDS and cand_score >= 0.60:
                cand_score = min(1.0, cand_score + 0.10)
                reasons.append("suspicious_tld")
            elif b.category == "bank" and cand_score >= 0.60:
                # If bank and not ending with brand's official endings
                official_suffixes = {tldextract.extract(od).suffix for od in b.official_domains}
                if ext_suffix not in official_suffixes:
                    cand_score = min(1.0, cand_score + 0.05)
                    reasons.append("suspicious_tld")

            # Punycode / IDN penalty
            if norm_host.is_punycode or "xn--" in host:
                cand_score = min(1.0, cand_score + 0.15)
                reasons.append("punycode_homoglyph")

            # Check for mixed-script confusables
            if confusables.is_confusable(norm_host.decoded_hostname):
                cand_score = min(1.0, cand_score + 0.10)
                if "punycode_homoglyph" not in reasons:
                    reasons.append("punycode_homoglyph")

            # Select best match: prefer higher score, then longer matched token
            if cand_score > best_score or (cand_score == best_score and t_len > best_match_len):
                best_score = cand_score
                best_match_len = t_len
                best_brand = b
                best_reasons = list(dict.fromkeys(reasons))
                best_token = tok

    # Clamp between 0.0 and 1.0
    best_score = max(0.0, min(1.0, best_score))

    # If the score is negligible, discard brand match to prevent false positives
    if best_score < 0.35:
        return LookalikeResult(score=best_score, brand=None, reasons=[])

    return LookalikeResult(
        score=best_score,
        brand=best_brand,
        reasons=best_reasons,
        matched_token=best_token,
    )
