"""
FastAPI application for SiteGuard backend.
Implements /v1/check, /v1/report, /v1/registry/snapshot, /v1/brand/{id}, and /v1/health.
"""

from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.cache import VerdictCache
from app.config import settings
from app.domain_intel import DomainIntelManager
from app.feeds import ThreatFeedManager
from app.lookalike import evaluate_lookalike
from app.normalize import normalize_host
from app.reasons import format_reasons
from app.registry import BrandRegistry
from app.risk import (
    REDIRECT_MIN_CONFIDENCE,
    calculate_brand_confidence,
    compute_risk,
    get_risk_level,
    is_redirect_allowed,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("siteguard")

# Paths and initializations
root_dir = Path(__file__).resolve().parent.parent.parent
brands_path = root_dir / "registry" / "brands.json"

registry = BrandRegistry(brands_file=brands_path, public_key_b64=settings.REGISTRY_SIGNING_PUBLIC_KEY)
cache = VerdictCache(redis_url=settings.REDIS_URL)
feeds = ThreatFeedManager(
    local_badlist_path=str(root_dir / settings.LOCAL_BADLIST_PATH),
    google_safe_browsing_key=settings.GOOGLE_SAFE_BROWSING_API_KEY,
    openphish_feed_url=settings.OPENPHISH_FEED_URL,
)
domain_intel = DomainIntelManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing SiteGuard API...")
    registry.load()
    logger.info("Loaded %d brands from registry", len(registry.brands))
    feeds.load_local_badlist()
    yield
    logger.info("Shutting down SiteGuard API...")


app = FastAPI(
    title="SiteGuard Detection API",
    description="Stateless fake website and bank impersonation detection API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class CheckRequest(BaseModel):
    host: str
    client: Optional[str] = "browser-extension"
    lang: Optional[str] = "en"


class BrandInfo(BaseModel):
    name: str
    confidence: float
    official_url: Optional[str] = None
    signature: Optional[str] = None
    verified: bool = False


class CheckResponse(BaseModel):
    host: str
    level: str  # SAFE, SUSPICIOUS, DANGEROUS
    score: int
    reasons: List[str] = Field(default_factory=list)
    reason_details: List[Dict[str, str]] = Field(default_factory=list)
    brand: Optional[BrandInfo] = None
    differing_part: Optional[str] = None
    ttl: int = 3600
    analysis: str = "evaluated"


class ReportRequest(BaseModel):
    host: str
    comments: Optional[str] = None
    reporter_id: Optional[str] = None


@app.post("/v1/check", response_model=CheckResponse)
async def check_host(req: CheckRequest):
    """
    Check a host for brand spoofing, lookalike attacks, and threat feeds.
    Order of operations:
      1. Normalize host (IDNA, PSL, strip paths/queries)
      2. Registry allowlist (0 ms)
      3. Cache check
      4. Lookalike engine
      5. Threat feeds
      6. Domain intelligence
      7. Risk scoring & brand confidence
    """
    if not req.host or not req.host.strip():
        raise HTTPException(status_code=400, detail="Missing host parameter")

    norm = normalize_host(req.host)
    h = norm.host
    lang = req.lang or "en"

    # 1. Registry Allowlist Check:
    # If genuine registrable domain or exact official domain matches
    matched_brand = registry.find_by_domain(h)
    if matched_brand:
        # Check shared hosting risk (e.g. netlify.com, github.io)
        if matched_brand.get("shared_hosting_risk", False):
            # Only exact apex domain is trusted; arbitrary subdomains continue through lookalike check
            if h == norm.registrable_domain:
                return CheckResponse(
                    host=h,
                    level="SAFE",
                    score=0,
                    reasons=[],
                    reason_details=[],
                    brand=BrandInfo(
                        name=matched_brand["display_name"],
                        confidence=1.0,
                        official_url=matched_brand.get("canonical_url"),
                        signature=matched_brand.get("signature"),
                        verified=matched_brand.get("verified", False),
                    ),
                    ttl=86400,
                    analysis="allowlist",
                )
        else:
            return CheckResponse(
                host=h,
                level="SAFE",
                score=0,
                reasons=[],
                reason_details=[],
                brand=BrandInfo(
                    name=matched_brand["display_name"],
                    confidence=1.0,
                    official_url=matched_brand.get("canonical_url"),
                    signature=matched_brand.get("signature"),
                    verified=matched_brand.get("verified", False),
                ),
                ttl=86400,
                analysis="allowlist",
            )

    # 2. Cache Check
    cache_key = f"verdict:{h}"
    cached = cache.get(cache_key)
    if cached:
        # Re-localize reason details if requested language differs
        cached["reason_details"] = format_reasons(cached.get("reasons", []), lang=lang)
        return CheckResponse(**cached)

    # 3. Lookalike Engine
    lookalike_res = evaluate_lookalike(norm, registry.brands)

    # 4. Threat Feeds Check
    t_score, t_reasons = await feeds.check(h)

    # 5. Domain Intelligence Check
    d_signals, d_reasons = await domain_intel.get_signals(h, norm.registrable_domain)

    # Signal compilation
    signals: Dict[str, float] = {}
    if lookalike_res.score > 0:
        signals["L"] = lookalike_res.score
    if t_score > 0:
        signals["T"] = t_score
    if d_signals:
        signals.update(d_signals)

    target_category = lookalike_res.brand.get("category") if lookalike_res.brand else None
    score = compute_risk(signals, category=target_category)
    level = get_risk_level(score)

    all_reasons = list(set(lookalike_res.reasons + t_reasons + d_reasons))

    # Brand confidence & redirect validation
    brand_info = None
    if lookalike_res.brand:
        conf = calculate_brand_confidence(lookalike_res.score)
        if conf >= 0.50:
            target_brand = lookalike_res.brand
            is_verified = target_brand.get("verified", False)
            allow_redirect = is_redirect_allowed(target_brand, conf)

            # Rule: If unverified or confidence < 0.80, official_url is NOT provided for one-tap redirect
            official_url = target_brand.get("canonical_url") if allow_redirect else None

            brand_info = BrandInfo(
                name=target_brand["display_name"],
                confidence=conf,
                official_url=official_url,
                signature=target_brand.get("signature") if allow_redirect else None,
                verified=is_verified,
            )

    # Decide TTL based on risk
    ttl = 7200 if level == "SAFE" else 3600

    resp_dict = {
        "host": h,
        "level": level,
        "score": score,
        "reasons": all_reasons,
        "reason_details": format_reasons(all_reasons, lang=lang),
        "brand": brand_info.model_dump() if brand_info else None,
        "differing_part": lookalike_res.differing_part,
        "ttl": ttl,
        "analysis": "evaluated",
    }

    # Store in cache
    cache.set(cache_key, resp_dict, ttl_seconds=ttl)

    return CheckResponse(**resp_dict)


@app.post("/v1/report")
async def report_host(req: ReportRequest):
    """
    Accept user/client reports of suspicious hosts.
    Never logs paths or queries.
    """
    norm = normalize_host(req.host)
    logger.info("Report received for suspicious host: %s (reporter: %s)", norm.host, req.reporter_id)
    return {"status": "received", "host": norm.host}


@app.get("/v1/registry/snapshot")
async def get_registry_snapshot(if_none_match: Optional[str] = Header(None)):
    """
    Return signed snapshot of the entire brand registry with ETag support.
    """
    snap = registry.get_snapshot()
    if if_none_match and if_none_match.strip('"') == snap["etag"]:
        return Response(status_code=status.HTTP_304_NOT_MODIFIED)

    return Response(
        content=registry.brands_file.read_text(encoding="utf-8") if registry.brands_file else "[]",
        media_type="application/json",
        headers={"ETag": f'"{snap["etag"]}"', "Cache-Control": "public, max-age=3600"},
    )


@app.get("/v1/brand/{brand_id}")
async def get_brand(brand_id: str):
    """
    Return single signed brand entry.
    """
    b = registry.get_brand(brand_id)
    if not b:
        raise HTTPException(status_code=404, detail="Brand not found")
    return b


@app.get("/v1/health")
async def health_check():
    """
    Health check endpoint.
    """
    return {
        "status": "healthy",
        "brands_loaded": len(registry.brands),
        "cache": "redis" if cache.redis_client else "memory",
        "threat_feed_badlist_count": len(feeds.local_bad_hosts),
    }
