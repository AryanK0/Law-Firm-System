# ==============================================================================
# Tier-1 Enterprise Multi-Stage Dockerfile for LFMS Backend
# SOC-2 Compliant, Least-Privilege Non-Root Execution, Minimal Attack Surface
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Builder
# ------------------------------------------------------------------------------
FROM python:3.12-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install build-time dependencies needed for C extensions (e.g. cryptography, asyncmy)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    pkg-config \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment to isolate python dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install production dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM python:3.12-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    PORT=8000 \
    ENVIRONMENT=production

# Install minimal runtime dependencies (curl for healthchecks, ca-certificates for TLS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user and group (SOC-2 Compliance Rule)
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /sbin/nologin -d /app appuser

# Copy isolated virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Copy backend application source code
COPY . /app

# Ensure correct file permissions for non-root execution
RUN chown -R appuser:appgroup /app && \
    mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app/uploads

# Expose internal API port
EXPOSE 8000

# Healthcheck to verify FastAPI liveness & readiness
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Drop root privileges
USER appuser

# Start production ASGI server with multi-worker concurrency
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
