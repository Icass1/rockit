# Rockit development setup

Run commands from the repository root. Install Python 3.12, uv, Node.js 24+, pnpm 11,
Docker Compose and FFmpeg.

```sh
uv sync --project apps/backend --locked
pnpm install --frozen-lockfile
cp .env.example .env
```

Set a `SESSION_TOKEN_SECRET` of at least 32 characters. Configure optional Spotify,
YouTube and downloader settings for the providers you use.

```sh
docker compose up --build
```

The stack provides PostgreSQL, Silo, the backend at `http://localhost:8000`, and the
web app at `http://localhost:3000`. PostgreSQL and Silo data persist in named volumes.

For local development, run the supporting services with Compose and configure `.env`
with host-reachable PostgreSQL and S3 URLs, then start each app in its own terminal:

```sh
uv run --project apps/backend uvicorn backend.core.main:app --reload
pnpm dev:web
pnpm dev:mobile
```

The web app lives in `apps/web`, Expo in `apps/mobile`, and shared client logic in
`packages/shared`. Regenerate contracts after changing backend request/response models:

```sh
uv run --project apps/backend python -m backend models
pnpm check:frontend
```

See the [README](../README.md), [database guide](../apps/backend/DATABASE.md),
[S3 workflow guide](STORAGE.md), and [test instructions](backend-tests.md) for
configuration, migrations and integration checks. Existing local files are not backfilled
by this change.
