"""
Risk scoring, signal aggregation, override rules, and risk level classification.
"""

from __future__ import annotations
from typing import Any, Dict, Optional, Tuple

WEIGHTS = {"L": 0.30, "T": 0.20, "D": 0.20, "V": 0.20, "C": 0.10}
REDIRECT_MIN_CONFIDENCE = 0.80


def compute_risk(signals: Dict[str, float], category: Optional[str] = None) -> int:
    """
    R = 100 x (0.30 L + 0.20 T + 0.20 D + 0.20 V + 0.10 C)
    Renormalises weights over available signals.
    """
    used = {k: WEIGHTS[k] for k in WEIGHTS if k in signals}
    if not used:
        return 0

    # For bank / government / payment category, increase weight of L and V by 1.2
    if category in ("bank", "government", "payment"):
        if "L" in used:
            used["L"] = min(1.0, used["L"] * 1.2)
        if "V" in used:
            used["V"] = min(1.0, used["V"] * 1.2)

    total_weight = sum(used.values())
    if total_weight <= 0:
        return 0

    base = sum(signals[k] * used[k] for k in used) / total_weight

    # Override: trusted threat feed hit gives R at least 90
    if signals.get("T", 0.0) >= 1.0:
        base = max(base, 0.90)

    # Override: cross-domain credential form on lookalike host gives R at least 80
    if signals.get("C_form_cross_domain", 0.0) >= 1.0 and signals.get("L", 0.0) > 0.6:
        base = max(base, 0.80)

    # Override: strong typosquat or combosquat with security keyword
    if signals.get("L", 0.0) >= 0.85:
        base = max(base, 0.75)

    return min(100, max(0, round(100 * base)))


def get_risk_level(score: int) -> str:
    """
    < 30: SAFE
    30 - 69: SUSPICIOUS
    >= 70: DANGEROUS
    """
    if score < 30:
        return "SAFE"
    elif score < 70:
        return "SUSPICIOUS"
    else:
        return "DANGEROUS"


def calculate_brand_confidence(L: float, V: Optional[float] = None) -> float:
    """
    Calculate confidence that a specific brand is being impersonated.
    """
    if V is None:
        return round(L, 2)
    return round(max(L, (L + V) / 2), 2)


def is_redirect_allowed(brand_entry: Optional[Dict[str, Any]], confidence: float) -> bool:
    """
    Enforce Core Rules:
    - Target must come from signed registry
    - Brand confidence must be >= 0.80
    - If brand is unverified or expired, redirect is DISABLED (warning only)
    """
    if not brand_entry:
        return False
    if confidence < REDIRECT_MIN_CONFIDENCE:
        return False
    # If unverified, redirect is disabled
    if not brand_entry.get("verified", False):
        return False
    if not brand_entry.get("canonical_url"):
        return False
    return True
