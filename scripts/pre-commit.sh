#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
uv run --project apps/backend ruff format --check .
uv run --project apps/backend ruff check .
(cd apps/backend && uv run pyright && uv run pytest -q)
pnpm exec prettier --check "**/*.{ts,tsx,html}"
pnpm typecheck
pnpm --filter @app/web lint
