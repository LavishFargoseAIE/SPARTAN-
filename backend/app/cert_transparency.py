"""
Certificate Transparency (CT) monitoring via crt.sh JSON API.

Queries crt.sh for recently-issued certificates matching brand token patterns,
then scores them as suspicious if they contain brand keywords in unexpected domains.

Two main use-cases:
  1. On-demand: check if a specific hostname has suspicious certificates
  2. Brand sweep: find all newly-issued certs impersonating a brand (for analyst alerting)
"""
from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

# Seconds to wait before giving up on crt.sh
_CRTSH_TIMEOUT = 4.0

# Cache: registrable → (timestamp, result_list)
_CT_CACHE: Dict[str, Tuple[datetime, List[dict]]] = {}
_CT_CACHE_TTL_SECONDS = 3600  # 1 hour

CRTSH_BASE = "https://crt.sh"


# ---------------------------------------------------------------------------
# Low-level helpers
# ---------------------------------------------------------------------------

def _is_cache_fresh(registrable: str) -> bool:
    if registrable not in _CT_CACHE:
        return False
    ts, _ = _CT_CACHE[registrable]
    return (datetime.now(timezone.utc) - ts).total_seconds() < _CT_CACHE_TTL_SECONDS


def _parse_not_before(not_before_str: str) -> Optional[datetime]:
    """Parse crt.sh 'not_before' field (ISO 8601 with or without timezone)."""
    if not not_before_str:
        return None
    try:
        clean = not_before_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


async def fetch_crtsh(query: str, timeout: float = _CRTSH_TIMEOUT) -> List[dict]:
    """
    Query crt.sh JSON API for certificates matching `query`.
    Returns raw list of cert records (may be large — caller should filter).
    """
    url = f"{CRTSH_BASE}/?q={query}&output=json"
    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={"Accept": "application/json"},
        ) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return resp.json()
    except Exception as exc:
        logger.debug("crt.sh query %r failed: %s", query, exc)
    return []


# ---------------------------------------------------------------------------
# On-demand: check a specific hostname
# ---------------------------------------------------------------------------

async def fetch_domain_certs(
    registrable: str,
    timeout: float = _CRTSH_TIMEOUT,
) -> List[dict]:
    """
    Fetch certificates issued for *.<registrable> and <registrable>.
    Returns a list of cert dicts with fields: id, issuer_name, common_name,
    name_value, not_before, not_after.
    """
    if _is_cache_fresh(registrable):
        _, cached = _CT_CACHE[registrable]
        return cached

    # Query for all certs matching this registrable domain (wildcard + exact)
    results = await fetch_crtsh(f"%.{registrable}", timeout=timeout)
    _CT_CACHE[registrable] = (datetime.now(timezone.utc), results)
    return results


def _extract_domains_from_cert(cert: dict) -> List[str]:
    """Extract all domain names from a cert record's name_value field."""
    raw = cert.get("name_value", "") or cert.get("common_name", "")
    # name_value often contains multiple domains separated by newlines
    domains = [d.strip().lstrip("*.").lower() for d in raw.split("\n") if d.strip()]
    return domains


