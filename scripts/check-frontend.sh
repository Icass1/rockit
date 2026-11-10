#!/usr/bin/env bash

set -Eeuo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

pnpm install --frozen-lockfile
pnpm exec prettier -w "**/*.{ts,tsx,html}"
pnpm typecheck
pnpm check:theme
pnpm check:frontend:boundaries
pnpm --filter @app/mobile lint

cd "$repo_root/apps/web"
pnpm lint
