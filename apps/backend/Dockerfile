FROM node:22-bookworm-slim AS javascript
FROM ghcr.io/astral-sh/uv:0.8.22-python3.12-bookworm-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 UV_LINK_MODE=copy
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=javascript /usr/local/bin/node /usr/local/bin/node
WORKDIR /app
COPY apps/backend/pyproject.toml apps/backend/uv.lock ./apps/backend/
RUN --mount=type=secret,id=proxy_ca \
    if [ -f /run/secrets/proxy_ca ]; then export SSL_CERT_FILE=/run/secrets/proxy_ca; fi; \
    uv sync --project apps/backend --locked --no-dev
COPY apps/backend ./apps/backend
COPY Vocabulary.xlsx ./
ENV PYTHONPATH=/app/apps
RUN useradd --uid 10001 --create-home app && mkdir -p /app/logs /tmp/rockit && chown -R app:app /app /tmp/rockit
USER app
ARG ROCKIT_BUILD_REVISION=unknown
ENV ROCKIT_BUILD_REVISION=${ROCKIT_BUILD_REVISION}
LABEL org.opencontainers.image.revision=${ROCKIT_BUILD_REVISION}
EXPOSE 8000
CMD ["uv", "run", "--project", "apps/backend", "--no-sync", "uvicorn", "backend.core.main:app", "--host", "0.0.0.0", "--port", "8000"]
