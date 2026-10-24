"""
LightGBM URL phishing-risk inference wrapper.

Loads the pre-trained model from URL_MODEL_PATH (defaults to ./data/url_model.lgb)
and exposes predict_url_risk(url) for use in the FastAPI endpoints.
"""
from __future__ import annotations

import os
import logging

logger = logging.getLogger(__name__)

_model = None  # lazy singleton


def _load_model():
    """Load LightGBM model from disk (once). Returns None if unavailable."""
    global _model
    if _model is not None:
        return _model
    model_path = os.getenv("URL_MODEL_PATH", "./data/url_model.lgb")
    if not os.path.exists(model_path):
        logger.warning("URL model not found at %s — ML scoring disabled", model_path)
        return None
    try:
        import joblib  # noqa: PLC0415
        _model = joblib.load(model_path)
        logger.info("URL phishing model loaded from %s", model_path)
    except Exception as exc:
        logger.error("Failed to load URL model: %s", exc)
        return None
    return _model


def predict_url_risk(url: str) -> dict:
    """
    Predict phishing probability for a URL.

    Returns:
        {
            "available": bool,        # False if model not loaded
            "score": float,           # 0.0 (safe) → 1.0 (phishing)
            "is_phishing": bool,      # True if score > 0.7
            "features": dict,         # raw extracted features
        }
    """
    from app.url_features import extract_url_features, FEATURE_NAMES  # noqa: PLC0415

    model = _load_model()
    if model is None:
        return {"available": False, "score": 0.0, "is_phishing": False, "features": {}}

    features = extract_url_features(url)
    feature_vector = [[features[f] for f in FEATURE_NAMES]]

    try:
        proba = float(model.predict_proba(feature_vector)[0][1])
    except Exception as exc:
        logger.error("URL model prediction failed: %s", exc)
        return {"available": False, "score": 0.0, "is_phishing": False, "features": features}

    return {
        "available": True,
        "score": round(proba, 4),
        "is_phishing": proba > 0.7,
        "features": features,
    }


def reset_model() -> None:
    """Reset the singleton (useful for testing)."""
    global _model
    _model = None
