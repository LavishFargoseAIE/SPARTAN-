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
from app.risk import (
    calculate_brand_confidence,
    compute_risk_score,
    get_verdict_level,
    resolve_official_brand,
)

logging.basicConfig(level=logging.INFO if not settings.DEBUG else logging.DEBUG)
logger = logging.getLogger("siteguard")

# Global in-memory registry instance
registry: BrandRegistry = BrandRegistry()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global registry
    logger.info("Initializing SiteGuard API...")
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

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list + ["chrome-extension://*", "moz-extension://*"],
    allow_credentials=True,
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


class CheckResponse(BaseModel):
    host: str
    level: str  # SAFE, SUSPICIOUS, DANGEROUS
    score: int  # 0 to 100
    reasons: List[str]
    brand: Optional[BrandResponse] = None
    ttl: int = 3600
    analysis: str = "completed"


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
    d_score, domain_reasons = await get_domain_intel(norm)

    # Signals dict
    signals: Dict[str, Any] = {
        "L": lookalike_res.score,
        "T": t_score,
        "D": d_score,
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

    resp_dict = {
        "host": norm.hostname,
        "level": level,
        "score": score,
        "reasons": top_reasons,
        "brand": brand_resp.model_dump() if brand_resp else None,
        "ttl": ttl,
        "analysis": "completed",
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
