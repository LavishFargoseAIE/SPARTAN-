#!/usr/bin/env python3
"""
Build the FAISS visual index from all registered brands.

Reads:
  - registry/brands.json (625 brands)
Writes:
  - data/brand.faiss (FAISS IndexFlatIP 512-dim)
  - data/brand_faiss_meta.json (Brand metadata mapping)
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

# Allow importing backend/app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import faiss
import numpy as np

from app.visual_matcher import (
    EMBEDDING_DIM,
    generate_brand_synthetic_signature,
)


def main():
    root_dir = Path(__file__).resolve().parent.parent
    brands_path = root_dir / "registry" / "brands.json"
    data_dir = root_dir / "data"
    data_dir.mkdir(exist_ok=True)

    faiss_path = data_dir / "brand.faiss"
    vectors_path = data_dir / "brand_vectors.npy"
    meta_path = data_dir / "brand_faiss_meta.json"

    print(f"[Visual Index] Loading brands from {brands_path} ...")
    with open(brands_path, "r", encoding="utf-8") as f:
        brands = json.load(f)

    print(f"[Visual Index] Generating 512-dim embeddings for {len(brands)} brands ...")
    embeddings = []
    metadata = []

    for brand in brands:
        vec = generate_brand_synthetic_signature(brand)
        embeddings.append(vec)
        metadata.append({
            "brand_id": brand["brand_id"],
            "display_name": brand["display_name"],
            "category": brand.get("category", "other"),
            "official_domains": brand.get("official_domains", []),
            "canonical_url": brand.get("canonical_url", ""),
            "tokens": brand.get("tokens", []),
        })

    vectors = np.array(embeddings, dtype=np.float32)

    # Normalize vectors
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    vectors = vectors / norms

    print(f"[Visual Index] Building FAISS IndexFlatIP (dim={EMBEDDING_DIM}) ...")
    index = faiss.IndexFlatIP(EMBEDDING_DIM)
    index.add(vectors)

    print(f"[Visual Index] Saving FAISS index to {faiss_path} ...")
    faiss.write_index(index, str(faiss_path))

    print(f"[Visual Index] Saving vectors array to {vectors_path} ...")
    np.save(str(vectors_path), vectors)

    print(f"[Visual Index] Saving metadata to {meta_path} ...")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[Visual Index] Successfully indexed {index.ntotal} brands into {faiss_path.name}!")


if __name__ == "__main__":
    main()
