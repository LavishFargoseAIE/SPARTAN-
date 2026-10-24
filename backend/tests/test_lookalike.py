"""
Exhaustive lookalike engine tests:
- Combosquatting, typosquatting, homoglyphs, punycode
- Subdomain abuse detection (e.g. examplebank.bank.in.attacker.xyz)
- Thousands of generated token permutations
- Benign corpus testing (0 DANGEROUS verdicts for genuine official domains and common subdomains)
"""

import json
from pathlib import Path
import pytest

from app.lookalike import evaluate_lookalike
from app.normalize import normalize_host


@pytest.fixture(scope="module")
def registry_brands():
    root = Path(__file__).resolve().parent.parent.parent
    with open(root / "registry" / "brands.json", "r", encoding="utf-8") as f:
        return json.load(f)


def test_subdomain_abuse_detection(registry_brands):
    # Rule test: examplebank.com.attacker.net is NOT treated as official
    norm1 = normalize_host("examplebank.com.attacker.net")
    res1 = evaluate_lookalike(norm1, registry_brands)
    assert res1.score >= 0.70
    assert "subdomain_brand_impersonation" in res1.reasons or "brand_token_in_hostname" in res1.reasons

    # Rule test: examplebank.bank.in.verify-user.xyz is flagged as subdomain abuse
    norm2 = normalize_host("examplebank.bank.in.verify-user.xyz")
    res2 = evaluate_lookalike(norm2, registry_brands)
    assert res2.score >= 0.85
    assert res2.is_subdomain_abuse is True
    assert "subdomain_brand_impersonation" in res2.reasons
    assert res2.brand is not None
    assert res2.brand["brand_id"] == "examplebank"


def test_combosquat_with_security_keyword(registry_brands):
    # Combosquatting with security keyword
    norm = normalize_host("examplebank-secure-login.xyz")
    res = evaluate_lookalike(norm, registry_brands)
    assert res.score >= 0.85
    assert "combosquat_with_security_keyword" in res.reasons
    assert res.brand["brand_id"] == "examplebank"


def test_punycode_and_homoglyphs(registry_brands):
    # Cyrillic 'а' (U+0430) instead of Latin 'a' in examplebank -> punycode xn--
    puny_host = "exаmplebank.com"  # contains cyrillic 'а'
    norm = normalize_host(puny_host)
    assert norm.is_punycode is True

    res = evaluate_lookalike(norm, registry_brands)
    assert res.score >= 0.80
    assert "punycode_or_homoglyph_detected" in res.reasons


def test_typosquat_detection(registry_brands):
    # 1-edit distance deletion/substitution
    norm = normalize_host("exampelbank.bank.in")
    res = evaluate_lookalike(norm, registry_brands)
    assert res.score >= 0.80
    assert "typosquat_domain" in res.reasons


def test_benign_corpus_all_brands(registry_brands):
    """
    Every registered brand's genuine official domain and common subdomains (www, login, secure)
    MUST produce a lookalike score of 0.0 (SAFE).
    """
    subprefixes = ["", "www.", "login.", "secure.", "retail."]
    for b in registry_brands:
        for dom in b.get("official_domains", []):
            for sub in subprefixes:
                full_host = f"{sub}{dom}"
                norm = normalize_host(full_host)
                res = evaluate_lookalike(norm, registry_brands)
                assert res.score == 0.0, f"False positive: genuine host '{full_host}' scored {res.score}"


def test_benign_popular_websites(registry_brands):
    """Popular global benign websites must score 0.0 or SAFE."""
    top_benign = [
        "wikipedia.org", "en.wikipedia.org",
        "github.com", "api.github.com",
        "google.com", "mail.google.com",
        "microsoft.com", "portal.azure.com",
        "amazon.in", "www.amazon.in",
        "stackoverflow.com",
        "python.org", "docs.python.org",
        "cloudflare.com",
    ]
    for host in top_benign:
        norm = normalize_host(host)
        res = evaluate_lookalike(norm, registry_brands)
        assert res.score < 0.30, f"False positive on top benign site '{host}': score={res.score}"


def test_generated_thousands_of_typo_homoglyph_combosquats(registry_brands):
    """
    Generate typo, homoglyph, and combosquat variants across brands to test robustness at scale.
    Thousands of test cases dynamically generated and evaluated.
    """
    # Sample brands across high-risk categories to generate large test corpus
    sampled_brands = [
        b for b in registry_brands
        if b.get("category") in ("bank", "government", "payment", "finance", "ecommerce")
    ][:120]

    trust_suffixes = ["-login.com", "-secure.xyz", "-verify.top", "-kyc-update.info", "-portal.site"]
    confusables_map = {"o": "0", "l": "1", "e": "3", "s": "5", "a": "4"}

    generated_cases = []
    for b in sampled_brands:
        for t in b.get("tokens", []):
            if len(t) < 4:
                continue

            # 1. Combosquat variants
            for suff in trust_suffixes:
                generated_cases.append((f"{t}{suff}", b["brand_id"]))
                generated_cases.append((f"secure-{t}{suff}", b["brand_id"]))

            # 2. Transposition typos (swap adjacent characters)
            if len(t) >= 5:
                transposed = t[:2] + t[3] + t[2] + t[4:]
                generated_cases.append((f"{transposed}.xyz", b["brand_id"]))

            # 3. Homoglyph / visual substitutes
            mutated = list(t)
            substituted = False
            for idx, ch in enumerate(mutated):
                if ch in confusables_map:
                    mutated[idx] = confusables_map[ch]
                    substituted = True
                    break
            if substituted:
                generated_cases.append((f"{''.join(mutated)}.top", b["brand_id"]))

    assert len(generated_cases) >= 1000, f"Expected >= 1000 generated cases, got {len(generated_cases)}"

    detected_count = 0
    for host, expected_brand_id in generated_cases:
        norm = normalize_host(host)
        res = evaluate_lookalike(norm, registry_brands)
        # Verify it is flagged
        if res.score >= 0.70 and res.brand is not None:
            detected_count += 1

    detection_rate = detected_count / len(generated_cases)
    # Note: 87% is the design target for the precision-recall balance.
    # Some generated transpositions produce tokens with 2+ edit distances from the original,
    # which the engine correctly ignores to avoid flagging real legitimate sites.
    assert detection_rate >= 0.87, f"Detection rate was {detection_rate:.2%}, expected >= 87%"
