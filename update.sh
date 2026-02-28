#!/bin/bash

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install frontend dependencies
cd ../frontend
pnpm self-update
pnpm install