async def analyze_cert_transparency(
    hostname: str,
    registrable: str,
    brand_tokens: Optional[List[str]] = None,
    max_age_days: int = 90,
) -> dict:
    """
    Analyse Certificate Transparency logs for a hostname.

    Returns:
        {
            "cert_count": int,          # total certs found
            "recent_cert_count": int,   # certs issued in last max_age_days
            "first_seen": str | None,   # earliest cert issuance date
            "latest_seen": str | None,  # most recent cert issuance date
            "suspicious_names": list,   # SANs / CNs containing brand tokens on wrong domains
            "ct_risk_score": float,     # 0.0 → 1.0
            "reasons": list[str],       # human-readable signals
            "available": bool,          # False if crt.sh was unreachable
        }
    """
    try:
        certs = await asyncio.wait_for(
            fetch_domain_certs(registrable),
            timeout=_CRTSH_TIMEOUT + 1,
        )
    except (asyncio.TimeoutError, Exception) as exc:
        logger.debug("CT analysis unavailable for %s: %s", hostname, exc)
        return {
            "cert_count": 0,
            "recent_cert_count": 0,
            "first_seen": None,
            "latest_seen": None,
            "suspicious_names": [],
            "ct_risk_score": 0.0,
            "reasons": [],
            "available": False,
        }

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=max_age_days)

    dates: List[datetime] = []
    recent_count = 0
    suspicious_names: List[str] = []

    for cert in certs:
        not_before = _parse_not_before(cert.get("not_before", ""))
        if not_before:
            dates.append(not_before)
            if not_before >= cutoff:
                recent_count += 1

    # Brand-token abuse: check if any SAN/CN on certs contains brand keywords
    # but the cert is NOT for the brand's own domain
    if brand_tokens:
        for cert in certs:
            san_domains = _extract_domains_from_cert(cert)
            for san in san_domains:
                san_lower = san.lower()
                for token in brand_tokens:
                    if len(token) >= 4 and token.lower() in san_lower and registrable not in san_lower:
                        suspicious_names.append(san)
                        break

    suspicious_names = list(dict.fromkeys(suspicious_names))[:10]  # dedupe, cap at 10

    first_seen = min(dates).isoformat() if dates else None
    latest_seen = max(dates).isoformat() if dates else None

    # --- Risk scoring ---
    ct_risk = 0.0
    reasons: List[str] = []

    total = len(certs)
    if total == 0:
        # No certs at all — brand new domain, never seen by CT logs
        ct_risk = max(ct_risk, 0.35)
        reasons.append("no_ct_history")
    elif total == 1 and recent_count == 1:
        # First cert ever, issued very recently → suspicious
        ct_risk = max(ct_risk, 0.45)
        reasons.append("first_cert_recently_issued")

    if recent_count > 5:
        # Many certs in short window → could be automated cert churning (phishing infra)
        ct_risk = max(ct_risk, 0.40)
        reasons.append("high_cert_issuance_rate")

    if suspicious_names:
        ct_risk = max(ct_risk, 0.65)
        reasons.append(f"brand_name_in_san: {suspicious_names[0]}")

    # If first_seen is very recent (< 7 days) and total certs is low
    if dates:
        age_of_oldest = (now - min(dates)).days
        if age_of_oldest < 7:
            ct_risk = max(ct_risk, 0.55)
            reasons.append("cert_domain_less_than_7d_old")
        elif age_of_oldest < 30:
            ct_risk = max(ct_risk, 0.30)
            reasons.append("cert_domain_less_than_30d_old")

    return {
        "cert_count": total,
        "recent_cert_count": recent_count,
        "first_seen": first_seen,
        "latest_seen": latest_seen,
        "suspicious_names": suspicious_names,
        "ct_risk_score": round(ct_risk, 2),
        "reasons": reasons,
        "available": True,
    }


# ---------------------------------------------------------------------------
# Brand sweep: find certs impersonating a brand across all domains
# ---------------------------------------------------------------------------

async def brand_cert_sweep(
    brand_token: str,
    official_domains: List[str],
    max_results: int = 50,
    max_age_days: int = 30,
) -> List[dict]:
    """
    Search CT logs for certificates containing `brand_token` that are NOT
    issued for any of the `official_domains`.

    Useful for: alerting analysts about newly-spun-up phishing infrastructure.

    Returns a list of suspicious cert records, each with:
        {issuer, common_name, name_value, not_before, suspicious_domains}
    """
    try:
        raw = await asyncio.wait_for(
            fetch_crtsh(f"%{brand_token}%", timeout=_CRTSH_TIMEOUT),
            timeout=_CRTSH_TIMEOUT + 1,
        )
    except Exception as exc:
        logger.debug("Brand sweep for %r failed: %s", brand_token, exc)
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(days=max_age_days)
    official_set = {d.lower() for d in official_domains}

    findings: List[dict] = []
    for cert in raw:
        not_before = _parse_not_before(cert.get("not_before", ""))
        if not_before and not_before < cutoff:
            continue  # Too old

        san_domains = _extract_domains_from_cert(cert)
        suspicious = [
            d for d in san_domains
            if brand_token.lower() in d.lower() and d not in official_set
        ]
        if suspicious:
            findings.append({
                "issuer": cert.get("issuer_name", ""),
                "common_name": cert.get("common_name", ""),
                "name_value": cert.get("name_value", ""),
                "not_before": cert.get("not_before", ""),
                "suspicious_domains": suspicious[:5],
            })

        if len(findings) >= max_results:
            break

    return findings
