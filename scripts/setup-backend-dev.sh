#!/usr/bin/env bash
# Install the backend and its development types into the interpreter used by
# Pyright/Pylance. This does not start services, import vocabulary or run tests.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VENV_DIR="$REPO_ROOT/venv"

if [ ! -x "$VENV_DIR/bin/python" ]; then
    PYTHON_BIN="${PYTHON_BIN:-}"
    if [ -z "$PYTHON_BIN" ]; then
        for candidate in python3.12 python3.13 python3.11; do
            if command -v "$candidate" >/dev/null 2>&1; then
                PYTHON_BIN="$candidate"
                break
            fi
        done
    fi
    if [ -z "$PYTHON_BIN" ]; then
        echo "Install Python 3.11–3.13 or set PYTHON_BIN to a supported interpreter." >&2
        exit 1
    fi
    "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/python" -m pip install -r "$REPO_ROOT/backend/requirements-dev.txt"
echo "Backend development dependencies installed in $VENV_DIR."
echo "Select $VENV_DIR/bin/python in your editor."
