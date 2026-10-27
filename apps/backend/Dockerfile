# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export CURL_CA_BUNDLE=/run/secrets/proxy_ca; fi \
    && apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libpq-dev \
    gcc \
    curl \
    git \
    build-essential \
    libssl-dev \
    libffi-dev \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.12.19 /uv /uvx /bin/
WORKDIR /app
COPY apps/backend/pyproject.toml apps/backend/uv.lock /app/apps/backend/
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export SSL_CERT_FILE=/run/secrets/proxy_ca; fi \
    && uv sync --project apps/backend --locked --no-dev
ENV PATH="/app/apps/backend/.venv/bin:$PATH"

ARG ROCKIT_VERSION=2.0.0
ENV ROCKIT_VERSION=${ROCKIT_VERSION}
LABEL org.opencontainers.image.version=${ROCKIT_VERSION}

ARG ROCKIT_BUILD_REVISION=unknown
ENV ROCKIT_BUILD_REVISION=${ROCKIT_BUILD_REVISION}
LABEL org.opencontainers.image.revision=${ROCKIT_BUILD_REVISION}

WORKDIR /app

COPY apps/backend/ /app/apps/backend/

RUN mkdir -p /app/media /app/images /app/temp /app/logs && chmod -R 755 /app

ENV PYTHONPATH=/app/apps/backend:/app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
