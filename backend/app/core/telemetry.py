import json
import logging
import os
import sys
import time
import uuid
from typing import Any, Dict, List, Optional
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from .otel import otel_service
from opentelemetry.trace import Status, StatusCode

# Configure standard logger to output structured JSON
logger = logging.getLogger("lfms.telemetry")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(logging.INFO)
    logger.addHandler(handler)


class MetricsCollector:
    """Thread-safe in-memory metrics store for observability and SLA telemetry."""

    def __init__(self):
        self._start_time = time.time()
        self._total_requests = 0
        self._status_2xx = 0
        self._status_4xx = 0
        self._status_5xx = 0
        self._slow_requests = 0
        self._durations: List[float] = []
        self._max_samples = 500

    def record(self, status_code: int, duration_ms: float):
        self._total_requests += 1
        if 200 <= status_code < 400:
            self._status_2xx += 1
        elif 400 <= status_code < 500:
            self._status_4xx += 1
        elif status_code >= 500:
            self._status_5xx += 1

        if duration_ms > 1000.0:
            self._slow_requests += 1

        if len(self._durations) >= self._max_samples:
            self._durations.pop(0)
        self._durations.append(duration_ms)

    def get_summary(self) -> Dict[str, Any]:
        uptime_seconds = int(time.time() - self._start_time)
        avg_latency = (
            round(sum(self._durations) / len(self._durations), 2)
            if self._durations
            else 0.0
        )
        sorted_durations = sorted(self._durations)
        p95_index = int(len(sorted_durations) * 0.95)
        p95_latency = (
            round(sorted_durations[p95_index], 2)
            if sorted_durations and p95_index < len(sorted_durations)
            else avg_latency
        )

        return {
            "uptime_seconds": uptime_seconds,
            "total_requests": self._total_requests,
            "status_2xx": self._status_2xx,
            "status_4xx": self._status_4xx,
            "status_5xx": self._status_5xx,
            "slow_requests_gt_1s": self._slow_requests,
            "avg_latency_ms": avg_latency,
            "p95_latency_ms": p95_latency,
            "tracing": {
                "enabled": True,
                "service_name": "lfms-api",
                "instrumentation": "OpenTelemetry SDK",
            },
        }


metrics = MetricsCollector()


class StructuredLoggingAndTracingMiddleware(BaseHTTPMiddleware):
    """
    Middleware injecting unique X-Request-ID, measuring request latency,
    starting OpenTelemetry distributed spans, and outputting structured
    SOC-2 compliant JSON logs for every HTTP transaction.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.perf_counter()

        # 1. Request ID injection & propagation
        request_id = request.headers.get("X-Request-ID")
        if not request_id:
            request_id = f"req_{uuid.uuid4().hex[:12]}"
        request.state.request_id = request_id

        # 2. Extract client IP
        client_ip = (
            request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or (request.client.host if request.client else "unknown")
        )

        # 3. Start OpenTelemetry distributed tracing span
        tracer = otel_service.get_tracer("lfms.http")
        span_name = f"{request.method} {request.url.path}"

        response: Optional[Response] = None
        error_name = None

        with tracer.start_as_current_span(span_name) as span:
            span.set_attribute("http.method", request.method)
            span.set_attribute("http.target", request.url.path)
            span.set_attribute("http.client_ip", client_ip)
            span.set_attribute("lfms.request_id", request_id)

            trace_id, span_id = otel_service.get_current_trace_and_span_ids()
            request.state.trace_id = trace_id
            request.state.span_id = span_id

            try:
                response = await call_next(request)
                if response is not None:
                    span.set_attribute("http.status_code", response.status_code)
                    if response.status_code >= 400:
                        span.set_status(Status(StatusCode.ERROR, description=f"HTTP {response.status_code}"))
                    else:
                        span.set_status(Status(StatusCode.OK))
            except Exception as exc:
                error_name = exc.__class__.__name__
                span.record_exception(exc)
                span.set_status(Status(StatusCode.ERROR, description=str(exc)))
                raise
            finally:
                duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
                status_code = response.status_code if response else 500

                # Attach request id & trace id to response headers if response exists
                if response is not None:
                    response.headers["X-Request-ID"] = request_id
                    if trace_id != "none":
                        response.headers["X-Trace-ID"] = trace_id

                # Extract user id if authenticated in request state
                user_id = getattr(request.state, "user_id", None)
                if not user_id and hasattr(request.state, "user"):
                    user_id = getattr(request.state.user, "employee_id", None)

                # Record telemetry metrics
                metrics.record(status_code, duration_ms)

                # Structured Log payload correlated with OpenTelemetry trace_id & span_id
                log_payload = {
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "request_id": request_id,
                    "trace_id": trace_id,
                    "span_id": span_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": status_code,
                    "duration_ms": duration_ms,
                    "client_ip": client_ip,
                    "user_id": user_id,
                }
                if error_name:
                    log_payload["error"] = error_name

                if duration_ms > 1000.0:
                    log_payload["slow_request"] = True
                    logger.warning(json.dumps(log_payload))
                elif status_code >= 500:
                    logger.error(json.dumps(log_payload))
                else:
                    logger.info(json.dumps(log_payload))

        return response
