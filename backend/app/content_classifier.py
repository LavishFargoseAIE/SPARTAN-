"""
Content classifier for credential-harvest / phishing page detection.

Two-layer approach:
  Layer 1 (always runs):  Rule-based HTML signal extraction — fast, <50ms
  Layer 2 (optional):     HuggingFace Inference API (zero-shot, bart-large-mnli)
                          Uses HF_TOKEN env var. Falls back gracefully if unavailable.

The combined output is a `content_risk_score` (0.0–1.0) and a list of reasons.
"""
from __future__ import annotations

import logging
import os
import re
from typing import Dict, List, Optional, Tuple

import httpx

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

_HF_API_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli"
_HF_TOKEN = os.getenv("HF_TOKEN", "")
_PAGE_FETCH_TIMEOUT = 4.0      # seconds to fetch the page
_HF_API_TIMEOUT = 6.0          # seconds to wait for HF inference
_MAX_TEXT_CHARS = 800           # chars sent to HF (keep cost low)

# Credential-harvesting keywords in page text / HTML attributes
_CREDENTIAL_KEYWORDS = [
    "enter your password", "confirm your password", "re-enter password",
    "enter your ssn", "social security", "date of birth",
    "credit card number", "card number", "cvv", "expiry date",
    "bank account", "routing number", "pin number",
    "verify your identity", "account suspended", "unusual activity",
    "security check", "your account has been", "locked out",
    "enter your email and password", "sign in to continue",
    "your session has expired",
]

# Suspicious form action patterns
_EXTERNAL_ACTION_RE = re.compile(
    r'<form[^>]+action\s*=\s*["\']?(https?://[^"\'>\s]+)',
    re.IGNORECASE,
)

# Count of password-type inputs
_PASSWORD_INPUT_RE = re.compile(r'<input[^>]+type\s*=\s*["\']?password', re.IGNORECASE)

# Hidden fields (common in phishing kits)
_HIDDEN_INPUT_RE = re.compile(r'<input[^>]+type\s*=\s*["\']?hidden', re.IGNORECASE)

# Iframe pointing to external domain
_IFRAME_RE = re.compile(r'<iframe[^>]+src\s*=\s*["\']?(https?://[^"\'>\s]+)', re.IGNORECASE)

# Meta refresh redirect
_META_REFRESH_RE = re.compile(r'<meta[^>]+http-equiv\s*=\s*["\']?refresh', re.IGNORECASE)

# ZeroFont / invisible text (common cloaking trick)
_ZEROFONT_RE = re.compile(r'font-size\s*:\s*0(px|pt|em)?', re.IGNORECASE)


# ---------------------------------------------------------------------------
# Page fetcher
# ---------------------------------------------------------------------------

async def fetch_page_html(hostname: str, timeout: float = _PAGE_FETCH_TIMEOUT) -> Optional[str]:
    """
    Fetch raw HTML of a hostname's root page.
    Returns None if unreachable or not HTML.
    """
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/120.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    for scheme in ("https", "http"):
        try:
            async with httpx.AsyncClient(
                timeout=timeout,
                verify=False,
                follow_redirects=True,
                headers=headers,
            ) as client:
                resp = await client.get(f"{scheme}://{hostname}/", headers=headers)
                ct = resp.headers.get("content-type", "")
                if resp.status_code == 200 and "html" in ct.lower():
                    return resp.text
        except Exception:
            continue
    return None


# ---------------------------------------------------------------------------
# Layer 1: Rule-based signal extraction
# ---------------------------------------------------------------------------

def extract_html_signals(html: str, hostname: str) -> Tuple[float, List[str]]:
    """
    Fast rule-based HTML analysis. Returns (risk_score 0-1, reasons).
    """
    risk = 0.0
    reasons: List[str] = []
    html_lower = html.lower()

    # 1. Password fields (high signal)
    pw_fields = len(_PASSWORD_INPUT_RE.findall(html))
    if pw_fields >= 2:
        risk = max(risk, 0.55)
        reasons.append(f"multiple_password_fields ({pw_fields})")
    elif pw_fields == 1:
        risk = max(risk, 0.30)
        reasons.append("password_field_present")

    # 2. External form action (posts credentials off-site)
    ext_actions = _EXTERNAL_ACTION_RE.findall(html)
    off_site = [a for a in ext_actions if hostname not in a]
    if off_site:
        risk = max(risk, 0.70)
        reasons.append(f"external_form_action: {off_site[0][:60]}")

    # 3. Credential keyword density
    kw_hits = sum(1 for kw in _CREDENTIAL_KEYWORDS if kw in html_lower)
    if kw_hits >= 3:
        risk = max(risk, 0.60)
        reasons.append(f"high_credential_keyword_density ({kw_hits} keywords)")
    elif kw_hits >= 1:
        risk = max(risk, 0.30)
        reasons.append(f"credential_keywords_present ({kw_hits})")

    # 4. Hidden inputs (phishing kits use many)
    hidden_count = len(_HIDDEN_INPUT_RE.findall(html))
    if hidden_count >= 5:
        risk = max(risk, 0.35)
        reasons.append(f"many_hidden_inputs ({hidden_count})")

    # 5. External iframes
    iframes = _IFRAME_RE.findall(html)
    ext_iframes = [i for i in iframes if hostname not in i]
    if ext_iframes:
        risk = max(risk, 0.35)
        reasons.append("external_iframe")

    # 6. Meta refresh redirect (auto-redirect to another domain)
    if _META_REFRESH_RE.search(html):
        risk = max(risk, 0.40)
        reasons.append("meta_refresh_redirect")

    # 7. Zero-font cloaking
    if _ZEROFONT_RE.search(html):
        risk = max(risk, 0.45)
        reasons.append("zero_font_cloaking")

    # 8. No favicon link (phishing pages often skip this)
    if "favicon" not in html_lower:
        risk = max(risk, 0.10)

    # 9. Very small page (parking / redirect stubs)
    if len(html) < 500 and pw_fields > 0:
        risk = max(risk, 0.50)
        reasons.append("tiny_page_with_login_form")

    return round(min(1.0, risk), 2), reasons


