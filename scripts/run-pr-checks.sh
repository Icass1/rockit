#!/usr/bin/env bash

# Run the quality and backend test jobs from .github/workflows/pr-checks.yml.
set -uo pipefail

PROJECT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
    echo "Run this script from inside the Rockit repository." >&2
    exit 2
}
cd "$PROJECT_ROOT"

FAILED=0
LOG_DIR="$(mktemp -d "${TMPDIR:-/tmp}/rockit-pr-checks.XXXXXX")"
POSTGRES_CONTAINER=""

cleanup() {
    if [[ -n "$POSTGRES_CONTAINER" ]]; then
        docker rm -f "$POSTGRES_CONTAINER" >/dev/null 2>&1 || true
    fi
    rm -rf "$LOG_DIR"
}
trap cleanup EXIT

run_check() {
    local label="$1"
    local log_file="$2"
    shift 2

    printf '\n==> %s\n' "$label"
    "$@" 2>&1 | tee "$log_file"
    local status=${PIPESTATUS[0]}
    if (( status != 0 )); then
        echo "FAILED: $label (exit $status)"
        FAILED=1
    else
        echo "PASSED: $label"
    fi
}

echo "Running PR checks from .github/workflows/pr-checks.yml"

run_check "Black formatting" "$LOG_DIR/black.txt" .venv/bin/black --check .
run_check "Prettier formatting" "$LOG_DIR/prettier.txt" \
    pnpm exec prettier --check '**/*.{ts,tsx}'
run_check "Frontend lint" "$LOG_DIR/lint.txt" pnpm --dir frontend lint
run_check "Shared package tests" "$LOG_DIR/shared-tests.txt" \
    pnpm --dir frontend/packages/shared test
run_check "Web app tests" "$LOG_DIR/web-tests.txt" \
    pnpm --dir frontend/apps/web test
run_check "Pyright" "$LOG_DIR/pyright.txt" .venv/bin/pyright

printf '\n==> Working tree cleanliness\n'
if git diff --exit-code HEAD; then
    untracked="$(git ls-files --others --exclude-standard)"
    if [[ -n "$untracked" ]]; then
        echo "FAILED: checks expect no untracked files:"
        printf '%s\n' "$untracked"
        FAILED=1
    else
        echo "PASSED: tracked and untracked files are unchanged"
    fi
else
    echo "FAILED: tracked files differ from HEAD"
    FAILED=1
fi

if [[ -z "${ROCKIT_TEST_DATABASE_URL:-}" ]]; then
    if ! command -v docker >/dev/null 2>&1; then
        echo "Backend tests need PostgreSQL. Set ROCKIT_TEST_DATABASE_URL or install Docker." >&2
        FAILED=1
    elif ! command -v ffmpeg >/dev/null 2>&1; then
        echo "Backend tests require ffmpeg (CI installs it with apt)." >&2
        FAILED=1
    else
        POSTGRES_CONTAINER="rockit-pr-checks-$$"
        printf '\n==> Starting temporary PostgreSQL 17 container\n'
        if docker run --detach --rm --name "$POSTGRES_CONTAINER" \
            -e POSTGRES_USER=postgres \
            -e POSTGRES_PASSWORD=postgres \
            -e POSTGRES_DB=postgres \
            -p 127.0.0.1::5432 postgres:17 >/dev/null; then
            port="$(docker port "$POSTGRES_CONTAINER" 5432/tcp | awk -F: 'NR == 1 {print $NF}')"
            for _ in {1..30}; do
                if docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
                    break
                fi
                sleep 1
            done
            if docker exec "$POSTGRES_CONTAINER" pg_isready -U postgres >/dev/null 2>&1; then
                export ROCKIT_TEST_DATABASE_URL="postgresql+asyncpg://postgres:postgres@127.0.0.1:${port}/postgres"
            else
                echo "PostgreSQL did not become ready." >&2
                FAILED=1
            fi
        else
            echo "Could not start PostgreSQL 17." >&2
            FAILED=1
        fi
    fi
fi

if [[ -n "${ROCKIT_TEST_DATABASE_URL:-}" ]]; then
    run_check "Backend unit and PostgreSQL integration tests" \
        "$LOG_DIR/backend-tests.txt" .venv/bin/python -m pytest -q
fi

if (( FAILED )); then
    printf '\nOne or more PR checks failed; see the command output above.\n'
    exit 1
fi

printf '\nAll PR checks passed.\n'
