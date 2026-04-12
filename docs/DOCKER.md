# Docker Compose Guide

## Prerequisites

- Docker
- Docker Compose v2+
- .env.production in project root

## Quick Start

### 1. Build base images

```bash
docker build -t rockit-backend-base:latest -f Dockerfile.backend.base .
docker build -t rockit-frontend-base:latest -f Dockerfile.frontend.base .
```

### 2. Build services

```bash
docker compose build
```

### 3. Start

```bash
docker compose up -d
```

### 4. Stop

```bash
docker compose down
```

## Env Vars

Set in .env.production:

| Var                | Desc                 | Default               |
| ------------------ | -------------------- | --------------------- |
| BACKEND_URL        | Backend URL          | http://localhost:8000 |
| SESSION_DURATION   | Session expiry (sec) | 86400                 |
| ENVIRONMENT        | Dev/Prod             | DEV                   |
| MEDIA_PATH         | Media files          | /app/media            |
| IMAGES_PATH        | Images               | /app/images           |
| TEMP_PATH          | Temp files           | /app/temp             |
| LOGS_PATH          | Logs                 | /app/logs             |
| LOG_DUMP_LEVEL     | Log level            | info                  |
| CONSOLE_DUMP_LEVEL | Console              | info                  |
| DOWNLOAD_THREADS   | Threads              | 4                     |
| CLIENT_ID          | Spotify ID           | -                     |
| CLIENT_SECRET      | Spotify secret       | -                     |
| YOUTUBE_API_KEY    | YouTube key          | -                     |
| DB_HOST            | Postgres             | postgres              |
| DB_USER            | DB user              | rockit                |
| DB_PASSWORD        | DB pass              | rockitpassword        |
| DB_PORT            | Port                 | 5432                  |
| DB_NAME            | DB name              | rockit                |

## Services

### Postgres

PostgreSQL 16. Data in postgres_data volume.

### Backend

FastAPI on port 8000. Image: rockit-backend-base + source. Volumes: media, images, temp, logs. Depends: postgres.

### Frontend

Next.js on port 3000 (exposed 9100). Image: rockit-frontend-base + source. Depends: backend.

## Update

### Rebuild after code changes

```bash
docker compose build && docker compose up -d
```

### Rebuild base images (deps changed)

```bash
docker build -t rockit-backend-base:latest -f Dockerfile.backend.base .
docker build -t rockit-frontend-base:latest -f Dockerfile.frontend.base .
docker compose build --no-cache && docker compose up -d
```

### Pull latest + rebuild

```bash
git pull
docker compose build && docker compose up -d
```

## Troubleshooting

### Logs

```bash
docker compose logs -f          # all
docker compose logs -f backend # specific
```

### Restart

```bash
docker compose restart backend
docker compose restart frontend
```

### Clean start (removes volumes)

```bash
docker compose down -v && docker compose up -d
```

### Rebuild single

```bash
docker compose build backend && docker compose up -d backend
```

## Commands

| Cmd                                         | Desc         |
| ------------------------------------------- | ------------ |
| docker compose up -d                        | Start        |
| docker compose down                         | Stop         |
| docker compose restart                      | Restart      |
| docker compose logs -f                      | Follow logs  |
| docker compose ps                           | Containers   |
| docker compose exec backend sh              | Shell        |
| docker compose exec postgres psql -U rockit | Postgres CLI |
