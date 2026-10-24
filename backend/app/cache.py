"""
Cache layer with Redis backend and in-memory TTL/LRU fallback.
"""

from __future__ import annotations
import json
import logging
import time
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class VerdictCache:
    def __init__(self, redis_url: Optional[str] = None):
        self.redis_url = redis_url
        self.redis_client = None
        self._memory_cache: Dict[str, Tuple[float, Any]] = {}
        self._connect_redis()

    def _connect_redis(self):
        if not self.redis_url:
            return
        try:
            import redis
            client = redis.from_url(self.redis_url, socket_timeout=0.3, socket_connect_timeout=0.3)
            client.ping()
            self.redis_client = client
            logger.info("Connected to Redis cache at %s", self.redis_url)
        except Exception as e:
            logger.warning("Redis unavailable (%s), falling back to in-memory cache", e)
            self.redis_client = None

    def get(self, key: str) -> Optional[Any]:
        # Try Redis first
        if self.redis_client:
            try:
                val = self.redis_client.get(key)
                if val:
                    return json.loads(val.decode("utf-8"))
            except Exception:
                pass

        # In-memory fallback
        item = self._memory_cache.get(key)
        if item:
            expires_at, val = item
            if time.time() < expires_at:
                return val
            else:
                del self._memory_cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 3600):
        # Redis
        if self.redis_client:
            try:
                self.redis_client.setex(key, ttl_seconds, json.dumps(value))
                return
            except Exception:
                pass

        # In-memory
        # Keep memory cache size bounded (max 10,000 items)
        if len(self._memory_cache) > 10000:
            now = time.time()
            expired = [k for k, (exp, _) in self._memory_cache.items() if now >= exp]
            for k in expired:
                del self._memory_cache[k]
            if len(self._memory_cache) > 10000:
                # Remove oldest 1000 keys
                old_keys = list(self._memory_cache.keys())[:1000]
                for k in old_keys:
                    del self._memory_cache[k]

        self._memory_cache[key] = (time.time() + ttl_seconds, value)
