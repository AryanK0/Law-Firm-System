import asyncio
import os
import time
from contextlib import asynccontextmanager
from typing import AsyncGenerator

# Optional Redis client for distributed locking
REDIS_URL = os.getenv("REDIS_URL", None)
_redis_client = None
if REDIS_URL:
    try:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(REDIS_URL, decode_responses=True)
    except Exception:
        _redis_client = None

# In-memory distributed lock dictionary fallback with lock expiration tracking
_local_locks: dict[str, asyncio.Lock] = {}
_lock_metadata: dict[str, dict] = {}
_registry_guard = asyncio.Lock()


class LockTimeoutError(Exception):
    """Raised when acquiring a distributed lock times out."""
    pass


@asynccontextmanager
async def distributed_lock(
    resource_type: str,
    resource_id: int | str,
    locked_by: int | str = "system",
    timeout_seconds: float = 10.0,
    lease_seconds: float = 30.0,
) -> AsyncGenerator[None, None]:
    """
    Acquire a distributed lock with automatic lease release and timeout.
    Replaces the MySQL Lock_Log table.
    """
    lock_key = f"lock:{resource_type}:{resource_id}"

    if _redis_client:
        # Redlock / Redis SET NX PX pattern
        start_time = time.monotonic()
        acquired = False
        token = f"{locked_by}:{time.time()}"
        px_ms = int(lease_seconds * 1000)

        while not acquired:
            acquired = await _redis_client.set(lock_key, token, nx=True, px=px_ms)
            if acquired:
                break
            if time.monotonic() - start_time >= timeout_seconds:
                raise LockTimeoutError(
                    f"Timed out waiting for lock on {resource_type} #{resource_id}"
                )
            await asyncio.sleep(0.05)

        try:
            yield
        finally:
            # Atomic unlock script
            unlock_lua = """
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
            """
            try:
                await _redis_client.eval(unlock_lua, 1, lock_key, token)
            except Exception:
                pass
    else:
        # Asyncio lock fallback
        async with _registry_guard:
            if lock_key not in _local_locks:
                _local_locks[lock_key] = asyncio.Lock()
            lock = _local_locks[lock_key]

        try:
            await asyncio.wait_for(lock.acquire(), timeout=timeout_seconds)
        except asyncio.TimeoutError:
            raise LockTimeoutError(
                f"Timed out acquiring lock on {resource_type} #{resource_id}"
            )

        _lock_metadata[lock_key] = {
            "resource_type": resource_type,
            "resource_id": resource_id,
            "locked_by": locked_by,
            "locked_at": time.time(),
        }

        try:
            yield
        finally:
            _lock_metadata.pop(lock_key, None)
            lock.release()


async def get_active_locks() -> list[dict]:
    """Return currently active locks for DBMS monitoring / UI display."""
    if _redis_client:
        try:
            keys = await _redis_client.keys("lock:*")
            records = []
            for k in keys:
                val = await _redis_client.get(k)
                parts = k.split(":")
                records.append({
                    "lock_id": hash(k) % 100000,
                    "table_name": parts[1] if len(parts) > 1 else "unknown",
                    "record_id": parts[2] if len(parts) > 2 else "unknown",
                    "locked_by": val,
                    "status": "Active",
                })
            return records
        except Exception:
            return []

    return [
        {
            "lock_id": hash(k) % 100000,
            "table_name": meta["resource_type"],
            "record_id": meta["resource_id"],
            "locked_by": meta["locked_by"],
            "status": "Active",
        }
        for k, meta in _lock_metadata.items()
    ]
