# Docker Compose Guide

> Downloads also run a `pot-provider` sidecar that mints YouTube
> proof-of-origin tokens. See [YOUTUBE_DOWNLOADS.md](YOUTUBE_DOWNLOADS.md).

## Prerequisites

- Docker
- Docker Compose v2+
- .env.production in project root

## Quick Start

### 1. Build base images

```bash
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
| SESSION_TOKEN_SECRET | JWT signing key (at least 32 bytes) | Required |
| ENVIRONMENT        | Dev/Prod             | DEV                   |
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

Optional — external recommendation suggestions (local recommendations need
none of these; see [RECOMMENDATIONS.md](RECOMMENDATIONS.md)):

| Var                                     | Desc                                     | Default                       |
| --------------------------------------- | ---------------------------------------- | ----------------------------- |
| LASTFM_API_KEY                          | Last.fm API key (enables Last.fm)        | - (Last.fm disabled)          |
| RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS | Per-request timeout                      | 5                             |
| RECOMMENDATION_EXTERNAL_CACHE_HOURS     | Reuse successful external results for    | 24                            |
| RECOMMENDATION_PREFETCH_MAX_PENDING     | Shared automatic download budget; 0 disables prefetch | 2                   |

Generate `SESSION_TOKEN_SECRET` with `python3 -c 'import secrets; print(secrets.token_urlsafe(48))'`
and keep the same secret across backend replicas and restarts. Rotating it invalidates
existing JWT sessions. Never commit it to the repository.

New sessions are HS256 JWTs containing `iat` (creation time), `exp` (expiry),
`sub` (user public ID), `jti` (unique token ID), `platform` (`WEB` or `MOBILE`),
and `ip` (login IP, or null when unavailable). The payload is readable, not encrypted.
The IP is login metadata and does not restrict requests to that address.
Tokens remain stored in the database, so logout revokes them. Existing UUID
sessions continue working until their expiry or revocation. Cookie and mobile
response formats remain unchanged; the session ID string now contains the JWT.

## Services

### Postgres

PostgreSQL 16. Data in postgres_data volume.

### Backend

FastAPI on port 8000. Volumes: temp and logs. Persistent files use the configured S3 bucket. Depends: postgres.

### Frontend

Next.js on port 3000 (exposed 9100). Image: rockit-frontend-base + source. Depends: backend.

## Update

### Rebuild after code changes

```bash
docker compose build && docker compose up -d
```

### Rebuild base images (deps changed)

```bash
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

## Persistent object storage

Configure `S3_BUCKET` (required) and `S3_REGION`. For AWS S3, leave endpoint and
explicit credential settings unset to use AWS endpoints and the credential chain.
For compatible services such as MinIO, set `S3_PRIVATE_ENDPOINT_URL`,
`S3_PUBLIC_ENDPOINT_URL`, `S3_ACCESS_KEY`, and `S3_SECRET_KEY`.

Media, images, APKs, derived audio and download backups are S3 objects. The backend
proxies bounded S3 reads for streaming and ranges. The temporary volume is only
scratch space for uploads, conversion and ZIP responses; it can be discarded once
active operations finish. Logs retain their separate log volume.

Before upgrading an existing local-file installation, upload media to the bucket
using their relative keys (`spotify/…`, `spotify_scrapper/…`, `youtubeMusic/…`,
`youtube/…`, and `rockit/…`), and APKs under `builds/<apk_filename>`. Replace any
absolute values in media `path`, `video_path`, and `file_path` columns with the
corresponding S3 keys and ensure each has a matching `core.storage_object` record.
The versioned startup migration backfills `storage_object_id` foreign keys and
removes the legacy path columns atomically. Missing registry entries abort and
roll back the migration so existing paths are not lost. Image records already use
storage-object foreign keys. APK filenames are retained only as display/download
metadata; their storage is resolved through the same foreign key.

Legacy local build-upload sessions expire during migration and must be restarted.
New build-upload sessions reference a storage object and an S3 multipart upload ID;
no assembly file path is stored in the database. Runtime code has no local-file
fallback, and this PR does not move files on deployed systems.
