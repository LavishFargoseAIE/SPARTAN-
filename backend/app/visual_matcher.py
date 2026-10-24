"""
Visual brand matching and perceptual hashing engine.

Provides:
  - Perceptual image hashing (dHash, aHash)
  - 512-dimensional normalized visual feature embedding
  - FAISS index search (IndexFlatIP for exact cosine similarity) with fallback
  - Visual spoofing detection (produces signal V from 0.0 to 1.0)
"""
from __future__ import annotations

import base64
import io
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 512
DEFAULT_FAISS_PATH = os.getenv("FAISS_INDEX_PATH", "./data/brand.faiss")
DEFAULT_VECTORS_PATH = "./data/brand_vectors.npy"
DEFAULT_META_PATH = "./data/brand_faiss_meta.json"

_faiss_index = None
_vectors_matrix: Optional[np.ndarray] = None
_brand_metadata: List[Dict[str, Any]] = []


# ---------------------------------------------------------------------------
# Perceptual Image Hashing
# ---------------------------------------------------------------------------

def compute_difference_hash(image: Image.Image, hash_size: int = 8) -> str:
    """
    dHash (difference hash).
    Resizes to (hash_size + 1, hash_size), converts to grayscale,
    and compares adjacent pixels.
    """
    img = image.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = np.array(img, dtype=np.float32)
    diff = pixels[:, 1:] > pixels[:, :-1]
    bits = diff.flatten()
    # Convert bool array to hex string
    hex_str = "".join(f"{b:02x}" for b in np.packbits(bits))
    return hex_str


def compute_average_hash(image: Image.Image, hash_size: int = 8) -> str:
    """
    aHash (average hash).
    Resizes to (hash_size, hash_size), converts to grayscale,
    and compares each pixel to mean luminance.
    """
    img = image.convert("L").resize((hash_size, hash_size), Image.Resampling.LANCZOS)
    pixels = np.array(img, dtype=np.float32)
    mean_val = pixels.mean()
    bits = (pixels > mean_val).flatten()
    hex_str = "".join(f"{b:02x}" for b in np.packbits(bits))
    return hex_str


def compute_image_hashes(image: Image.Image) -> Dict[str, str]:
    """Compute standard perceptual hashes for an image."""
    return {
        "dhash": compute_difference_hash(image),
        "ahash": compute_average_hash(image),
    }


# ---------------------------------------------------------------------------
# Feature Extraction (512-dim Normalized Vector)
# ---------------------------------------------------------------------------

def extract_visual_embedding(image: Image.Image) -> np.ndarray:
    """
    Extract a deterministic, normalized 512-dimensional visual embedding
    combining multi-channel spatial color distributions, luminance gradients,
    and structural blocks.
    
    Dot product between two normalized embeddings = Cosine Similarity.
    """
    img = image.convert("RGB").resize((64, 64), Image.Resampling.BILINEAR)
    arr = np.array(img, dtype=np.float32) / 255.0  # 64x64x3

    # 1. 3D Color Histogram: 6x6x6 = 216 bins
    hist, _ = np.histogramdd(
        arr.reshape(-1, 3),
        bins=(6, 6, 6),
        range=((0, 1), (0, 1), (0, 1)),
    )
    hist_feats = hist.flatten()  # 216 features

    # 2. Multi-region spatial color moments (4x4 spatial grid = 16 blocks x 9 moments = 144 features)
    blocks = []
    for r in range(4):
        for c in range(4):
            block = arr[r * 16 : (r + 1) * 16, c * 16 : (c + 1) * 16, :]
            # Mean and std dev for R, G, B
            means = block.mean(axis=(0, 1))
            stds = block.std(axis=(0, 1))
            diffs = block.max(axis=(0, 1)) - block.min(axis=(0, 1))
            blocks.extend([*means, *stds, *diffs])
    block_feats = np.array(blocks, dtype=np.float32)  # 144 features

    # 3. Luminance gradient and edge energy (64x64 grayscale gradient projection)
    gray = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    gx = np.diff(gray, axis=1)  # 64x63
    gy = np.diff(gray, axis=0)  # 63x64

    # 8-direction gradient orientation histogram + energy = 152 features
    grad_x = np.pad(gx, ((0, 0), (0, 1)))
    grad_y = np.pad(gy, ((0, 1), (0, 0)))
    mag = np.sqrt(grad_x**2 + grad_y**2)

    # 8x8 block average gradient energy = 64 features
    grad_blocks = [
        mag[r * 8 : (r + 1) * 8, c * 8 : (c + 1) * 8].mean()
        for r in range(8)
        for c in range(8)
    ]

    # Row and column profile projections = 64 + 24 = 88 features
    row_proj = gray.mean(axis=1)  # 64
    col_proj = gray.mean(axis=0)[:24]  # 24

    edge_feats = np.array(grad_blocks + list(row_proj) + list(col_proj), dtype=np.float32)  # 152 features

    # Concatenate: 216 + 144 + 152 = 512 dimensions
    combined = np.concatenate([hist_feats, block_feats, edge_feats]).astype(np.float32)

    # L2 Normalization
    norm = np.linalg.norm(combined)
    if norm > 0:
        combined = combined / norm

    return combined


