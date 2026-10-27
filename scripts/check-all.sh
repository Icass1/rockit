#!/usr/bin/env bash

set -Eeuo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

bash scripts/check-backend.sh
bash scripts/check-frontend.sh
