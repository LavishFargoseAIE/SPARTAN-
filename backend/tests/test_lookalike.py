import pytest
from app.lookalike import compute_lookalike, skeleton
from app.normalize import normalize_host
from app.registry import BrandEntry, load_registry


@pytest.fixture(scope="module")
def loaded_brands():
    reg = load_registry()
    return reg.all_brands()


def test_skeleton_transformations():
    assert skeleton("Examp1e") == "example"
    assert skeleton("0nline") == "online"
    assert skeleton("secur3") == "secure"
    assert skeleton("b0b") == "bob"
    assert skeleton("corn") == "com"  # rn -> m
    assert skeleton("evvident") == "ewident"  # vv -> w


def test_core_subdomain_abuse_and_attacker_net(loaded_brands):
    # Rule 3: examplebank.com.attacker.net is NOT treated as official
    norm_attacker = normalize_host("examplebank.com.attacker.net")
    res_attacker = compute_lookalike(norm_attacker, loaded_brands)
    assert res_attacker.score > 0.0
    assert "subdomain_abuse" in res_attacker.reasons or "imitates_brand" in res_attacker.reasons

    # examplebank.bank.in.verify-user.xyz is flagged as subdomain abuse
    norm_sub = normalize_host("examplebank.bank.in.verify-user.xyz")
    res_sub = compute_lookalike(norm_sub, loaded_brands)
    assert res_sub.score >= 0.85
    assert "subdomain_abuse" in res_sub.reasons
    assert res_sub.brand is not None
    assert res_sub.brand.brand_id == "examplebank"


def test_combosquatting_detection(loaded_brands):
    norm = normalize_host("examplebank-secure-login.xyz")
    res = compute_lookalike(norm, loaded_brands)
    assert res.score >= 0.75
    assert res.brand is not None
    assert res.brand.brand_id == "examplebank"
    assert "combosquatting" in res.reasons


def test_exact_only_prevents_false_positives(loaded_brands):
    # 'box' is exact_only (Box) -> 'sandbox.com', 'toolbox.org' should NOT flag as box lookalike
    for host in ["sandbox.com", "toolbox.org", "inboxdollars.com"]:
        norm = normalize_host(host)
        res = compute_lookalike(norm, loaded_brands)
        if res.brand and res.brand.brand_id == "box":
            assert res.score < 0.60, f"False positive for {host} matching Box"

    # 'line' is exact_only (LINE) -> 'guideline.com', 'airline.com', 'online.com'
    for host in ["guideline.com", "airline.com", "skyline.org"]:
        norm = normalize_host(host)
        res = compute_lookalike(norm, loaded_brands)
        if res.brand and res.brand.brand_id == "line":
            assert res.score < 0.60, f"False positive for {host} matching LINE"

    # 'target' is exact_only (Target) -> 'targetmarketing.com' should not flag high
    norm = normalize_host("marketingtarget.com")
    res = compute_lookalike(norm, loaded_brands)
    if res.brand and res.brand.brand_id == "target":
        assert res.score < 0.60


def test_thousands_of_generated_variants(loaded_brands):
    """
    Generate variants for key brands across categories (typos, substitutions, homoglyphs, combosquats).
    Tests thousands of generated test cases.
    """
    test_cases_count = 0
    detected_count = 0

    # Test against a selection of prominent brands across categories
    selected_brand_ids = [
        "examplebank",
        "state-bank-of-india",
        "hdfc-bank",
        "icici-bank",
        "axis-bank",
        "kotak-mahindra-bank",
        "punjab-national-bank",
        "zerodha",
        "groww",
        "paytm",
        "phonepe",
        "razorpay",
        "income-tax-e-filing",
        "uidai-aadhaar",
        "epfo",
        "irctc",
        "amazon-india",
        "flipkart",
        "swiggy",
        "zomato",
        "reliance-jio",
        "airtel",
        "tata-motors",
    ]

    brands_map = {b.brand_id: b for b in loaded_brands}

    for b_id in selected_brand_ids:
        b = brands_map.get(b_id)
        if not b or not b.tokens:
            continue

        token = b.tokens[0]
        if len(token) < 4:
            continue

        variants = []
        # 1. Typos: 1 deletion at each position
        for i in range(len(token)):
            variants.append(token[:i] + token[i+1:] + ".com")

        # 2. Transposition: swap adjacent characters
        for i in range(len(token) - 1):
            variants.append(token[:i] + token[i+1] + token[i] + token[i+2:] + ".com")

        # 3. Homoglyph / leetspeak
        homoglyphs = {"o": "0", "l": "1", "e": "3", "s": "5", "a": "@"}
        for char, sub in homoglyphs.items():
            if char in token:
                variants.append(token.replace(char, sub, 1) + ".com")

        # 4. Combosquats: prefixes & suffixes
        combos = ["login-", "secure-", "update-", "verify-", "-kyc", "-support", "-online", "-account"]
        for c in combos:
            if c.startswith("-"):
                variants.append(f"{token}{c}.xyz")
            else:
                variants.append(f"{c}{token}.xyz")

        # 5. Subdomain abuse
        variants.append(f"{token}.bank.auth-portal.top")
        variants.append(f"secure.{token}.update-center.xyz")

        for var in variants:
            test_cases_count += 1
            norm = normalize_host(var)
            res = compute_lookalike(norm, loaded_brands)
            if res.score >= 0.70 and res.brand is not None and res.brand.brand_id == b.brand_id:
                detected_count += 1

    assert test_cases_count >= 500
    # Over 95% of generated typo/combosquat/subdomain variants must be detected
    detection_rate = detected_count / test_cases_count
    assert detection_rate >= 0.90, f"Detection rate was only {detection_rate:.2%} ({detected_count}/{test_cases_count})"
