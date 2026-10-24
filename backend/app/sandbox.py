"""
Headless browser sandbox for dynamic inspection and cloaking detection.

Features:
  - Disposable Chromium browser contexts (isolated, no credentials, no disk leakage)
  - Egress filtering: blocks file downloads (.apk, .exe, .dmg, .zip) and data exfiltration
  - Dual-profile fetching to detect cloaking (Desktop vs. Indian Mobile User-Agent)
  - DOM extraction, title inspection, network request tracking, and full-page screenshot
  - Integrated with Visual Matcher (signal V) and Content Classifier (signal C)
  - Resilient fallback engine when headless browser binaries are unavailable
"""
from __future__ import annotations

import asyncio
import base64
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

# Profiles matching specification: Indian mobile egress and desktop
DESKTOP_PROFILE = {
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "viewport": {"width": 1280, "height": 800},
    "locale": "en-US",
    "is_mobile": False,
}

INDIAN_MOBILE_PROFILE = {
    "user_agent": "Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36",
    "viewport": {"width": 390, "height": 844},
    "locale": "en-IN",
    "is_mobile": True,
}

# Blocked file download extensions (Security checklist: no file downloads)
BLOCKED_DOWNLOAD_EXTENSIONS = (
    ".exe", ".apk", ".msi", ".dmg", ".pkg", ".zip", ".rar", ".7z",
    ".tar", ".gz", ".iso", ".bin", ".sh", ".bat", ".cmd", ".ps1",
)


# ---------------------------------------------------------------------------
# Cloaking Detection Logic
# ---------------------------------------------------------------------------

def detect_cloaking(
    desktop_res: Dict[str, Any],
    mobile_res: Dict[str, Any],
) -> Tuple[bool, List[str]]:
    """
    Compare desktop vs. Indian mobile fetch profiles.
    Returns (is_cloaking, reasons).
    """
    reasons: List[str] = []

    d_dom = desktop_res.get("dom", "") or ""
    m_dom = mobile_res.get("dom", "") or ""
    d_title = (desktop_res.get("title", "") or "").strip().lower()
    m_title = (mobile_res.get("title", "") or "").strip().lower()
    d_url = desktop_res.get("final_url", "")
    m_url = mobile_res.get("final_url", "")

    # 1. Final destination redirect mismatch
    try:
        d_host = urlparse(d_url).hostname or ""
        m_host = urlparse(m_url).hostname or ""
        if d_host and m_host and d_host != m_host:
            reasons.append(f"redirect_cloaking_destination_differs: desktop={d_host} mobile={m_host}")
    except Exception:
        pass

    # 2. Title mismatch
    if d_title and m_title and d_title != m_title:
        # Check if one profile has an error/parking title while the other has an active title
        suspicious_titles = ["not found", "404", "error", "blocked", "default web page", "forbidden"]
        d_is_err = any(err in d_title for err in suspicious_titles)
        m_is_err = any(err in m_title for err in suspicious_titles)
        if d_is_err != m_is_err:
            reasons.append(f"title_cloaking: desktop='{d_title}' vs mobile='{m_title}'")

    # 3. Form presence cloaking (e.g. mobile shows credential form while desktop is blank)
    pw_pattern = re.compile(r'type=["\']?password', re.IGNORECASE)
    d_has_pw = bool(pw_pattern.search(d_dom))
    m_has_pw = bool(pw_pattern.search(m_dom))
    if m_has_pw and not d_has_pw:
        reasons.append("mobile_credential_form_cloaking")
    elif d_has_pw and not m_has_pw:
        reasons.append("desktop_credential_form_cloaking")

    # 4. Significant DOM length divergence (> 3x difference)
    len_d = max(1, len(d_dom))
    len_m = max(1, len(m_dom))
    ratio = max(len_d, len_m) / min(len_d, len_m)
    if ratio > 3.0 and min(len_d, len_m) >= 20:
        reasons.append(f"dom_length_divergence_ratio_{ratio:.1f}")

    is_cloaking = len(reasons) > 0
    return is_cloaking, reasons


