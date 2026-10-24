"""
FastAPI application for SiteGuard Detection API.
"""

from __future__ import annotations
import asyncio
import hashlib
import json
import logging
import uuid
from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.cache import verdict_cache
from app.config import settings
from app.domain_intel import get_domain_intel
from app.feeds import feeds_manager
from app.lookalike import compute_lookalike
from app.normalize import normalize_host
from app.reasons import select_top_reasons
from app.registry import BrandRegistry, load_registry
from app.web_surfer import analyze_web_reputation
from app.url_model import predict_url_risk
from app.cert_transparency import analyze_cert_transparency, brand_cert_sweep
from app.content_classifier import analyze_page_content
from app.risk import (
    calculate_brand_confidence,
    compute_risk_score,
    get_verdict_level,
    resolve_official_brand,
)

logging.basicConfig(level=logging.INFO if not settings.DEBUG else logging.DEBUG)
logger = logging.getLogger("siteguard")

# Global in-memory registry instance (pre-loaded)
registry: BrandRegistry = load_registry()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global registry
    logger.info("Initializing SiteGuard API...")
    if not registry._brands:
        registry = load_registry()
    await verdict_cache.initialize()
    yield
    await verdict_cache.close()
    logger.info("SiteGuard API shut down.")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS Middleware - allows any device or browser extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request & Response Models
class CheckRequest(BaseModel):
    host: str = Field(..., description="The hostname to inspect (never full path or query)")
    client: Optional[str] = Field("ext-0.1.0", description="Client identifier")
    lang: Optional[str] = Field("en", description="Client language (e.g. en, hi, mr)")


class BrandResponse(BaseModel):
    name: str
    confidence: float
    official_url: str
    signature: str


class WebReputationResult(BaseModel):
    status: str
    is_genuine: bool
    summary: str
    sources: List[str] = []
    wiki_article: Optional[str] = None
    discussion_sample: List[str] = []


class CheckResponse(BaseModel):
    host: str
    level: str  # SAFE, SUSPICIOUS, DANGEROUS
    score: int  # 0 to 100
    reasons: List[str]
    brand: Optional[BrandResponse] = None
    ttl: int = 3600
    analysis: str = "completed"
    web_reputation: Optional[WebReputationResult] = None
    url_ml_score: Optional[float] = None  # ML phishing probability (0-1), None if model unavailable
    content_risk_score: Optional[float] = None  # Page content analysis risk (0-1)


class ReportRequest(BaseModel):
    host: str
    reason: Optional[str] = "suspicious_site"
    reporter: Optional[str] = "user"
    details: Optional[str] = None


