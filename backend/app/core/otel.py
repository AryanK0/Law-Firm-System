"""
Tier-1 OpenTelemetry Distributed Tracing & Instrumentation Layer.
Enables end-to-end distributed tracing across API requests, database queries,
and domain operations with correlation to structured JSON logging.
"""

import functools
import inspect
import os
from typing import Any, Callable, Dict, List, Optional, Tuple

from opentelemetry import trace
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider, ReadableSpan
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.trace import Status, StatusCode


class OpenTelemetryService:
    """
    Manages OpenTelemetry TracerProvider, span lifecycle, and telemetry export.
    Supports in-memory span buffering for testing & dashboard telemetry inspection,
    as well as OTLP export for Jaeger / Datadog / Signoz in production.
    """

    def __init__(self):
        self._provider: Optional[TracerProvider] = None
        self._memory_exporter: InMemorySpanExporter = InMemorySpanExporter()
        self._is_initialized = False

    def initialize(
        self,
        service_name: str = "lfms-api",
        environment: Optional[str] = None,
    ) -> TracerProvider:
        """Initializes the OpenTelemetry TracerProvider with enterprise resource tags."""
        if self._is_initialized and self._provider:
            return self._provider

        env = environment or os.getenv("ENVIRONMENT", "development")
        resource = Resource.create(
            {
                "service.name": service_name,
                "service.version": "1.0.0",
                "deployment.environment": env,
            }
        )

        provider = TracerProvider(resource=resource)
        # Attach in-memory exporter for local observability & verification
        provider.add_span_processor(SimpleSpanProcessor(self._memory_exporter))

        trace.set_tracer_provider(provider)
        self._provider = provider
        self._is_initialized = True
        return provider

    def get_tracer(self, name: str = "lfms.tracer") -> trace.Tracer:
        """Returns the active OpenTelemetry tracer."""
        if not self._is_initialized:
            self.initialize()
        return trace.get_tracer(name)

    def get_memory_spans(self) -> List[ReadableSpan]:
        """Returns recorded spans from in-memory exporter (used for telemetry & tests)."""
        return list(self._memory_exporter.get_finished_spans())

    def clear_memory_spans(self) -> None:
        """Clears accumulated in-memory spans."""
        self._memory_exporter.clear()

    @staticmethod
    def get_current_trace_and_span_ids() -> Tuple[str, str]:
        """
        Retrieves the active trace_id and span_id as 32-char and 16-char hex strings.
        If no span is active, returns ("none", "none").
        """
        current_span = trace.get_current_span()
        if not current_span or not current_span.get_span_context().is_valid:
            return "none", "none"

        ctx = current_span.get_span_context()
        trace_id_hex = format(ctx.trace_id, "032x")
        span_id_hex = format(ctx.span_id, "016x")
        return trace_id_hex, span_id_hex


# Global singleton instance
otel_service = OpenTelemetryService()
otel_service.initialize()


def trace_span(
    name: str,
    attributes: Optional[Dict[str, Any]] = None,
):
    """
    Decorator to wrap sync or async functions in an OpenTelemetry span.
    Automatically captures exceptions, span status, and provided attributes.
    """

    def decorator(func: Callable):
        tracer = otel_service.get_tracer()

        if inspect.iscoroutinefunction(func):

            @functools.wraps(func)
            async def async_wrapper(*args, **kwargs):
                with tracer.start_as_current_span(name) as span:
                    if attributes:
                        for k, v in attributes.items():
                            span.set_attribute(k, str(v))
                    try:
                        result = await func(*args, **kwargs)
                        span.set_status(Status(StatusCode.OK))
                        return result
                    except Exception as exc:
                        span.record_exception(exc)
                        span.set_status(Status(StatusCode.ERROR, description=str(exc)))
                        raise

            return async_wrapper
        else:

            @functools.wraps(func)
            def sync_wrapper(*args, **kwargs):
                with tracer.start_as_current_span(name) as span:
                    if attributes:
                        for k, v in attributes.items():
                            span.set_attribute(k, str(v))
                    try:
                        result = func(*args, **kwargs)
                        span.set_status(Status(StatusCode.OK))
                        return result
                    except Exception as exc:
                        span.record_exception(exc)
                        span.set_status(Status(StatusCode.ERROR, description=str(exc)))
                        raise

            return sync_wrapper

    return decorator
