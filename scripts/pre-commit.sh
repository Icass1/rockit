#!/bin/bash

# Rockit Pre-commit Hook
# Runs format and lint checks before commit

set -e
# Without this, `cmd | tee log` always reports tee's exit code (0), so
# `if cmd | tee log; then` "passes" even when cmd itself failed.
set -o pipefail

echo "🧹 Running pre-commit checks..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Get project root
PROJECT_ROOT="$(git rev-parse --show-toplevel)"
cd "$PROJECT_ROOT"

# Track errors
ERRORS=0

# Locate the Python environment. pyrightconfig.json points at "./venv", which
# only resolves when pyright runs from backend/; update.sh creates ".venv" at
# the root instead. Passing --pythonpath explicitly avoids depending on either,
# otherwise pyright silently analyses without the installed packages and floods
# the output with false "type is unknown" errors.
if [ -x "$PROJECT_ROOT/backend/venv/bin/python" ]; then
    PYTHON_BIN="$PROJECT_ROOT/backend/venv/bin/python"
    PY_TOOLS="$PROJECT_ROOT/backend/venv/bin"
elif [ -x "$PROJECT_ROOT/.venv/bin/python" ]; then
    PYTHON_BIN="$PROJECT_ROOT/.venv/bin/python"
    PY_TOOLS="$PROJECT_ROOT/.venv/bin"
else
    echo -e "${RED}❌ No Python venv found (expected backend/venv or .venv). Run scripts/update.sh first.${NC}"
    exit 1
fi

# ─────────────────────────────────────────────
# Frontend (pnpm lint)
# ─────────────────────────────────────────────
echo -e "\n${YELLOW}📦 Frontend lint (pnpm)...${NC}"
cd "$PROJECT_ROOT/frontend"
if pnpm lint 2>&1 | tee /tmp/frontend-lint.log; then
    echo -e "${GREEN}✅ Frontend lint passed${NC}"
else
    ERRORS=$((ERRORS + 1))
    echo -e "${RED}❌ Frontend lint failed${NC}"
fi

# ─────────────────────────────────────────────
# Frontend (prettier)
# ─────────────────────────────────────────────
echo -e "\n${YELLOW}💅 Frontend format (prettier)...${NC}"
cd "$PROJECT_ROOT/frontend"
if pnpm exec prettier --check . 2>&1 | tee /tmp/frontend-prettier.log; then
    echo -e "${GREEN}✅ Frontend format passed${NC}"
else
    ERRORS=$((ERRORS + 1))
    echo -e "${RED}❌ Frontend format failed${NC}"
fi

# ─────────────────────────────────────────────
# Backend (pyright)
# ─────────────────────────────────────────────
echo -e "\n${YELLOW}🐍 Backend typecheck (pyright)...${NC}"
cd "$PROJECT_ROOT"
if "$PY_TOOLS/pyright" --pythonpath "$PYTHON_BIN" 2>&1 | tee /tmp/backend-lint.log; then
    echo -e "${GREEN}✅ Backend typecheck passed${NC}"
else
    ERRORS=$((ERRORS + 1))
    echo -e "${RED}❌ Backend typecheck failed${NC}"
fi

# ─────────────────────────────────────────────
# Backend (black)
# ─────────────────────────────────────────────
echo -e "\n${YELLOW}🐍 Backend format (black)...${NC}"
cd "$PROJECT_ROOT"
if "$PY_TOOLS/black" --check backend 2>&1 | tee /tmp/backend-black.log; then
    echo -e "${GREEN}✅ Backend format passed${NC}"
else
    ERRORS=$((ERRORS + 1))
    echo -e "${RED}❌ Backend format failed${NC}"
fi

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────
echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All pre-commit checks passed!${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS check(s) failed${NC}"
    echo ""
    echo "Check the logs above for details:"
    echo "  - Frontend lint:     /tmp/frontend-lint.log"
    echo "  - Frontend prettier: /tmp/frontend-prettier.log"
    echo "  - Backend pyright:   /tmp/backend-lint.log"
    echo "  - Backend black:     /tmp/backend-black.log"
    exit 1
fi
