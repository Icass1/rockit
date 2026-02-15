# RockIt!

## Installation

```bash
git clone https://github.com/Icass1/rockit.git
cd rockit
```

## Setup venv

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

## Install node dependencies

```bash
cd frontend
pnpm i
```

## Setup .env file

Create .env file from tamplate.

```bash
cp example.env .env
```

Then, fill all the settings.

## Start server

RockIt needs two separate servers to run, frontend and backend.

- Backend (in the root folder)
    ```bash
    fastapi dev backend/main.py
    ```
- Frontend (in the frontend folder)
    ```bash
    pnpm run dev
    ```

# Docker

## Docker base images

```bash
# Backend base image image
docker build -f Dockerfile.backend.base -t rockit-backend-base .
# Frontend base image image
docker build -f Dockerfile.frontend.base -t rockit-frontend-base .
```

## Docker compose

Build Docker Images and start containers

```bash
docker compose up -d --build
```

## Paleta oficial:

from-[#ee1086] to-[#fb6467]