# ---------------------------------------------------------------------------
# Synthetic Brand Visual Signature Generator
# ---------------------------------------------------------------------------

def generate_brand_synthetic_signature(brand: Dict[str, Any]) -> np.ndarray:
    """
    Generate a brand-specific visual signature vector based on category color palettes,
    brand token seeds, and typography characteristics.
    """
    from PIL import ImageDraw

    category = brand.get("category", "other")
    display_name = brand.get("display_name", "")
    brand_id = brand.get("brand_id", "")

    # Category primary background / accent colors
    palette_map = {
        "bank": [(16, 52, 166), (255, 255, 255), (220, 38, 38)],       # Royal Blue & Red
        "government": [(15, 76, 129), (245, 130, 32), (19, 136, 8)],     # Tricolor / Navy
        "telecom": [(225, 29, 72), (255, 255, 255), (14, 165, 233)],     # Telecom Red/Cyan
        "ecommerce": [(245, 158, 11), (30, 41, 59), (255, 255, 255)],    # Orange / Dark
        "other": [(79, 70, 229), (255, 255, 255), (16, 185, 129)],
    }
    primary_color, secondary_color, accent_color = palette_map.get(
        category, palette_map["other"]
    )

    # Use brand_id hash to generate subtle variations
    seed = sum(ord(c) for c in brand_id)
    r_offset = (seed % 31) - 15
    g_offset = ((seed * 7) % 31) - 15
    b_offset = ((seed * 13) % 31) - 15

    bg_color = (
        max(0, min(255, primary_color[0] + r_offset)),
        max(0, min(255, primary_color[1] + g_offset)),
        max(0, min(255, primary_color[2] + b_offset)),
    )

    img = Image.new("RGB", (128, 128), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Draw logo icon shape
    draw.rectangle([24, 24, 104, 104], fill=secondary_color, outline=accent_color, width=3)
    draw.ellipse([40, 40, 88, 88], fill=accent_color)

    # Extract embedding
    return extract_visual_embedding(img)


# ---------------------------------------------------------------------------
# FAISS Index Manager
# ---------------------------------------------------------------------------

def load_visual_index(
    index_path: str = DEFAULT_FAISS_PATH,
    meta_path: str = DEFAULT_META_PATH,
    vectors_path: str = DEFAULT_VECTORS_PATH,
) -> Tuple[Optional[np.ndarray], List[Dict[str, Any]]]:
    """Load or initialize visual index matrix and brand metadata."""
    global _vectors_matrix, _brand_metadata
    if _vectors_matrix is not None and _brand_metadata:
        return _vectors_matrix, _brand_metadata

    vec_file = Path(vectors_path)
    meta_file = Path(meta_path)
    idx_file = Path(index_path)

    if meta_file.exists():
        try:
            with open(meta_file, "r", encoding="utf-8") as f:
                _brand_metadata = json.load(f)
        except Exception as e:
            logger.warning("Failed to load metadata from %s: %s", meta_path, e)

    # 1. Preferred: High-performance numpy vectors matrix
    if vec_file.exists() and _brand_metadata:
        try:
            _vectors_matrix = np.load(str(vec_file))
            logger.info("Loaded visual brand matrix (%d vectors)", len(_vectors_matrix))
            return _vectors_matrix, _brand_metadata
        except Exception as e:
            logger.debug("Numpy vectors load failed: %s", e)

    # 2. Fallback: FAISS index file
    if idx_file.exists() and _brand_metadata:
        try:
            import faiss
            idx = faiss.read_index(str(idx_file))
            # Extract raw vectors from faiss index
            _vectors_matrix = faiss.rev_swig_ptr(idx.get_xb(), idx.ntotal * EMBEDDING_DIM).reshape(idx.ntotal, EMBEDDING_DIM).copy()
            return _vectors_matrix, _brand_metadata
        except Exception as e:
            logger.warning("Failed to read FAISS index from %s: %s", index_path, e)

    return None, []


def reset_visual_index() -> None:
    """Reset singleton instance (useful for testing)."""
    global _vectors_matrix, _brand_metadata
    _vectors_matrix = None
    _brand_metadata = []


# ---------------------------------------------------------------------------
# Visual Matching & Risk Evaluation
# ---------------------------------------------------------------------------

def decode_image_input(image_input: str | bytes) -> Optional[Image.Image]:
    """Accept raw bytes, file path, or base64 data URI and return PIL Image."""
    try:
        if isinstance(image_input, bytes):
            return Image.open(io.BytesIO(image_input))
        if isinstance(image_input, str):
            if image_input.startswith("data:image"):
                # Data URI: data:image/png;base64,....
                b64 = image_input.split(",", 1)[1]
                data = base64.b64decode(b64)
                return Image.open(io.BytesIO(data))
            elif os.path.exists(image_input):
                return Image.open(image_input)
            else:
                # Raw base64 string
                data = base64.b64decode(image_input)
                return Image.open(io.BytesIO(data))
    except Exception as exc:
        logger.debug("Image decoding failed: %s", exc)
    return None


def match_visual_brand(
    image_input: str | bytes | Image.Image,
    top_k: int = 3,
    index_path: str = DEFAULT_FAISS_PATH,
    meta_path: str = DEFAULT_META_PATH,
) -> List[Dict[str, Any]]:
    """
    Search nearest brand profiles for an image query.
    Returns list of matches ordered by descending cosine similarity (0.0 to 1.0).
    """
    if isinstance(image_input, Image.Image):
        img = image_input
    else:
        img = decode_image_input(image_input)

    if img is None:
        return []

    query_vec = extract_visual_embedding(img)

    vectors, metadata = load_visual_index(index_path, meta_path)
    if vectors is None or not metadata:
        return []

    # Exact Cosine Similarity via Inner Product of L2-normalized vectors
    sims = np.dot(vectors, query_vec)
    k = min(top_k, len(metadata))
    top_indices = np.argsort(sims)[-k:][::-1]

    results = []
    for idx in top_indices:
        if idx < 0 or idx >= len(metadata):
            continue
        brand = metadata[idx]
        sim = float(sims[idx])
        results.append({
            "brand_id": brand["brand_id"],
            "display_name": brand["display_name"],
            "category": brand.get("category", "other"),
            "official_domains": brand.get("official_domains", []),
            "canonical_url": brand.get("canonical_url", ""),
            "similarity": round(max(0.0, min(1.0, sim)), 4),
        })

    return results


def evaluate_visual_risk(
    image_input: str | bytes | Image.Image,
    current_hostname: str,
    threshold: float = 0.70,
) -> Dict[str, Any]:
    """
    Evaluate visual spoofing risk signal V for a given page screenshot/logo.
    
    Returns:
        {
            "v_score": float (0.0 to 1.0),
            "matched_brand": dict | None,
            "is_impersonating": bool,
            "reasons": list[str],
            "hashes": dict,
        }
    """
    if isinstance(image_input, Image.Image):
        img = image_input
    else:
        img = decode_image_input(image_input)

    if img is None:
        return {
            "v_score": 0.0,
            "matched_brand": None,
            "is_impersonating": False,
            "reasons": [],
            "hashes": {},
        }

    hashes = compute_image_hashes(img)
    matches = match_visual_brand(img, top_k=1)

    if not matches:
        return {
            "v_score": 0.0,
            "matched_brand": None,
            "is_impersonating": False,
            "reasons": [],
            "hashes": hashes,
        }

    top_match = matches[0]
    sim = top_match["similarity"]
    brand_name = top_match["display_name"]
    official_domains = [d.lower() for d in top_match.get("official_domains", [])]
    host_lower = current_hostname.lower()

    # Check if current hostname is an official domain of the matched brand
    is_legit_domain = any(host_lower == d or host_lower.endswith("." + d) for d in official_domains)

    if sim >= threshold and not is_legit_domain:
        # Visual brand impersonation detected!
        v_score = sim
        reasons = [
            f"visual_brand_spoofing: {brand_name} (similarity: {sim:.0%})",
        ]
        return {
            "v_score": round(v_score, 2),
            "matched_brand": top_match,
            "is_impersonating": True,
            "reasons": reasons,
            "hashes": hashes,
        }

    return {
        "v_score": 0.0,
        "matched_brand": top_match if sim >= 0.50 else None,
        "is_impersonating": False,
        "reasons": [],
        "hashes": hashes,
    }
