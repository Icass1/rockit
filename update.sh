#!/bin/bash

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Build the backend
cd ..
python3 -m backend zod

# Install frontend dependencies
cd frontend
pnpm self-update
pnpm install