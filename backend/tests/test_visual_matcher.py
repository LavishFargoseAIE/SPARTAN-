"""
Tests for Visual Matcher, FAISS vector search, and perceptual hashing (visual_matcher.py).
"""
from __future__ import annotations

import base64
import io
import numpy as np
from PIL import Image
import pytest
import httpx

from app.visual_matcher import (
    EMBEDDING_DIM,
    compute_average_hash,
    compute_difference_hash,
    compute_image_hashes,
    decode_image_input,
    evaluate_visual_risk,
    extract_visual_embedding,
    generate_brand_synthetic_signature,
    match_visual_brand,
)
from app.main import app


# ---------------------------------------------------------------------------
# Helper image generators
# ---------------------------------------------------------------------------

def _create_sample_image(color=(255, 0, 0), size=(64, 64)) -> Image.Image:
    return Image.new("RGB", size, color=color)


def _image_to_base64_data_url(img: Image.Image) -> str:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64 = base64.b64encode(buf.getvalue()).decode("ascii")
    return f"data:image/png;base64,{b64}"


# ---------------------------------------------------------------------------
# Unit tests
# ---------------------------------------------------------------------------

def test_perceptual_hashes():
    img1 = _create_sample_image((16, 52, 166))
    img2 = _create_sample_image((16, 52, 166))
    img3 = _create_sample_image((245, 130, 32))

    h1 = compute_image_hashes(img1)
    h2 = compute_image_hashes(img2)
    h3 = compute_image_hashes(img3)

    assert "dhash" in h1 and "ahash" in h1
    assert len(h1["dhash"]) == 16  # 64 bits = 16 hex chars
    assert len(h1["ahash"]) == 16
    # Identical images must produce identical hashes
    assert h1["dhash"] == h2["dhash"]
    assert h1["ahash"] == h2["ahash"]


def test_visual_embedding_dimensions_and_norm():
    img = _create_sample_image((100, 150, 200), size=(128, 128))
    vec = extract_visual_embedding(img)

    assert isinstance(vec, np.ndarray)
    assert vec.shape == (EMBEDDING_DIM,)
    assert abs(np.linalg.norm(vec) - 1.0) < 1e-4, "Embedding must be L2 normalized"


def test_decode_image_formats():
    img = _create_sample_image((50, 100, 150))
    # Test bytes
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw_bytes = buf.getvalue()
    decoded_bytes = decode_image_input(raw_bytes)
    assert decoded_bytes is not None

    # Test base64 data URI
    data_uri = _image_to_base64_data_url(img)
    decoded_uri = decode_image_input(data_uri)
    assert decoded_uri is not None

    # Test raw base64 string
    raw_b64 = base64.b64encode(raw_bytes).decode("ascii")
    decoded_raw = decode_image_input(raw_b64)
    assert decoded_raw is not None


def test_synthetic_brand_signature_generation():
    fake_brand = {
        "brand_id": "test-bank",
        "display_name": "Test Bank of India",
        "category": "bank",
    }
    vec = generate_brand_synthetic_signature(fake_brand)
    assert vec.shape == (EMBEDDING_DIM,)
    assert abs(np.linalg.norm(vec) - 1.0) < 1e-4


def test_faiss_visual_matching():
    # Load index and query with a synthetic bank image
    fake_brand = {
        "brand_id": "state-bank-of-india",
        "display_name": "State Bank of India",
        "category": "bank",
    }
    # Query with the exact signature of State Bank of India
    from PIL import ImageDraw
    img = Image.new("RGB", (128, 128), color=(16, 52, 166))
    draw = ImageDraw.Draw(img)
    draw.rectangle([24, 24, 104, 104], fill=(255, 255, 255), outline=(220, 38, 38), width=3)
    draw.ellipse([40, 40, 88, 88], fill=(220, 38, 38))

    matches = match_visual_brand(img, top_k=3)
    assert len(matches) > 0
    top = matches[0]
    assert "brand_id" in top
    assert "display_name" in top
    assert 0.0 <= top["similarity"] <= 1.0


def test_evaluate_visual_risk_spoofing_detected():
    # Query matching a brand but inspected from an attacker domain
    fake_match = [{
        "brand_id": "state-bank-of-india",
        "display_name": "State Bank of India",
        "category": "bank",
        "official_domains": ["sbi.co.in", "onlinesbi.sbi"],
        "canonical_url": "https://sbi.co.in/",
        "similarity": 0.88,
    }]
    img = _create_sample_image()

    from unittest.mock import patch
    with patch("app.visual_matcher.match_visual_brand", return_value=fake_match):
        eval_result = evaluate_visual_risk(img, "evil-sbi-login.xyz", threshold=0.70)

    assert eval_result["is_impersonating"] is True
    assert eval_result["v_score"] == 0.88
    assert any("visual_brand_spoofing" in r for r in eval_result["reasons"])


def test_evaluate_visual_risk_legit_domain_safe():
    fake_match = [{
        "brand_id": "state-bank-of-india",
        "display_name": "State Bank of India",
        "category": "bank",
        "official_domains": ["sbi.co.in", "onlinesbi.sbi"],
        "canonical_url": "https://sbi.co.in/",
        "similarity": 0.95,
    }]
    img = _create_sample_image()

    from unittest.mock import patch
    with patch("app.visual_matcher.match_visual_brand", return_value=fake_match):
        # When domain is official domain (e.g. sub.sbi.co.in), visual risk V must be 0.0
        eval_result = evaluate_visual_risk(img, "retail.onlinesbi.sbi", threshold=0.70)

    assert eval_result["is_impersonating"] is False
    assert eval_result["v_score"] == 0.0


# ---------------------------------------------------------------------------
# API Integration tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_api_visual_match_endpoint():
    img = _create_sample_image((16, 52, 166))
    data_url = _image_to_base64_data_url(img)

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/v1/visual-match", json={
            "image": data_url,
            "host": "fake-bank-login.xyz",
            "top_k": 2,
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert "matches" in data
    assert "hashes" in data
    assert len(data["matches"]) <= 2


@pytest.mark.asyncio
async def test_api_check_with_screenshot_evaluates_v():
    img = _create_sample_image()
    data_url = _image_to_base64_data_url(img)

    fake_eval = {
        "v_score": 0.85,
        "matched_brand": {"display_name": "State Bank of India"},
        "is_impersonating": True,
        "reasons": ["visual_brand_spoofing: State Bank of India (similarity: 85%)"],
        "hashes": {},
    }

    from unittest.mock import patch
    transport = httpx.ASGITransport(app=app)
    with patch("app.main.evaluate_visual_risk", return_value=fake_eval):
        async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/v1/check", json={
                "host": "fake-sbi-portal.xyz",
                "screenshot": data_url,
            })

    assert resp.status_code == 200
    data = resp.json()
    assert data["visual_score"] == 0.85
