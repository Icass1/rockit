# Docker Compose Guide

This guide covers how to run and update the Rockit Docker Compose system.

## Prerequisites

- Docker
- Docker Compose v2+
- `.env.production` file in the project root

## Quick Start

### 1. Build Base Images

Build the base images first (these contain dependencies that rarely change):

```bash
docker build -t rockit-backend-base:latest -f Dockerfile.backend.base .
docker build -t rockit-frontend-base:latest -f Dockerfile.frontend.base .
```

### 2. Build Services

```bash
docker compose build
```

### 3. Start Services

```bash
docker compose up -d
```

### 4. Stop Services

```bash
docker compose down
```

## Environment Variables

The following environment variables are required. Set them in `.env.production`:

| Variable | Description | Default |
|----------|-------------|---------|
| `BACKEND_URL` | Backend URL | `http://localhost:8000` |
| `SESSION_DURATION` | Session expiry (seconds) | `86400` |
| `ENVIRONMENT` | Dev or Prod | `DEV` |
| `MEDIA_PATH` | Path for media files | `/app/media` |
| `IMAGES_PATH` | Path for images | `/app/images` |
| `TEMP_PATH` | Path for temp files | `/app/temp` |
| `LOGS_PATH` | Path for logs | `/app/logs` |
| `LOG_DUMP_LEVEL` | Log level | `info` |
| `CONSOLE_DUMP_LEVEL` | Console log level | `info` |
| `DOWNLOAD_THREADS` | Download threads | `4` |
| `CLIENT_ID` | Spotify client ID | - |
| `CLIENT_SECRET` | Spotify client secret | - |
| `YOUTUBE_API_KEY` | YouTube API key | - |
| `DB_HOST` | Database host | `postgres` |
| `DB_USER` | Database user | `rockit` |
| `DB_PASSWORD` | Database password | `rockitpassword` |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `rockit` |

## Services

### Postgres

PostgreSQL 16 database. Data persists in `postgres_data` volume.

### Backend

FastAPI application running on port 8000.

- Image: `rockit-backend-base` + source code
- Volumes: media, images, temp, logs
- Depends on: postgres

### Frontend

Next.js 16 application running on port 3000 (exposed as 9100).

- Image: `rockit-frontend-base` + source code
- Depends on: backend
- Access at: http://localhost:9100

## Updating Images

### Rebuild After Code Changes

```bash
docker compose build
docker compose up -d
```

### Rebuild Base Images (dependencies changed)

```bash
# Rebuild base images
docker build -t rockit-backend-base:latest -f Dockerfile.backend.base .
docker build -t rockit-frontend-base:latest -f Dockerfile.frontend.base .

# Rebuild services
docker compose build --no-cache
docker compose up -d
```

### Pull Latest Code and Rebuild

```bash
# Pull latest code
git pull

# Rebuild services
docker compose build
docker compose up -d
```

## Troubleshooting

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
```

### Restart a Service

```bash
docker compose restart backend
docker compose restart frontend
```

### Clean Start (removes volumes)

```bash
docker compose down -v
docker compose up -d
```

### Rebuild Single Service

```bash
docker compose build backend
docker compose up -d backend
```

## Docker Commands Reference

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start all services in background |
| `docker compose down` | Stop all services |
| `docker compose restart` | Restart all services |
| `docker compose logs -f` | Follow logs |
| `docker compose ps` | Show running containers |
| `docker compose exec backend sh` | Shell into backend container |
| `docker compose exec postgres psql -U rockit` | Connect to postgres |
