#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --project apps/backend --locked --dev
pnpm install --frozen-lockfile
uv run --project apps/backend python -m apps.backend models
uv run --project apps/backend python -m apps.backend import-vocabulary
pnpm build:web
