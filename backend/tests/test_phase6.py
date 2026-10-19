import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import yaml
from fastapi.testclient import TestClient

from app.core.otel import otel_service, trace_span
from app.main import app

WORKSPACE_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_backend_dockerfile_multistage_and_hardening():
    """Verify backend Dockerfile implements multi-stage build, non-root execution, and healthcheck."""
    dockerfile_path = os.path.join(WORKSPACE_ROOT, "backend", "Dockerfile")
    assert os.path.exists(dockerfile_path), "backend/Dockerfile must exist"

    with open(dockerfile_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Multi-stage verification
    assert "AS builder" in content, "Backend Dockerfile must define builder stage"
    assert "AS runner" in content, "Backend Dockerfile must define runner stage"

    # Security hardening verification
    assert "useradd" in content or "adduser" in content, "Must create dedicated non-root user"
    assert "USER appuser" in content, "Must drop root privileges and switch to appuser"

    # Healthcheck verification
    assert "HEALTHCHECK" in content, "Must configure HEALTHCHECK instruction"
    assert "/health" in content, "Healthcheck must probe /health endpoint"

    # Production command
    assert "uvicorn" in content, "Must launch uvicorn ASGI production server"


def test_frontend_dockerfile_multistage_and_nginx():
    """Verify frontend Dockerfile implements Node multi-stage Vite build and Nginx runner."""
    dockerfile_path = os.path.join(WORKSPACE_ROOT, "frontend", "Dockerfile")
    assert os.path.exists(dockerfile_path), "frontend/Dockerfile must exist"

    with open(dockerfile_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Multi-stage verification
    assert "FROM node:" in content and "AS build" in content, "Frontend Dockerfile must define Node build stage"
    assert "FROM nginx:" in content and "AS runner" in content, "Frontend Dockerfile must define Nginx runner stage"

    # Static asset and config copy verification
    assert "/app/dist" in content, "Must copy compiled Vite distribution"
    assert "/usr/share/nginx/html" in content, "Must copy assets to Nginx html directory"
    assert "nginx.conf" in content, "Must copy custom hardened Nginx configuration"

    # Healthcheck verification
    assert "HEALTHCHECK" in content, "Must configure HEALTHCHECK instruction"
    assert "/healthz" in content, "Healthcheck probe must target /healthz"


def test_frontend_nginx_configuration():
    """Verify frontend/nginx.conf includes SPA fallback, API reverse proxy, WebSocket proxy, and security headers."""
    nginx_path = os.path.join(WORKSPACE_ROOT, "frontend", "nginx.conf")
    assert os.path.exists(nginx_path), "frontend/nginx.conf must exist"

    with open(nginx_path, "r", encoding="utf-8") as f:
        content = f.read()

    # SPA routing fallback
    assert "try_files $uri $uri/ /index.html;" in content, "Must include React SPA index.html fallback"

    # API gateway reverse proxy
    assert "location /api/" in content, "Must define /api/ location"
    assert "proxy_pass http://backend:8000/;" in content, "Must proxy /api/ to backend:8000"

    # WebSocket real-time proxy
    assert "location /ws" in content, "Must define /ws location for WebSockets"
    assert "proxy_set_header Upgrade $http_upgrade;" in content, "Must forward WebSocket Upgrade header"
    assert 'proxy_set_header Connection "upgrade";' in content, "Must forward WebSocket Connection header"

    # Security headers
    assert "X-Frame-Options" in content, "Must configure X-Frame-Options"
    assert "X-Content-Type-Options" in content, "Must configure X-Content-Type-Options"
    assert "X-XSS-Protection" in content, "Must configure X-XSS-Protection"

    # Compression
    assert "gzip on;" in content, "Must enable gzip compression"


def test_docker_compose_validity_and_services():
    """Verify docker-compose.yml defines all 5 required services with healthchecks, networks, and volumes."""
    compose_path = os.path.join(WORKSPACE_ROOT, "docker-compose.yml")
    assert os.path.exists(compose_path), "docker-compose.yml must exist"

    with open(compose_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)

    assert "services" in data, "docker-compose.yml must have services block"
    services = data["services"]

    # Verify all 5 requested services are present
    required_services = ["backend", "frontend", "mysql", "redis", "elasticsearch"]
    for s in required_services:
        assert s in services, f"Service '{s}' must be defined in docker-compose.yml"

    # Verify dependencies & healthchecks
    assert "depends_on" in services["backend"], "backend must depend on infrastructure services"
    assert "mysql" in services["backend"]["depends_on"], "backend must depend on mysql"
    assert "redis" in services["backend"]["depends_on"], "backend must depend on redis"
    assert "elasticsearch" in services["backend"]["depends_on"], "backend must depend on elasticsearch"

    assert "healthcheck" in services["backend"], "backend must have healthcheck"
    assert "healthcheck" in services["frontend"], "frontend must have healthcheck"
    assert "healthcheck" in services["mysql"], "mysql must have healthcheck"
    assert "healthcheck" in services["redis"], "redis must have healthcheck"
    assert "healthcheck" in services["elasticsearch"], "elasticsearch must have healthcheck"

    # Verify networks and volumes
    assert "networks" in data, "docker-compose.yml must define networks"
    assert "lfms_network" in data["networks"], "Must define lfms_network bridge network"

    assert "volumes" in data, "docker-compose.yml must define persistent volumes"
    for v in ["mysql_data", "redis_data", "es_data", "uploads_data"]:
        assert v in data["volumes"], f"Volume '{v}' must be declared"


def test_opentelemetry_tracer_initialization_and_span_creation():
    """Verify OpenTelemetry tracer initializes and records spans with attributes in memory."""
    tracer = otel_service.get_tracer("test.tracer")
    otel_service.clear_memory_spans()

    # Create a test span
    with tracer.start_as_current_span("test_legal_span") as span:
        span.set_attribute("tenant.id", "client_42")
        span.set_attribute("matter.code", "LIT-2026-001")

    spans = otel_service.get_memory_spans()
    assert len(spans) >= 1, "Expected at least 1 finished span"
    last_span = spans[-1]
    assert last_span.name == "test_legal_span"
    assert last_span.attributes.get("tenant.id") == "client_42"
    assert last_span.attributes.get("matter.code") == "LIT-2026-001"
    assert last_span.status.is_ok


def test_opentelemetry_domain_decorator_and_exception_handling():
    """Verify @trace_span decorator records spans and properly flags errors."""
    otel_service.clear_memory_spans()

    @trace_span("test.successful_operation", attributes={"operation.type": "audit"})
    def do_success():
        return "audit_passed"

    result = do_success()
    assert result == "audit_passed"

    spans = otel_service.get_memory_spans()
    success_span = next((s for s in spans if s.name == "test.successful_operation"), None)
    assert success_span is not None
    assert success_span.attributes.get("operation.type") == "audit"
    assert success_span.status.is_ok

    # Test exception recording
    @trace_span("test.failing_operation")
    def do_failure():
        raise ValueError("Simulated Ledger Imbalance")

    with pytest.raises(ValueError, match="Simulated Ledger Imbalance"):
        do_failure()

    spans_after = otel_service.get_memory_spans()
    fail_span = next((s for s in spans_after if s.name == "test.failing_operation"), None)
    assert fail_span is not None
    assert not fail_span.status.is_ok
    assert "Simulated Ledger Imbalance" in str(fail_span.status.description)


def test_opentelemetry_distributed_trace_correlation_in_http_requests(client):
    """Verify HTTP requests are assigned OpenTelemetry trace IDs and propagate X-Trace-ID header."""
    res = client.get("/health")
    assert res.status_code == 200

    # Verify trace ID header injection
    trace_id = res.headers.get("X-Trace-ID")
    req_id = res.headers.get("X-Request-ID")

    assert req_id is not None, "Response must include X-Request-ID"
    assert trace_id is not None, "Response must include X-Trace-ID"
    assert len(trace_id) == 32, f"Trace ID must be 32-character hex, got '{trace_id}'"


def test_system_telemetry_includes_opentelemetry_metadata(client):
    """Verify /system/telemetry exposes active OpenTelemetry tracing status."""
    res = client.get("/system/telemetry")
    assert res.status_code == 200
    data = res.json()

    assert "metrics" in data
    metrics = data["metrics"]
    assert "tracing" in metrics
    tracing = metrics["tracing"]
    assert tracing["enabled"] is True
    assert tracing["service_name"] == "lfms-api"
    assert "OpenTelemetry" in tracing["instrumentation"]


def test_github_actions_ci_workflow_validity():
    """Verify GitHub Actions CI workflow configures backend testing, frontend build, and docker validation."""
    ci_path = os.path.join(WORKSPACE_ROOT, ".github", "workflows", "ci.yml")
    assert os.path.exists(ci_path), ".github/workflows/ci.yml must exist"

    with open(ci_path, "r", encoding="utf-8") as f:
        ci_data = yaml.safe_load(f)

    assert "jobs" in ci_data
    jobs = ci_data["jobs"]

    assert "backend-test" in jobs, "Must define backend-test job"
    assert "frontend-build" in jobs, "Must define frontend-build job"
    assert "docker-validation" in jobs, "Must define docker-validation job"

    # Verify service containers in backend test job
    backend_services = jobs["backend-test"].get("services", {})
    assert "mysql" in backend_services, "backend-test must define MySQL service container"
    assert "redis" in backend_services, "backend-test must define Redis service container"
