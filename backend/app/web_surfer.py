"""
Web & Community Reputation Analysis Engine.
Surfs Wikipedia, Reddit, and community discussions to verify whether a domain
is genuine, newly created, or a reported scam. If genuine, unlocks the site.
"""

from __future__ import annotations
import asyncio
from html import unescape
import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import httpx

logger = logging.getLogger(__name__)

SCAM_KEYWORDS = {
    "scam", "phishing", "fake", "stole", "fraud", "beware",
    "dont use", "spoof", "malicious", "cheater", "hacked", "loss"
}
LEGIT_KEYWORDS = {
    "official", "legit", "genuine", "authentic", "safe", "real",
    "trusted", "works fine", "good experience", "verified"
}

BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)


async def check_wikipedia(domain: str, timeout_seconds: float = 3.0) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Search Wikipedia API for official references to the domain.
    Returns (found_on_wiki, article_title, snippet).
    """
    url = "https://en.wikipedia.org/w/api.php"
    params = {
        "action": "query",
        "list": "search",
        "srsearch": f'"{domain}"',
        "format": "json",
        "srlimit": 3,
    }
    headers = {"User-Agent": BROWSER_UA, "Accept": "application/json"}
    try:
        async with httpx.AsyncClient(timeout=timeout_seconds, headers=headers) as client:
            resp = await client.get(url, params=params)
            if resp.status_code == 200:
                data = resp.json()
                results = data.get("query", {}).get("search", [])
                for item in results:
                    title = item.get("title", "")
                    snippet = unescape(re.sub(r"<[^>]+>", "", item.get("snippet", "")))
                    if domain.lower() in snippet.lower() or domain.lower() in title.lower():
                        return True, title, snippet
    except Exception as e:
        logger.debug("Wikipedia search for %s failed: %s", domain, e)

    return False, None, None


async def check_community_discussions(domain: str, timeout_seconds: float = 3.5) -> Tuple[int, int, List[str]]:
    """
    Search community web and Reddit discussions for domain reputation.
    Returns (scam_hits, legit_hits, discussion_snippets).
    """
    query = f"site:reddit.com {domain}"
    url = f"https://html.duckduckgo.com/html/?q={query}"
    headers = {"User-Agent": BROWSER_UA, "Accept": "text/html"}

    scam_count = 0
    legit_count = 0
    snippets: List[str] = []

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds, headers=headers, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code == 200 and resp.text:
                # Extract text results from DDG HTML
                matches = re.findall(r'<a class="result__snippet[^>]*>(.*?)</a>', resp.text, re.DOTALL)
                for raw_snip in matches[:5]:
                    clean = unescape(re.sub(r"<[^>]+>", "", raw_snip)).strip()
                    if not clean:
                        continue
                    snippets.append(clean)
                    lower_snip = clean.lower()

                    for sk in SCAM_KEYWORDS:
                        if sk in lower_snip:
                            scam_count += 1
                            break

                    for lk in LEGIT_KEYWORDS:
                        if lk in lower_snip:
                            legit_count += 1
                            break
    except Exception as e:
        logger.debug("Community discussion check for %s failed: %s", domain, e)

    return scam_count, legit_count, snippets


async def analyze_web_reputation(hostname: str, registrable: str) -> Dict[str, Any]:
    """
    Synthesize Wikipedia, Reddit, and web reviews into an automated reputation verdict.
    If confirmed genuine, unlocks the site.
    """
    domain = registrable or hostname

    # Run Wikipedia and Community search in parallel
    wiki_task = check_wikipedia(domain)
    comm_task = check_community_discussions(domain)

    wiki_res, comm_res = await asyncio.gather(wiki_task, comm_task, return_exceptions=True)

    wiki_found = False
    wiki_article = None
    wiki_snippet = None
    if isinstance(wiki_res, tuple) and len(wiki_res) == 3:
        wiki_found, wiki_article, wiki_snippet = wiki_res

    scam_hits = 0
    legit_hits = 0
    discussion_snippets: List[str] = []
    if isinstance(comm_res, tuple) and len(comm_res) == 3:
        scam_hits, legit_hits, discussion_snippets = comm_res

    # Analysis decision
    is_genuine = False
    unlock = False
    status = "UNKNOWN"
    summary = ""
    sources = []

    if wiki_found and scam_hits == 0:
        is_genuine = True
        unlock = True
        status = "GENUINE_CONFIRMED"
        sources.append(f"Wikipedia: {wiki_article}")
        summary = f"Verified genuine institution. Referenced on Wikipedia in the '{wiki_article}' article with clean reputation."
    elif scam_hits >= 2:
        is_genuine = False
        unlock = False
        status = "SCAM_REPORTED"
        sources.append("Reddit & Security Forums")
        summary = f"Warning: Domain flagged as scam/phishing in {scam_hits} community discussions."
    elif legit_hits >= 2 and scam_hits == 0:
        is_genuine = True
        unlock = True
        status = "COMMUNITY_VERIFIED"
        sources.append("Reddit Community")
        summary = f"Community reviews confirm domain as legitimate with {legit_hits} positive reports."
    else:
        is_genuine = False
        unlock = False
        status = "UNVERIFIED_NEW"
        summary = "No verified Wikipedia presence or conclusive community review found. Exercise caution."

    return {
        "host": hostname,
        "registrable": registrable,
        "is_genuine": is_genuine,
        "unlock": unlock,
        "status": status,
        "summary": summary,
        "sources": sources,
        "scam_reports": scam_hits,
        "legit_reports": legit_hits,
        "wiki_article": wiki_article,
        "discussion_sample": discussion_snippets[:2] if discussion_snippets else [],
    }
