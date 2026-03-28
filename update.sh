#!/bin/bash

set -e

echo "=== Starting update process ==="

# Go to project root
cd "$(dirname "$0")"

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

cd frontend

# Install/update pnpm
pnpm self-update

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
