#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --project apps/backend --locked --dev
echo "Select apps/backend/.venv/bin/python in your editor."
