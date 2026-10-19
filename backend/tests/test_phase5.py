import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient

from app.core.cache import cache, invalidate_case_cache
from app.core.ratelimit import rate_limiter
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def admin_token(client):
    res = client.post("/auth/switch-persona", json={"employee_id": 8})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture(scope="module")
def associate_token(client):
    res = client.post("/auth/switch-persona", json={"employee_id": 7})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_x_request_id_injection_and_propagation(client):
    """Test that incoming requests are automatically stamped with an X-Request-ID header."""
    # 1. Automatic generation
    res = client.get("/health")
    assert res.status_code == 200
    req_id = res.headers.get("X-Request-ID")
    assert req_id is not None
    assert req_id.startswith("req_")

    # 2. Propagation of client-supplied trace ID
    custom_trace_id = "trace-distributed-abc12345"
    res2 = client.get("/health", headers={"X-Request-ID": custom_trace_id})
    assert res2.status_code == 200
    assert res2.headers.get("X-Request-ID") == custom_trace_id


def test_system_telemetry_endpoint(client):
    """Test that /system/telemetry reports observability metrics and cache status."""
    res = client.get("/system/telemetry")
    assert res.status_code == 200
    data = res.json()

    assert data["status"] == "healthy"
    assert "cache" in data
    assert "metrics" in data

    # Verify cache telemetry
    cache_stats = data["cache"]
    assert "backend" in cache_stats
    assert "hits" in cache_stats
    assert "misses" in cache_stats
    assert "hit_ratio_percent" in cache_stats

    # Verify latency telemetry
    metrics = data["metrics"]
    assert "uptime_seconds" in metrics
    assert "total_requests" in metrics
    assert "avg_latency_ms" in metrics
    assert "p95_latency_ms" in metrics


@pytest.mark.anyio
async def test_cache_manager_direct_set_get_and_stats():
    """Test CacheManager setting, getting, and stats tracking."""
    test_key = "test:saas:tenant:99"
    test_data = {"firm": "Pearson Specter Litt", "tier": "Enterprise"}

    await cache.set_json(test_key, test_data, ttl=60)
    fetched = await cache.get_json(test_key)
    assert fetched == test_data

    stats = await cache.get_stats()
    assert stats["hits"] >= 1

    await cache.delete(test_key)
    deleted = await cache.get_json(test_key)
    assert deleted is None


def test_case_metadata_caching_and_invalidation(client, admin_token):
    """Test that case detail responses are cached and subsequently invalidated on mutations."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    case_id = 1

    # First access - populates cache
    res1 = client.get(f"/cases/{case_id}", headers=headers)
    assert res1.status_code == 200
    data1 = res1.json()

    # Second access - served from cache
    res2 = client.get(f"/cases/{case_id}", headers=headers)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data1["title"] == data2["title"]

    # Manual invalidation hook verification
    import asyncio
    asyncio.run(invalidate_case_cache(case_id))

    # Access after invalidation - repopulates
    res3 = client.get(f"/cases/{case_id}", headers=headers)
    assert res3.status_code == 200


def test_rate_limiting_burst_protection_and_http_429(client):
    """Test that rapid bursts exceeding rate limit trigger HTTP 429 Too Many Requests."""
    burst_headers = {"X-Forwarded-For": "198.51.100.42"}

    # Reset limiter for this IP
    rate_limiter.reset()

    # Rapid burst requests (limit is 30 in 5s)
    responses = []
    for _ in range(35):
        resp = client.get("/", headers=burst_headers)
        responses.append(resp.status_code)

    # At least one request beyond the 30-burst limit must receive 429
    assert 429 in responses, f"Expected 429 in responses: {responses}"

    # Verify 429 headers
    last_resp = client.get("/", headers=burst_headers)
    assert last_resp.status_code == 429
    assert "Retry-After" in last_resp.headers
    assert last_resp.headers.get("X-RateLimit-Limit") == "30"
    assert last_resp.headers.get("X-RateLimit-Remaining") == "0"
    assert "Rate limit exceeded" in last_resp.json()["detail"]

    # Reset for other tests
    rate_limiter.reset()


def test_rate_limiting_exempt_routes(client):
    """Test that exempt routes like /health and /docs are never throttled."""
    burst_headers = {"X-Forwarded-For": "198.51.100.99"}

    # Issue 40 rapid requests to health endpoint
    for _ in range(40):
        resp = client.get("/health", headers=burst_headers)
        assert resp.status_code == 200

    rate_limiter.reset()


def test_system_cache_clear_rbac(client, associate_token, admin_token):
    """Test that clearing system cache is restricted to Partners / IT Admin."""
    # 1. Associate (Hierarchy 4) is forbidden (403)
    res_forbidden = client.post(
        "/system/cache/clear",
        headers={"Authorization": f"Bearer {associate_token}"},
    )
    assert res_forbidden.status_code == 403
    assert "Only IT Admin and Senior Partners" in res_forbidden.json()["detail"]

    # 2. IT Admin is authorized (200)
    res_ok = client.post(
        "/system/cache/clear",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_ok.status_code == 200
    assert res_ok.json()["status"] == "cleared"


def test_ratelimit_reset_endpoint(client, admin_token):
    """Test that IT Admin can reset rate limiter window."""
    res = client.post(
        "/system/ratelimit/reset",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    assert res.json()["message"] == "Rate limit window reset successfully."
