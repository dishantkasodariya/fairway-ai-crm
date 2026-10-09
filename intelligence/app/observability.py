"""
Observability: structured logging + OpenTelemetry traces.

Traces cover every HTTP request (FastAPI), every DB query (SQLAlchemy), and
every outbound HTTP call (requests — Places, Serper, page fetches, Bedrock/
OpenAI/Groq's HTTP-based providers), so a single discovery run or agent job
shows up as one trace with every search/fetch/DB hit as a child span. Jobs
run via FastAPI BackgroundTasks have no parent HTTP request by the time they
execute, so job runners open their own root span explicitly (see jobs/*.py).

Exports to whatever OTEL_EXPORTER_OTLP_ENDPOINT points at — defaults to the
Jaeger instance already running locally (http://localhost:16686 for the UI).
Set OTEL_ENABLED=false to turn tracing off entirely (logging still works).
"""

import logging

from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from opentelemetry.sdk.resources import SERVICE_NAME, Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

from app.config import get_settings

_tracer: trace.Tracer | None = None


def configure_logging() -> None:
    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level.upper(),
        format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
    )
    # These are noisy at INFO and not useful day-to-day; keep them at WARNING.
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("apscheduler").setLevel(logging.WARNING)


def configure_tracing(app, engine) -> None:
    """Call once at startup, after the FastAPI app and DB engine exist."""
    settings = get_settings()
    if not settings.otel_enabled:
        return

    provider = TracerProvider(resource=Resource.create({SERVICE_NAME: settings.otel_service_name}))
    exporter = OTLPSpanExporter(endpoint=f"{settings.otel_exporter_otlp_endpoint}/v1/traces")
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    FastAPIInstrumentor.instrument_app(app)
    SQLAlchemyInstrumentor().instrument(engine=engine)
    RequestsInstrumentor().instrument()

    global _tracer
    _tracer = trace.get_tracer(settings.otel_service_name)


def get_tracer() -> trace.Tracer:
    """Safe to call even if tracing is disabled/not yet configured — returns a
    no-op tracer in that case (OpenTelemetry's default API behavior)."""
    return _tracer or trace.get_tracer(__name__)
