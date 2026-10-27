#!/usr/bin/env bash
set -euo pipefail
uv sync --project apps/backend --locked --dev
ENV_FILE=apps/backend/.env.test uv run --project apps/backend python -m apps.backend models
(cd apps/backend && uv run pytest -q --ignore=tests/integration/listening_rewards --ignore=tests/integration/storage_references && uv run ruff format --check . && uv run ruff check . && uv run pyright)
