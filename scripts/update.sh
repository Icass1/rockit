#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"
# Load nvm to make node available for pnpm commands
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm use default >/dev/null 2>&1 || true
# Ensure pnpm global bin is in PATH for this script
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME/bin:$PATH"

echo "=== Starting update process ==="

# =====================
# BACKEND
# =====================
echo "=== Updating Backend ==="

# The pinned requirements only ship wheels for CPython 3.11 - 3.13, so a 3.14
# interpreter (the default on some distros) fails to build pillow / pydantic-core
# / psycopg2 from source. Pick a supported interpreter explicitly.
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
    echo "ERROR: No supported Python found (need 3.11, 3.12 or 3.13)."
    echo "       Install one or set PYTHON_BIN=/path/to/python3.12"
    exit 1
fi

PYTHON_VERSION="$("$PYTHON_BIN" -V 2>&1 | awk '{print $2}')"
echo "=== Using $PYTHON_BIN ($PYTHON_VERSION) ==="

VENV_DIR="$REPO_ROOT/.venv"

# Recreate .venv when it is missing or was built with another interpreter
# (a 3.14 environment cannot install the pinned requirements).
if [ -x "$VENV_DIR/bin/python" ]; then
    VENV_VERSION="$("$VENV_DIR/bin/python" -V 2>&1 | awk '{print $2}')"
else
    VENV_VERSION=""
fi

if [ "$VENV_VERSION" != "$PYTHON_VERSION" ]; then
    if [ -n "$VENV_VERSION" ]; then
        echo "=== Recreating .venv (was $VENV_VERSION, now $PYTHON_VERSION) ==="
        rm -rf "$VENV_DIR"
    else
        echo "=== Creating Python environment (.venv) ==="
    fi
    "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

# Install backend dependencies
# (-m pip avoids relying on console scripts whose shebangs can go stale
#  if the repository folder is moved)
"$VENV_DIR/bin/python" -m pip install -r "$REPO_ROOT/backend/requirements.txt"

# Generate Zod schemas from backend
"$VENV_DIR/bin/python" -m backend models

# Import vocabulary
"$VENV_DIR/bin/python" -m backend import-vocabulary

# =====================
# FRONTEND
# =====================
echo "=== Updating Frontend ==="

pnpm self-update

pnpm install

cd frontend

# Install/update pnpm

# Install all dependencies
pnpm install

# Build web app
pnpm run build

# =====================
# MOBILE (optional)
# =====================
echo "=== Updating Mobile ==="

# Install expo if needed
pnpm add -g expo

# Install mobile dependencies
cd apps/mobile
pnpm install
cd ../..

echo "=== Update complete ==="
