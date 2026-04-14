#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "=== Starting update process ==="

# =====================
# BACKEND
# =====================
echo "=== Updating Backend ==="

cd backend

# Install backend dependencies
pip install -r requirements.txt

# Go back to root
cd ..

# Generate Zod schemas from backend
python3 -m backend zod

# Import vocabulary
python3 -m backend import-vocabulary

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
pnpm --filter web build

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
