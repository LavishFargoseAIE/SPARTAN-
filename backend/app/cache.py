"""
Verdict caching layer: Redis with automatic in-memory fallback.
"""

from __future__ import annotations
import json
import logging
import time
from typing import Any, Dict, Optional, Tuple

import redis.asyncio as redis

from app.config import settings

logger = logging.getLogger(__name__)


class VerdictCache:
    def __init__(self, redis_url: Optional[str] = None):
        self._redis_url = redis_url or settings.REDIS_URL
        self._redis_client: Optional[redis.Redis] = None
        self._memory_cache: Dict[str, Tuple[float, Any]] = {}
        self._use_redis = False

    async def initialize(self) -> None:
        """Attempt connection to Redis; fall back to in-memory cache if unavailable."""
        if self._redis_url and self._redis_url != "<<FILL_ME>>":
            try:
                client = redis.from_url(
                    self._redis_url,
                    socket_connect_timeout=0.5,
                    socket_timeout=0.5,
                    decode_responses=True,
                )
                await client.ping()
                self._redis_client = client
                self._use_redis = True
                logger.info("Connected to Redis cache.")
                return
            except Exception as e:
                logger.warning(f"Redis unavailable ({e}). Using in-memory cache fallback.")
        self._use_redis = False

    async def get(self, key: str) -> Optional[Dict[str, Any]]:
        """Retrieve cached verdict by host."""
        if self._use_redis and self._redis_client:
            try:
                val = await self._redis_client.get(f"verdict:{key}")
                if val:
                    return json.loads(val)
            except Exception as e:
                logger.warning(f"Redis get failed: {e}. Falling back to memory.")

        # Check in-memory cache
        item = self._memory_cache.get(key)
        if item:
            expires_at, val = item
            if time.time() < expires_at:
                return val
            else:
                del self._memory_cache[key]
        return None

    async def set(self, key: str, value: Dict[str, Any], ttl_seconds: int = 3600) -> None:
        """Store verdict with time-to-live."""
        if self._use_redis and self._redis_client:
            try:
                await self._redis_client.set(
                    f"verdict:{key}",
                    json.dumps(value),
                    ex=ttl_seconds,
                )
                return
            except Exception as e:
                logger.warning(f"Redis set failed: {e}. Using memory cache.")

        # In-memory store
        self._memory_cache[key] = (time.time() + ttl_seconds, value)

    async def close(self) -> None:
        if self._redis_client:
            await self._redis_client.aclose()


verdict_cache = VerdictCache()