@app.post("/v1/check", response_model=CheckResponse)
async def check_host(req: CheckRequest) -> CheckResponse:
    """
    Core inspection endpoint. Evaluates host against allowlist, lookalike engine,
    domain intelligence, and threat feeds before page renders.
    """
    try:
        norm = normalize_host(req.host)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid host format: {str(e)}",
        )

    # 1. Allowlist check: exact match of registrable domain or hostname
    if registry.is_official(norm.registrable, norm.hostname):
        return CheckResponse(
            host=norm.hostname,
            level="SAFE",
            score=0,
            reasons=[],
            brand=None,
            ttl=86400,
            analysis="allowlisted",
        )

    # 2. Check cache
    cached = await verdict_cache.get(norm.hostname)
    if cached:
        return CheckResponse(**cached)

    # 3. Parallel checks: Lookalike, Threat Feeds, Domain Intel
    all_brands = registry.all_brands()
    lookalike_res = compute_lookalike(norm, all_brands)

    t_score, feed_reasons = await feeds_manager.check(norm.hostname, norm.registrable)
    brand_tokens = lookalike_res.brand.tokens if lookalike_res.brand else None
    d_score, domain_reasons = await get_domain_intel(norm, brand_tokens=brand_tokens)

    # Signals dict
    signals: Dict[str, Any] = {
        "L": lookalike_res.score,
        "T": t_score,
        "D": d_score,
        "subdomain_abuse": "subdomain_abuse" in lookalike_res.reasons,
        "shared_hosting_abuse": "shared_hosting_abuse" in domain_reasons,
        "brand_impersonation_in_title": "brand_impersonation_in_title" in domain_reasons,
    }

    category = lookalike_res.brand.category if lookalike_res.brand else None
    score = compute_risk_score(signals, category=category)
    level = get_verdict_level(score)

    all_reasons = lookalike_res.reasons + feed_reasons + domain_reasons
    top_reasons = select_top_reasons(all_reasons, max_count=3)

    # Resolve official brand redirect
    brand_resp = None
    if lookalike_res.brand:
        conf = calculate_brand_confidence(lookalike_res.score)
        official_data = resolve_official_brand(lookalike_res.brand, conf, registry)
        if official_data:
            brand_resp = BrandResponse(
                name=official_data["name"],
                confidence=official_data["confidence"],
                official_url=official_data["official_url"],
                signature=official_data["signature"],
            )

    ttl = 86400 if level == "SAFE" else 3600

    # URL ML model: fast phishing-URL pattern scoring
    url_ml_score: Optional[float] = None
    try:
        url_for_ml = f"https://{norm.hostname}/"
        ml_result = predict_url_risk(url_for_ml)
        if ml_result["available"]:
            url_ml_score = ml_result["score"]
            if ml_result["score"] > 0.6 and level != "SAFE":
                top_reasons.append(
                    f"URL pattern suggests phishing (ML confidence: {ml_result['score']:.0%})"
                )
                top_reasons = select_top_reasons(top_reasons, max_count=4)
            if ml_result["is_phishing"] and level != "SAFE":
                score = min(100, score + 20)
                level = get_verdict_level(score)
    except Exception as e:
        logger.debug("URL ML scoring failed for %s: %s", norm.hostname, e)

    # Content Classifier: page-level HTML analysis + HF zero-shot NLP
    # Only run when level is already suspicious (save latency for safe sites)
    content_risk_score: Optional[float] = None
    if level in ("SUSPICIOUS", "DANGEROUS"):
        try:
            content = await asyncio.wait_for(
                analyze_page_content(norm.hostname),
                timeout=8.0,
            )
            if content["available"]:
                content_risk_score = content["content_risk_score"]
                if content_risk_score >= 0.50:
                    for r in content["reasons"]:
                        top_reasons.append(r)
                    top_reasons = select_top_reasons(top_reasons, max_count=5)
                    score = min(100, score + int(content_risk_score * 20))
                    level = get_verdict_level(score)
        except Exception as e:
            logger.debug("Content classifier failed for %s: %s", norm.hostname, e)

    # Web Surfer: for unknown domains (no brand match) that are flagged, run web reputation
    web_rep_result: Optional[WebReputationResult] = None
    if lookalike_res.brand is None and level in ("SUSPICIOUS", "DANGEROUS"):
        try:
            rep = await asyncio.wait_for(
                analyze_web_reputation(norm.hostname, norm.registrable),
                timeout=5.0,
            )
            # If web surfer confirms genuine → override to SAFE
            if rep.get("unlock") and rep.get("is_genuine"):
                level = "SAFE"
                score = 0
                ttl = 86400
                top_reasons = []
            web_rep_result = WebReputationResult(
                status=rep["status"],
                is_genuine=rep["is_genuine"],
                summary=rep["summary"],
                sources=rep.get("sources", []),
                wiki_article=rep.get("wiki_article"),
                discussion_sample=rep.get("discussion_sample", []),
            )
        except Exception as e:
            logger.debug("Web surfer timed out or failed for %s: %s", norm.hostname, e)

    resp_dict = {
        "host": norm.hostname,
        "level": level,
        "score": score,
        "reasons": top_reasons,
        "brand": brand_resp.model_dump() if brand_resp else None,
        "ttl": ttl,
        "analysis": "completed",
        "web_reputation": web_rep_result.model_dump() if web_rep_result else None,
        "url_ml_score": url_ml_score,
        "content_risk_score": content_risk_score,
    }

    # Cache verdict
    await verdict_cache.set(norm.hostname, resp_dict, ttl_seconds=ttl)

    return CheckResponse(**resp_dict)


@app.post("/v1/report")
async def report_host(req: ReportRequest):
    """Report a suspicious or falsely flagged host for analyst review."""
    try:
        norm = normalize_host(req.host)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Invalid host format")

    report_id = str(uuid.uuid4())
    logger.info(f"Report received: ID={report_id} host={norm.hostname} reason={req.reason}")
    return {
        "status": "received",
        "report_id": report_id,
        "host": norm.hostname,
        "message": "Report queued for analyst review.",
    }


