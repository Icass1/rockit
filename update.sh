#!/bin/bash

# Iniciar SSH primero

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Build the backend
cd ..
python3 -m backend zod
python3 -m backend import-vocabulary

# Install frontend dependencies
cd frontend
pnpm self-update
pnpm install