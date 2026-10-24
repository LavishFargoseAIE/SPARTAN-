"""
Threat feed lookups: local badlist, Google Safe Browsing, OpenPhish, and PhishTank stub.
"""

from __future__ import annotations
import csv
import logging
import os
import time
from pathlib import Path
from typing import List, Optional, Set, Tuple

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class ThreatFeedManager:
    def __init__(self, badlist_path: Optional[str] = None):
        self.badlist_path = badlist_path or settings.LOCAL_BADLIST_PATH
        self._local_badlist: Set[str] = set()
        self._openphish_badlist: Set[str] = set()
        self._last_openphish_refresh: float = 0
        self.load_local_badlist()

    def load_local_badlist(self) -> None:
        """Load known fake hosts from CSV."""
        path = Path(self.badlist_path)
        if not path.is_absolute():
            # Try relative to repo root or backend dir
            cwd = Path.cwd()
            candidate = cwd / path
            if not candidate.exists() and cwd.name == "backend":
                candidate = cwd.parent / path
            path = candidate

        if path.exists():
            try:
                with path.open("r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        host = row.get("host", "").strip().lower()
                        if host:
                            self._local_badlist.add(host)
                logger.info(f"Loaded {len(self._local_badlist)} hosts from local badlist {path}")
            except Exception as e:
                logger.error(f"Error reading local badlist {path}: {e}")
        else:
            logger.warning(f"Local badlist file not found at {path}")

    async def refresh_openphish_if_needed(self) -> None:
        """Fetch openphish community feed if URL is configured and cache expired (12h)."""
        feed_url = settings.OPENPHISH_FEED_URL
        if not feed_url or feed_url == "<<FILL_ME>>":
            return

        now = time.time()
        # Refresh every 12 hours (43200s)
        if now - self._last_openphish_refresh < 43200 and self._openphish_badlist:
            return

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(feed_url)
                if resp.status_code == 200:
                    lines = resp.text.splitlines()
                    hosts = set()
                    for line in lines:
                        line = line.strip()
                        if line and not line.startswith("#"):
                            try:
                                from urllib.parse import urlparse
                                u = urlparse(line if "://" in line else f"http://{line}")
                                if u.hostname:
                                    hosts.add(u.hostname.lower())
                            except Exception:
                                pass
                    self._openphish_badlist = hosts
                    self._last_openphish_refresh = now
                    logger.info(f"Refreshed OpenPhish feed: {len(self._openphish_badlist)} hosts")
        except Exception as e:
            logger.warning(f"OpenPhish feed refresh failed: {e}")

    async def check_google_safe_browsing(self, host: str) -> bool:
        """Check Google Safe Browsing API v4 if API key is present."""
        key = settings.GOOGLE_SAFE_BROWSING_API_KEY
        if not key or key == "<<FILL_ME>>":
            return False

        url = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={key}"
        payload = {
            "client": {"clientId": "siteguard", "clientVersion": "0.1.0"},
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": f"http://{host}/"}, {"url": f"https://{host}/"}],
            },
        }
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    matches = res.json().get("matches", [])
                    return len(matches) > 0
        except Exception as e:
            logger.warning(f"Google Safe Browsing check error: {e}")
        return False

    async def check(self, host: str, registrable: str) -> Tuple[float, List[str]]:
        """
        Check host and registrable domain across all threat feeds.
        Returns (T_score, reasons). T_score is 1.0 on match, 0.0 otherwise.
        """
        host_clean = host.lower()
        reg_clean = registrable.lower()

        # 1. Local badlist check (fastest)
        if host_clean in self._local_badlist or reg_clean in self._local_badlist:
            return 1.0, ["threat_feed_match", "listed_in_badlist"]

        # 2. OpenPhish check
        if host_clean in self._openphish_badlist or reg_clean in self._openphish_badlist:
            return 1.0, ["threat_feed_match", "openphish_match"]

        # 3. Google Safe Browsing (if configured)
        if await self.check_google_safe_browsing(host_clean):
            return 1.0, ["threat_feed_match", "google_safebrowsing_match"]

        return 0.0, []


feeds_manager = ThreatFeedManager()