# ---------------------------------------------------------------------------
# Layer 2: HuggingFace zero-shot classification
# ---------------------------------------------------------------------------

def _extract_visible_text(html: str, max_chars: int = _MAX_TEXT_CHARS) -> str:
    """Strip HTML tags and extract visible text for NLP."""
    # Remove scripts and styles
    html = re.sub(r"<(script|style)[^>]*>.*?</(script|style)>", " ", html, flags=re.IGNORECASE | re.DOTALL)
    # Remove all tags
    text = re.sub(r"<[^>]+>", " ", html)
    # Collapse whitespace
    text = " ".join(text.split())
    return text[:max_chars]


async def classify_with_hf(text: str) -> Optional[dict]:
    """
    Call HuggingFace Inference API (bart-large-mnli) for zero-shot classification.

    Labels:
      - "credential harvesting phishing page"
      - "legitimate website"
      - "malware or scam page"

    Returns the raw HF response dict, or None on failure.
    """
    if not _HF_TOKEN:
        logger.debug("HF_TOKEN not set — skipping HF inference")
        return None

    payload = {
        "inputs": text,
        "parameters": {
            "candidate_labels": [
                "credential harvesting phishing page",
                "legitimate website",
                "malware or scam page",
            ],
            "multi_label": False,
        },
    }
    try:
        async with httpx.AsyncClient(timeout=_HF_API_TIMEOUT) as client:
            resp = await client.post(
                _HF_API_URL,
                json=payload,
                headers={"Authorization": f"Bearer {_HF_TOKEN}"},
            )
            if resp.status_code == 200:
                return resp.json()
            # 503 = model loading, 429 = rate limit — fail gracefully
            logger.debug("HF API returned %d for content classify", resp.status_code)
    except Exception as exc:
        logger.debug("HF content classification failed: %s", exc)
    return None


def _parse_hf_result(hf_response: dict) -> Tuple[float, str, List[str]]:
    """
    Parse HF zero-shot response into (risk_score, top_label, reasons).
    """
    labels = hf_response.get("labels", [])
    scores = hf_response.get("scores", [])
    if not labels or not scores:
        return 0.0, "unknown", []

    top_label = labels[0]
    top_score = scores[0]

    reasons = []
    risk = 0.0

    if "credential" in top_label and top_score > 0.5:
        risk = min(1.0, 0.50 + top_score * 0.40)  # 0.5 – 0.9
        reasons.append(f"ml_credential_harvest_detected ({top_score:.0%} confidence)")
    elif "malware" in top_label or "scam" in top_label:
        if top_score > 0.5:
            risk = min(1.0, 0.40 + top_score * 0.40)
            reasons.append(f"ml_malware_or_scam_detected ({top_score:.0%} confidence)")
    # legitimate → no risk boost

    return round(risk, 2), top_label, reasons


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def analyze_page_content(hostname: str) -> dict:
    """
    Full two-layer content analysis for a hostname.

    Returns:
        {
            "available": bool,           # False if page could not be fetched
            "rule_based_score": float,   # Layer 1 score
            "ml_score": float | None,    # Layer 2 score (None if HF unavailable)
            "content_risk_score": float, # max(rule_based, ml) capped at 1.0
            "top_label": str | None,     # HF top classification label
            "reasons": list[str],        # all signals found
            "html_length": int,          # page size (chars)
        }
    """
    html = await fetch_page_html(hostname)
    if html is None:
        return {
            "available": False,
            "rule_based_score": 0.0,
            "ml_score": None,
            "content_risk_score": 0.0,
            "top_label": None,
            "reasons": [],
            "html_length": 0,
        }

    # Layer 1
    rule_score, rule_reasons = extract_html_signals(html, hostname)

    # Layer 2 (only if page looks suspicious or has login elements — save HF quota)
    ml_score = None
    top_label = None
    ml_reasons: List[str] = []
    if rule_score >= 0.20:
        visible_text = _extract_visible_text(html)
        if len(visible_text) >= 30:
            hf_result = await classify_with_hf(visible_text)
            if hf_result:
                ml_score, top_label, ml_reasons = _parse_hf_result(hf_result)

    all_reasons = rule_reasons + ml_reasons
    content_risk = max(rule_score, ml_score or 0.0)

    return {
        "available": True,
        "rule_based_score": rule_score,
        "ml_score": ml_score,
        "content_risk_score": round(content_risk, 2),
        "top_label": top_label,
        "reasons": all_reasons,
        "html_length": len(html),
    }
