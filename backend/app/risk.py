"""
Risk scoring, overrides, verdict levels, and brand confidence resolver.
"""

from __future__ import annotations
from typing import Any, Dict, Optional
from app.registry import BrandEntry, BrandRegistry

WEIGHTS = {"L": 0.30, "T": 0.20, "D": 0.20, "V": 0.20, "C": 0.10}
REDIRECT_MIN_CONFIDENCE = 0.80


def compute_risk_score(signals: Dict[str, Any], category: Optional[str] = None) -> int:
    """
    R = 100 x (0.30 L + 0.20 T + 0.20 D + 0.20 V + 0.10 C)
    Renormalizes weights over available signals only.
    Handles hard overrides:
      - is_official -> 0 (Safe)
      - T >= 1.0 (threat feed hit) -> R >= 90 (Dangerous)
      - C_form_cross_domain and L > 0.6 -> R >= 80 (Dangerous)
      - Bank/government multiplier on L/V weights (1.2x)
    """
    if signals.get("is_official"):
        return 0

    used = {k: w for k, w in WEIGHTS.items() if k in signals and signals[k] is not None}
    if not used:
        return 0

    w_copy = dict(used)
    if category in ("bank", "government") and signals.get("L", 0) > 0.5:
        if "L" in w_copy:
            w_copy["L"] = min(0.60, w_copy["L"] * 1.2)
        if "V" in w_copy:
            w_copy["V"] = min(0.60, w_copy["V"] * 1.2)

    total_weight = sum(w_copy.values())
    if total_weight <= 0:
        return 0

    base = sum(float(signals[k]) * w for k, w in w_copy.items()) / total_weight

    # Overrides
    if signals.get("T", 0) >= 1.0:
        base = max(base, 0.90)

    if signals.get("C_form_cross_domain") and signals.get("L", 0) > 0.60:
        base = max(base, 0.80)

    # Subdomain abuse or shared-hosting abuse of sensitive institutions
    if (signals.get("subdomain_abuse") or signals.get("shared_hosting_abuse")) and signals.get("L", 0) >= 0.70:
        base = max(base, 0.85)

    score = round(100 * base)
    return max(0, min(100, score))


def get_verdict_level(score: int) -> str:
    """Classify score into SAFE (< 30), SUSPICIOUS (30 to 69), or DANGEROUS (>= 70)."""
    if score < 30:
        return "SAFE"
    elif score < 70:
        return "SUSPICIOUS"
    else:
        return "DANGEROUS"


def calculate_brand_confidence(L: float, V: Optional[float] = None) -> float:
    """Brand confidence B = max(L, (L + V) / 2) if V is available, else L."""
    if V is None:
        return L
    return max(L, (L + V) / 2.0)


def resolve_official_brand(
    brand: Optional[BrandEntry],
    confidence: float,
    registry: BrandRegistry,
) -> Optional[Dict[str, Any]]:
    """
    Resolve official brand redirect if confidence >= 0.80 and brand is verified.
    Unverified or expired entries disable the redirect button (warning only).
    """
    if brand is None:
        return None

    if confidence < REDIRECT_MIN_CONFIDENCE:
        return None

    # Crucial security rule: only verified entries can offer the redirect button
    if not brand.verified:
        return None

    try:
        sig = registry.sign_redirect(brand.display_name, brand.canonical_url)
    except Exception:
        sig = brand.signature or ""

    return {
        "brand_id": brand.brand_id,
        "name": brand.display_name,
        "confidence": round(confidence, 2),
        "official_url": brand.canonical_url,
        "signature": sig,
    }
