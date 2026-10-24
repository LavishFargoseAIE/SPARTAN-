"""
Threat feed lookups: Google Safe Browsing, OpenPhish community feed, and Local Badlist.
"""

from __future__ import annotations
import csv
import logging
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
import httpx

logger = logging.getLogger(__name__)


class ThreatFeedManager:
    def __init__(
        self,
        local_badlist_path: Optional[str] = None,
        google_safe_browsing_key: Optional[str] = None,
        openphish_feed_url: Optional[str] = None,
    ):
        self.local_badlist_path = local_badlist_path
        self.google_safe_browsing_key = google_safe_browsing_key
        self.openphish_feed_url = openphish_feed_url

        self.local_bad_hosts: Set[str] = set()
        self.openphish_hosts: Set[str] = set()

        self.load_local_badlist()

    def load_local_badlist(self):
        if not self.local_badlist_path:
            return
        p = Path(self.local_badlist_path)
        if not p.exists():
            return
        try:
            with open(p, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    host = row.get("host", "").strip().lower()
                    if host:
                        self.local_bad_hosts.add(host)
            logger.info("Loaded %d bad hosts from %s", len(self.local_bad_hosts), p)
        except Exception as e:
            logger.warning("Failed loading badlist from %s: %s", p, e)

    async def fetch_openphish_feed(self):
        if not self.openphish_feed_url:
            return
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(self.openphish_feed_url)
                if resp.status_code == 200:
                    hosts = set()
                    for line in resp.text.splitlines():
                        line = line.strip()
                        if line.startswith("http"):
                            try:
                                from urllib.parse import urlparse
                                parsed = urlparse(line)
                                if parsed.netloc:
                                    hosts.add(parsed.netloc.lower())
                            except Exception:
                                pass
                    self.openphish_hosts = hosts
                    logger.info("Updated %d OpenPhish hosts", len(hosts))
        except Exception as e:
            logger.warning("Failed fetching OpenPhish feed: %s", e)

    async def check_google_safe_browsing(self, host: str) -> bool:
        if not self.google_safe_browsing_key:
            return False
        url = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={self.google_safe_browsing_key}"
        payload = {
            "client": {"clientId": "siteguard-app", "clientVersion": "1.0.0"},
            "threatInfo": {
                "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
                "platformTypes": ["ANY_PLATFORM"],
                "threatEntryTypes": ["URL"],
                "threatEntries": [{"url": f"http://{host}/"}, {"url": f"https://{host}/"}],
            },
        }
        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    matches = data.get("matches", [])
                    return len(matches) > 0
        except Exception as e:
            logger.debug("Google Safe Browsing check timed out or error: %s", e)
        return False

    async def check(self, host: str) -> Tuple[float, List[str]]:
        """
        Check host against all available threat feeds.
        Returns (T_score, reasons).
        """
        h = host.lower()
        reasons = []

        # 1. Local badlist (instant)
        if h in self.local_bad_hosts:
            reasons.append("known_threat_badlist_match")
            return 1.0, reasons

        # 2. OpenPhish cache
        if h in self.openphish_hosts:
            reasons.append("openphish_feed_match")
            return 1.0, reasons

        # 3. Google Safe Browsing
        if self.google_safe_browsing_key:
            hit = await self.check_google_safe_browsing(h)
            if hit:
                reasons.append("google_safe_browsing_match")
                return 1.0, reasons

        return 0.0, []