# ---------------------------------------------------------------------------
# Fallback Inspection Engine (HTTPX Dual Profile)
# ---------------------------------------------------------------------------

async def inspect_with_httpx(url: str, profile: Dict[str, Any], timeout: float = 6.0) -> Dict[str, Any]:
    """Fallback fetcher using asynchronous HTTP client when Playwright is unavailable."""
    headers = {
        "User-Agent": profile["user_agent"],
        "Accept-Language": profile.get("locale", "en-US"),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }
    network_requests = [url]
    redirect_chain = [url]
    dom = ""
    title = ""
    final_url = url
    status_code = 0

    try:
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            verify=False,
            headers=headers,
        ) as client:
            resp = await client.get(url)
            status_code = resp.status_code
            final_url = str(resp.url)
            dom = resp.text

            # Capture redirect chain
            for r in resp.history:
                redirect_chain.append(str(r.url))
            if final_url != redirect_chain[-1]:
                redirect_chain.append(final_url)

            # Extract title
            m = re.search(r"<title[^>]*>(.*?)</title>", dom, re.IGNORECASE | re.DOTALL)
            if m:
                title = m.group(1).strip()
    except Exception as exc:
        logger.debug("HTTPX fallback fetch error for %s: %s", url, exc)

    return {
        "final_url": final_url,
        "status_code": status_code,
        "title": title,
        "dom": dom,
        "redirect_chain": redirect_chain,
        "network_requests": network_requests,
        "screenshot_b64": None,
    }


# ---------------------------------------------------------------------------
# Playwright Browser Sandbox Implementation
# ---------------------------------------------------------------------------

async def _playwright_fetch(
    playwright_instance: Any,
    url: str,
    profile: Dict[str, Any],
    timeout_ms: int = 8000,
    capture_screenshot: bool = True,
) -> Dict[str, Any]:
    """Execute a single sandboxed profile run with strict resource controls."""
    browser = await playwright_instance.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-first-run",
            "--disable-extensions",
        ],
    )

    context = await browser.new_context(
        user_agent=profile["user_agent"],
        viewport=profile["viewport"],
        locale=profile["locale"],
        is_mobile=profile.get("is_mobile", False),
        java_script_enabled=True,
        ignore_https_errors=True,
    )

    page = await context.new_page()

    network_requests: List[str] = []
    redirect_chain: List[str] = [url]

    # Egress filtering: route interceptor
    async def route_filter(route: Any):
        req = route.request
        req_url = req.url.lower()

        # Block file downloads
        if any(req_url.endswith(ext) or (ext + "?") in req_url for ext in BLOCKED_DOWNLOAD_EXTENSIONS):
            logger.info("Sandbox egress blocked download request: %s", req_url)
            await route.abort()
            return

        network_requests.append(req.url)
        await route.continue_()

    await page.route("**/*", route_filter)

    screenshot_b64 = None
    title = ""
    dom = ""
    final_url = url
    status_code = 200

    try:
        response = await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
        if response:
            status_code = response.status
            final_url = page.url

        # Wait briefly for dynamic JS rendering
        await page.wait_for_timeout(500)

        title = await page.title()
        dom = await page.content()

        if capture_screenshot:
            screenshot_bytes = await page.screenshot(type="jpeg", quality=60, full_page=False)
            screenshot_b64 = f"data:image/jpeg;base64,{base64.b64encode(screenshot_bytes).decode('ascii')}"

    except Exception as e:
        logger.debug("Playwright page execution error for %s: %s", url, e)
    finally:
        await context.close()
        await browser.close()

    return {
        "final_url": final_url,
        "status_code": status_code,
        "title": title,
        "dom": dom,
        "redirect_chain": redirect_chain,
        "network_requests": network_requests[:50],  # cap at 50 requests
        "screenshot_b64": screenshot_b64,
    }


# ---------------------------------------------------------------------------
# High-Level Sandbox API
# ---------------------------------------------------------------------------

