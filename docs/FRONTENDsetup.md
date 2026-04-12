# RockIt Setup

## Install

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

## Install node deps

```bash
cd frontend
pnpm i
```

## Setup .env

```bash
cp example.env .env
```

Fill all settings.

## Start servers

Two servers needed:

Backend (root): `fastapi dev backend/main.py`

Frontend (frontend/): `pnpm run dev`

---

## Docker

### Base images

```bash
docker build -f Dockerfile.backend.base -t rockit-backend-base .
docker build -f Dockerfile.frontend.base -t rockit-frontend-base .
```

### Compose

```bash
docker compose up -d --build
```

---

## Color palette

`from-[#ee1086] to-[#fb6467]`
