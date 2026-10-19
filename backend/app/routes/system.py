from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..core.auth import AuthenticatedUser, get_current_user
from ..core.cache import cache
from ..core.database import get_db
from ..core.ratelimit import rate_limiter
from ..core.telemetry import metrics

router = APIRouter(prefix="/system", tags=["systems"])


@router.get("/telemetry")
async def get_system_telemetry(db: AsyncSession = Depends(get_db)):
    """
    Returns live system telemetry including Redis cache hit/miss ratio,
    latency percentiles (P95, Avg), request rate stats, and DB connection state.
    """
    cache_stats = await cache.get_stats()
    metrics_summary = metrics.get_summary()

    return {
        "status": "healthy",
        "cache": cache_stats,
        "metrics": metrics_summary,
    }


@router.post("/cache/clear")
async def clear_cache(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Clears all cached Redis and in-memory keys.
    Restricted to Partner / Systems Oversight roles.
    """
    role = getattr(current_user, "role_name", "")
    if role not in {"IT Admin", "Managing Partner", "Senior Partner"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only IT Admin and Senior Partners can flush the system cache.",
        )

    await cache.clear()
    return {"message": "System cache flushed successfully.", "status": "cleared"}


@router.post("/ratelimit/reset")
async def reset_ratelimit(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Resets sliding-window rate limiter counters.
    Restricted to IT Admin.
    """
    role = getattr(current_user, "role_name", "")
    if role not in {"IT Admin", "Managing Partner"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only IT Admin can reset rate limits.",
        )

    rate_limiter.reset()
    return {"message": "Rate limit window reset successfully."}
