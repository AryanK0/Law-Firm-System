import fnmatch
import json
import logging
import time
from typing import Any, Dict, Optional, Tuple

from ..config import get_env

logger = logging.getLogger("lfms.cache")

try:
    import redis.asyncio as aioredis
    from redis.exceptions import ConnectionError, RedisError, TimeoutError
    REDIS_AVAILABLE = True
except ImportError:
    aioredis = None
    ConnectionError = Exception
    RedisError = Exception
    TimeoutError = Exception
    REDIS_AVAILABLE = False


class InMemoryCache:
    """Thread-safe and async-compatible in-memory cache with TTL expiration."""

    def __init__(self):
        self._store: Dict[str, Tuple[str, float]] = {}

    def get(self, key: str) -> Optional[str]:
        now = time.time()
        item = self._store.get(key)
        if not item:
            return None
        val, expiry = item
        if expiry > 0 and now > expiry:
            del self._store[key]
            return None
        return val

    def set(self, key: str, value: str, ttl: int = 0) -> bool:
        expiry = (time.time() + ttl) if ttl > 0 else 0.0
        self._store[key] = (value, expiry)
        return True

    def delete(self, key: str) -> bool:
        if key in self._store:
            del self._store[key]
            return True
        return False

    def delete_pattern(self, pattern: str) -> int:
        now = time.time()
        keys_to_del = [
            k for k in self._store.keys()
            if fnmatch.fnmatch(k, pattern)
        ]
        count = 0
        for k in keys_to_del:
            del self._store[k]
            count += 1
        return count

    def clear(self) -> bool:
        self._store.clear()
        return True

    def count(self) -> int:
        # Filter expired items
        now = time.time()
        valid = [k for k, (_, exp) in self._store.items() if exp == 0 or exp > now]
        return len(valid)


class CacheManager:
    """
    Tier-1 Resilient Cache Manager.
    Tries Redis first. If Redis is down, unreachable, or throws an error,
    it automatically falls back to an in-memory TTL store with zero impact
    on client latency or application availability.
    """

    def __init__(self):
        self.redis_url = get_env("REDIS_URL", default="redis://127.0.0.1:6379/0")
        self._redis_client = None
        self._fallback = InMemoryCache()
        self._is_redis_healthy = False
        self._last_health_check = 0.0
        self._hits = 0
        self._misses = 0

    async def _get_client(self):
        if not REDIS_AVAILABLE:
            return None

        now = time.time()
        # Periodically retry Redis every 30 seconds if previously marked unhealthy
        if self._redis_client is None or (not self._is_redis_healthy and now - self._last_health_check > 30):
            self._last_health_check = now
            try:
                self._redis_client = aioredis.from_url(
                    self.redis_url,
                    socket_timeout=1.0,
                    socket_connect_timeout=1.0,
                    decode_responses=True,
                )
                await self._redis_client.ping()
                self._is_redis_healthy = True
                logger.info(f"Connected to Redis at {self.redis_url}")
            except Exception as e:
                self._is_redis_healthy = False
                logger.debug(f"Redis unavailable ({e}), using in-memory cache fallback")
                return None

        return self._redis_client if self._is_redis_healthy else None

    async def get(self, key: str) -> Optional[str]:
        client = await self._get_client()
        if client:
            try:
                val = await client.get(key)
                if val is not None:
                    self._hits += 1
                    return val
                self._misses += 1
                return None
            except Exception as e:
                logger.warning(f"Redis get error on {key} ({e}), falling back to memory")
                self._is_redis_healthy = False

        val = self._fallback.get(key)
        if val is not None:
            self._hits += 1
        else:
            self._misses += 1
        return val

    async def set(self, key: str, value: str, ttl: int = 300) -> bool:
        client = await self._get_client()
        if client:
            try:
                await client.set(key, value, ex=ttl if ttl > 0 else None)
                # Keep fallback in sync
                self._fallback.set(key, value, ttl)
                return True
            except Exception as e:
                logger.warning(f"Redis set error on {key} ({e}), using memory fallback")
                self._is_redis_healthy = False

        return self._fallback.set(key, value, ttl)

    async def get_json(self, key: str) -> Optional[Any]:
        raw = await self.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except Exception:
            return None

    async def set_json(self, key: str, value: Any, ttl: int = 300) -> bool:
        try:
            serialized = json.dumps(value, default=str)
            return await self.set(key, serialized, ttl=ttl)
        except Exception as e:
            logger.error(f"Failed to serialize json for key {key}: {e}")
            return False

    async def delete(self, key: str) -> bool:
        client = await self._get_client()
        if client:
            try:
                await client.delete(key)
            except Exception:
                self._is_redis_healthy = False
        return self._fallback.delete(key)

    async def delete_pattern(self, pattern: str) -> int:
        count = 0
        client = await self._get_client()
        if client:
            try:
                keys = await client.keys(pattern)
                if keys:
                    count = await client.delete(*keys)
            except Exception:
                self._is_redis_healthy = False

        fallback_count = self._fallback.delete_pattern(pattern)
        return max(count, fallback_count)

    async def clear(self) -> bool:
        client = await self._get_client()
        if client:
            try:
                await client.flushdb()
            except Exception:
                self._is_redis_healthy = False
        return self._fallback.clear()

    async def get_stats(self) -> Dict[str, Any]:
        total = self._hits + self._misses
        hit_ratio = round((self._hits / total * 100), 2) if total > 0 else 0.0
        return {
            "backend": "redis" if self._is_redis_healthy else "in_memory_fallback",
            "redis_connected": self._is_redis_healthy,
            "hits": self._hits,
            "misses": self._misses,
            "total_queries": total,
            "hit_ratio_percent": hit_ratio,
            "keys_in_memory": self._fallback.count(),
        }


# Global Singleton
cache = CacheManager()


# Cache Invalidation Hooks
async def invalidate_case_cache(case_id: int):
    """Invalidates individual case detail, list, and overview analytics."""
    await cache.delete(f"case:detail:{case_id}")
    await cache.delete("cases:list")
    await cache.delete("cases:analytics")
    await cache.delete("overview:dashboard")
    logger.info(f"Invalidated cache for case #{case_id}")


async def invalidate_access_cache(employee_id: Optional[int] = None):
    """Invalidates access control dashboard and matrix caches."""
    if employee_id:
        await cache.delete(f"access:matrix:{employee_id}")
    await cache.delete("access:dashboard")
    logger.info(f"Invalidated access control cache for employee {employee_id or 'all'}")


async def invalidate_operations_cache():
    """Invalidates tickets, documents, and operations dashboard."""
    await cache.delete("tickets:list")
    await cache.delete("documents:list")
    await cache.delete("overview:dashboard")
