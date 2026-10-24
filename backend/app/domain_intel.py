"""
Domain intelligence signals (DNS resolution, RDAP age stubs, and registrar signals).
"""

from __future__ import annotations
import logging
from typing import Dict, List, Optional, Tuple
import dns.resolver

logger = logging.getLogger(__name__)


class DomainIntelManager:
    def __init__(self, rdap_bootstrap_url: Optional[str] = None):
        self.rdap_bootstrap_url = rdap_bootstrap_url
        self.resolver = dns.resolver.Resolver()
        self.resolver.timeout = 0.5
        self.resolver.lifetime = 0.5

    async def get_signals(self, host: str, registrable_domain: str) -> Tuple[Dict[str, float], List[str]]:
        """
        Evaluate domain intelligence signals.
        Returns (signals_dict, reasons).
        """
        signals: Dict[str, float] = {}
        reasons: List[str] = []

        # Check DNS resolution
        has_dns = False
        try:
            answers = self.resolver.resolve(host, "A")
            if answers:
                has_dns = True
        except Exception:
            try:
                answers = self.resolver.resolve(registrable_domain, "A")
                if answers:
                    has_dns = True
            except Exception:
                has_dns = False

        # If DNS fails completely for registrable domain, it might be newly provisioned or NXDOMAIN
        if not has_dns:
            signals["D"] = 0.20
        else:
            signals["D"] = 0.05

        return signals, reasons
