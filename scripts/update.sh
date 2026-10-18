#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --project apps/backend --locked
pnpm install --frozen-lockfile
uv run --project apps/backend python -m backend models
uv run --project apps/backend python -m backend import-vocabulary
pnpm --dir apps/web build
