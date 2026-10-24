#!/usr/bin/env python3
"""
Train a LightGBM binary classifier for URL phishing detection.

Generates a synthetic balanced dataset (phishing vs. legit URLs),
extracts URL features, trains the model, evaluates it, and saves
the artefacts to data/.

Usage:
    python scripts/train_url_model.py
"""
from __future__ import annotations

import json
import os
import random
import sys

# Allow importing from backend/app
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, accuracy_score
import lightgbm as lgb
import joblib

from app.url_features import extract_url_features, FEATURE_NAMES

random.seed(42)
np.random.seed(42)

# ---------------------------------------------------------------------------
# Synthetic dataset generation
# ---------------------------------------------------------------------------

_LEGIT_DOMAINS = [
    "google.com", "amazon.com", "facebook.com", "github.com", "youtube.com",
    "twitter.com", "instagram.com", "linkedin.com", "microsoft.com", "apple.com",
    "netflix.com", "reddit.com", "wikipedia.org", "stackoverflow.com", "medium.com",
    "nytimes.com", "bbc.com", "cnn.com", "bloomberg.com", "reuters.com",
    "dropbox.com", "notion.so", "slack.com", "zoom.us", "shopify.com",
    "stripe.com", "paypal.com", "ebay.com", "walmart.com", "target.com",
    "coursera.org", "udemy.com", "khanacademy.org", "edx.org", "mit.edu",
    "harvard.edu", "stanford.edu", "berkeley.edu", "nasa.gov", "nih.gov",
    "python.org", "nodejs.org", "reactjs.org", "vuejs.org", "angular.io",
    "docker.com", "kubernetes.io", "aws.amazon.com", "cloud.google.com",
    "azure.microsoft.com", "digitalocean.com", "heroku.com", "netlify.com",
]

_LEGIT_PATHS = [
    "/", "/about", "/contact", "/blog", "/products", "/services",
    "/login", "/signup", "/docs", "/api", "/help", "/support",
    "/privacy", "/terms", "/faq", "/news", "/search?q=python",
    "/user/profile", "/dashboard", "/settings",
]

_PHISH_TEMPLATES = [
    # IP-based
    "http://192.168.{a}.{b}/login/verify?token={tok}",
    "http://10.{a}.{b}.{c}/account/secure/login",
    "http://172.16.{a}.{b}/paypal/signin?redirect=/account",
    # Typosquatting with hyphens
    "http://{brand}-secure-{rand}.{tld}/login/account/verify",
    "http://secure-{brand}-verify.{tld}/signin?user={rand}",
    "http://{brand}-{rand}-update.{tld}/credential/confirm",
    # Long subdomain abuse
    "http://www.login.secure.{brand}.{tld}/account/verify?session={tok}",
    "http://account.secure.{brand}.verify.{tld}/signin",
    # Suspicious keywords in path
    "https://{rand}.{tld}/login/signin/paypal/verify/account?token={tok}",
    "https://{rand}.xyz/secure/bank/login/credential?id={tok}",
    # Hex encoding abuse
    "http://{rand}.{tld}/login%20verify%20secure?user={tok}",
    # @-sign tricks
    "http://legit.com@{rand}.{tld}/account/verify",
    # Long, high-entropy
    "http://{entropy_domain}.{tld}/a/b/c/d/e/f/g?x={tok}&y={tok2}&z=1",
]

_PHISH_BRANDS = ["paypal", "amazon", "apple", "google", "microsoft", "ebay", "bank", "netflix"]
_PHISH_TLDS = ["tk", "ml", "ga", "cf", "gq", "xyz", "top", "icu", "buzz", "pw"]
_LEGIT_TLDS = ["com", "org", "net", "io", "co"]


def _rand_str(n: int = 8) -> str:
    return "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=n))


def _rand_token(n: int = 32) -> str:
    return "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789ABCDEF", k=n))


def generate_legit_urls(n: int) -> list[str]:
    urls = []
    schemes = ["https"] * 9 + ["http"]  # mostly https
    for _ in range(n):
        scheme = random.choice(schemes)
        domain = random.choice(_LEGIT_DOMAINS)
        path = random.choice(_LEGIT_PATHS)
        urls.append(f"{scheme}://{domain}{path}")
    return urls


def generate_phish_urls(n: int) -> list[str]:
    urls = []
    for _ in range(n):
        template = random.choice(_PHISH_TEMPLATES)
        a, b, c = random.randint(0, 255), random.randint(0, 255), random.randint(0, 255)
        tok = _rand_token(random.randint(16, 48))
        tok2 = _rand_token(16)
        rand = _rand_str(random.randint(6, 12))
        brand = random.choice(_PHISH_BRANDS)
        tld = random.choice(_PHISH_TLDS)
        # High-entropy domain (random chars)
        entropy_domain = "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789-", k=random.randint(12, 20)))
        url = template.format(
            a=a, b=b, c=c,
            tok=tok, tok2=tok2,
            rand=rand, brand=brand,
            tld=tld,
            entropy_domain=entropy_domain,
        )
        urls.append(url)
    return urls


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    n_each = 5000
    print(f"Generating {n_each} legit + {n_each} phishing URLs …")
    legit_urls = generate_legit_urls(n_each)
    phish_urls = generate_phish_urls(n_each)

    all_urls = legit_urls + phish_urls
    labels = [0] * n_each + [1] * n_each

    print("Extracting features …")
    rows = [extract_url_features(u) for u in all_urls]
    df = pd.DataFrame(rows, columns=FEATURE_NAMES)
    y = np.array(labels)

    X_train, X_test, y_train, y_test = train_test_split(
        df[FEATURE_NAMES].values, y, test_size=0.2, random_state=42, stratify=y
    )

    print("Training LightGBM …")
    clf = lgb.LGBMClassifier(
        n_estimators=200,
        learning_rate=0.05,
        max_depth=6,
        num_leaves=31,
        min_child_samples=20,
        class_weight="balanced",
        random_state=42,
        verbose=-1,
    )
    clf.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        callbacks=[lgb.early_stopping(20, verbose=False), lgb.log_evaluation(period=-1)],
    )

    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)[:, 1]
    acc = accuracy_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_proba)
    print(f"Accuracy: {acc:.4f}   AUC: {auc:.4f}")

    # Save model
    out_dir = os.path.join(os.path.dirname(__file__), "..", "data")
    os.makedirs(out_dir, exist_ok=True)
    model_path = os.path.join(out_dir, "url_model.lgb")
    joblib.dump(clf, model_path)
    print(f"Model saved → {model_path}")

    # Save feature importance
    importance = dict(zip(FEATURE_NAMES, clf.feature_importances_.tolist()))
    importance_path = os.path.join(out_dir, "url_model_features.json")
    with open(importance_path, "w") as f:
        json.dump({"feature_importance": importance, "accuracy": acc, "auc": auc}, f, indent=2)
    print(f"Feature importance saved → {importance_path}")


if __name__ == "__main__":
    main()