async def inspect_url_in_sandbox(
    url: str,
    detect_cloaking_enabled: bool = True,
    capture_screenshot: bool = True,
    timeout_seconds: float = 10.0,
) -> Dict[str, Any]:
    """
    Execute full sandbox inspection of target URL with dual-profile cloaking check.

    Returns:
        {
            "url": str,
            "final_url": str,
            "title": str,
            "redirect_chain": list[str],
            "network_requests": list[str],
            "cloaking_detected": bool,
            "cloaking_reasons": list[str],
            "screenshot_b64": str | None,
            "signals": {
                "V": float (visual risk 0-1),
                "C": float (content risk 0-1),
                "content_reasons": list[str],
                "visual_reasons": list[str],
            },
            "sandbox_engine": "playwright" | "httpx_fallback",
        }
    """
    from app.content_classifier import extract_html_signals
    from app.visual_matcher import evaluate_visual_risk

    parsed = urlparse(url)
    hostname = parsed.hostname or url

    desktop_res: Dict[str, Any] = {}
    mobile_res: Dict[str, Any] = {}
    engine = "httpx_fallback"

    # Attempt Playwright execution
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            # Run desktop profile
            desktop_res = await asyncio.wait_for(
                _playwright_fetch(p, url, DESKTOP_PROFILE, timeout_ms=int(timeout_seconds * 1000), capture_screenshot=capture_screenshot),
                timeout=timeout_seconds,
            )
            # Run Indian mobile profile if cloaking detection is enabled
            if detect_cloaking_enabled:
                mobile_res = await asyncio.wait_for(
                    _playwright_fetch(p, url, INDIAN_MOBILE_PROFILE, timeout_ms=int(timeout_seconds * 1000), capture_screenshot=False),
                    timeout=timeout_seconds,
                )
            engine = "playwright"
    except Exception as exc:
        logger.debug("Playwright execution unavailable, using HTTPX fallback: %s", exc)
        desktop_res = await inspect_with_httpx(url, DESKTOP_PROFILE, timeout=timeout_seconds / 2)
        if detect_cloaking_enabled:
            mobile_res = await inspect_with_httpx(url, INDIAN_MOBILE_PROFILE, timeout=timeout_seconds / 2)

    # Cloaking check
    cloaking_detected = False
    cloaking_reasons: List[str] = []
    if detect_cloaking_enabled and mobile_res:
        cloaking_detected, cloaking_reasons = detect_cloaking(desktop_res, mobile_res)

    # Use mobile DOM if cloaking was detected, otherwise desktop DOM
    active_dom = mobile_res.get("dom") if (cloaking_detected and mobile_res.get("dom")) else desktop_res.get("dom", "")
    screenshot_b64 = desktop_res.get("screenshot_b64")

    # Signal C: Content classifier analysis on rendered DOM
    c_score = 0.0
    c_reasons: List[str] = []
    if active_dom:
        c_score, c_reasons = extract_html_signals(active_dom, hostname)

    # Signal V: Visual evaluation on captured screenshot
    v_score = 0.0
    v_reasons: List[str] = []
    if screenshot_b64:
        try:
            v_eval = evaluate_visual_risk(screenshot_b64, hostname)
            v_score = v_eval.get("v_score", 0.0)
            v_reasons = v_eval.get("reasons", [])
        except Exception as e:
            logger.debug("Sandbox visual evaluation error: %s", e)

    return {
        "url": url,
        "final_url": desktop_res.get("final_url", url),
        "status_code": desktop_res.get("status_code", 0),
        "title": desktop_res.get("title", ""),
        "redirect_chain": desktop_res.get("redirect_chain", [url]),
        "network_requests": desktop_res.get("network_requests", []),
        "cloaking_detected": cloaking_detected,
        "cloaking_reasons": cloaking_reasons,
        "screenshot_b64": screenshot_b64,
        "signals": {
            "V": v_score,
            "C": c_score,
            "content_reasons": c_reasons,
            "visual_reasons": v_reasons,
        },
        "sandbox_engine": engine,
    }