@app.post("/v1/web-reputation")
async def web_reputation_check(req: CheckRequest):
    """Surf Wikipedia, Reddit, and community web to verify if an unknown site is genuine."""
    try:
        norm = normalize_host(req.host)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid host format: {str(e)}")
    try:
        result = await asyncio.wait_for(
            analyze_web_reputation(norm.hostname, norm.registrable),
            timeout=8.0,
        )
    except asyncio.TimeoutError:
        result = {
            "host": norm.hostname,
            "registrable": norm.registrable,
            "is_genuine": False,
            "unlock": False,
            "status": "UNVERIFIED_NEW",
            "summary": "Web reputation check timed out.",
            "sources": [],
            "scam_reports": 0,
            "legit_reports": 0,
            "wiki_article": None,
            "discussion_sample": [],
        }
    return result



@app.get("/v1/url-features")
async def url_features_debug(url: str):
    """
    Debug endpoint: returns raw URL features + ML phishing prediction for any URL.

    Example: GET /v1/url-features?url=https://paypal-secure-login.tk/verify
    """
    from app.url_features import extract_url_features  # noqa: PLC0415
    features = extract_url_features(url)
    ml_prediction = predict_url_risk(url)
    return {
        "url": url,
        "features": features,
        "ml_prediction": ml_prediction,
    }


@app.get("/v1/content-analysis")
async def content_analysis(host: str):
    """
    Analyse page content for credential-harvesting / phishing signals.

    Layer 1: Rule-based HTML analysis (password fields, external form actions, cloaking)
    Layer 2: HuggingFace bart-large-mnli zero-shot classification (if HF_TOKEN set)

    Example: GET /v1/content-analysis?host=paypal-fake-login.tk
    """
    try:
        norm = normalize_host(host)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid host format")

    result = await asyncio.wait_for(
        analyze_page_content(norm.hostname),
        timeout=10.0,
    )
    return {"host": norm.hostname, **result}


@app.get("/v1/cert-transparency")
async def cert_transparency_check(host: str, brand: Optional[str] = None):
    """
    Query Certificate Transparency logs (crt.sh) for a specific host.

    Optional `brand` param: comma-separated brand tokens to detect SAN abuse.

    Example: GET /v1/cert-transparency?host=paypal-secure.tk&brand=paypal
    """
    try:
        norm = normalize_host(host)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid host format")

    brand_tokens = [b.strip() for b in brand.split(",")] if brand else None

    result = await analyze_cert_transparency(
        norm.hostname, norm.registrable, brand_tokens=brand_tokens, max_age_days=90
    )
    return {"host": norm.hostname, "registrable": norm.registrable, **result}


@app.get("/v1/ct-sweep")
async def ct_brand_sweep(brand: str, official_domains: Optional[str] = None, days: int = 30):
    """
    Analyst endpoint: sweep CT logs for certificates impersonating a brand.

    - `brand`: brand token to search (e.g. "paypal")
    - `official_domains`: comma-separated list of official domains to exclude
    - `days`: how far back to look (default 30)

    Example: GET /v1/ct-sweep?brand=paypal&official_domains=paypal.com,paypal.me&days=30
    """
    official = [d.strip() for d in official_domains.split(",")] if official_domains else []
    findings = await brand_cert_sweep(brand, official, max_results=50, max_age_days=days)
    return {
        "brand": brand,
        "days_back": days,
        "total_suspicious_certs": len(findings),
        "findings": findings,
    }


@app.get("/v1/registry/snapshot")
async def get_registry_snapshot(response: Response, if_none_match: Optional[str] = Header(None, alias="if-none-match")):
    """Return signed snapshot of allowlist for the client extension."""
    snap = registry.snapshot()
    raw = json.dumps(snap, sort_keys=True)
    etag = hashlib.sha256(raw.encode("utf-8")).hexdigest()

    response.headers["ETag"] = f'"{etag}"'
    response.headers["Cache-Control"] = "public, max-age=86400"

    if if_none_match and if_none_match.strip('"') == etag:
        response.status_code = status.HTTP_304_NOT_MODIFIED
        return response

    return snap


@app.get("/v1/brand/{brand_id}")
async def get_brand(brand_id: str):
    """Return signed brand details by ID."""
    b = registry.get(brand_id)
    if not b:
        raise HTTPException(status_code=404, detail="Brand not found in registry")
    return b.model_dump()


@app.get("/v1/health")
async def health_check():
    """Liveness check and registry status."""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "brands_loaded": len(registry.all_brands()),
    }
