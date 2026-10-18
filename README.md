# Rockit

Self-hosted music, video, playlists, radio, lyrics, downloads, and playback sync.
Rockit uses the [app-template](https://github.com/Icass1/app-template) monorepo
structure and reusable database, notification, and object-storage infrastructure.

```text
apps/backend/       FastAPI, SQLAlchemy/PostgreSQL, providers, uv
apps/web/           Next.js web application
apps/mobile/        Expo React Native application
packages/shared/   Shared state, generated DTOs/API client, notification inbox
packages/config/   Shared frontend configuration
```

The root `backend` symlink preserves the existing `backend.*` Python package and
`python -m backend` commands. All backend source lives under `apps/backend`.

## Development

Requires Python 3.12, uv, Node.js 24+, pnpm 11, Docker Compose, and FFmpeg.

```sh
uv sync --project apps/backend --locked
pnpm install --frozen-lockfile
cp .env.example .env
# Replace SESSION_TOKEN_SECRET and configure any provider credentials you need.
docker compose up --build
```

Compose starts PostgreSQL, persistent Silo S3-compatible storage, the backend on
port 8000, web on port 3000, and the YouTube proof-of-origin token provider.
Object data and database data use named volumes; backend scratch space is disposable.

To run applications outside Docker, provide backend settings in `.env` (including
`DB_HOST`, `DB_PASSWORD`, `S3_PRIVATE_ENDPOINT_URL`, and S3 credentials):

```sh
uv run --project apps/backend uvicorn backend.core.main:app --reload
pnpm dev:web
pnpm dev:mobile
uv run --project apps/backend python -m backend import-vocabulary
uv run --project apps/backend python -m backend models
```

`models` does not connect to the database. It regenerates DTOs, the HTTP client,
and vocabulary types. Importing Python modules never rewrites ORM constructors.
Use the generated HTTP client for schema-validated JSON and multipart requests.

The web container reads `BACKEND_URL` for server requests and injects
`NEXT_PUBLIC_BACKEND_URL` into the browser at request time. Mobile uses
`EXPO_PUBLIC_BACKEND_URL`. These addresses must be reachable from the corresponding
client; a phone's `localhost` is the phone itself.

## Storage and database

All durable media, artwork, avatars, staged upload items, and APKs are S3 objects.
Domain tables reference `core.storage_object`. Existing media URLs remain stable
and the backend streams S3 byte ranges, so saved client metadata does not depend on
expiring signed URLs. FFmpeg, image transforms, and ZIP exports use local scratch
files only while processing or caching derived output.

This change does **not** copy existing filesystem content or backfill storage
references. Schema upgrades are additive, and legacy path columns are retained
outside the new ORM contract. Existing installations need their files and references
populated separately before old content is playable.

See [database guidance](apps/backend/DATABASE.md), [storage workflows](docs/STORAGE.md),
[event notifications](apps/backend/docs/notifications.md), and
[backend testing](docs/backend-tests.md).

## Checks

```sh
docker compose -f compose.test.yaml up -d --wait
ROCKIT_TEST_DATABASE_URL=postgresql+asyncpg://postgres:rockit-test@127.0.0.1:15432/postgres \
ROCKIT_TEST_S3_ENDPOINT=http://127.0.0.1:19000 \
uv run --project apps/backend pytest
pnpm check:frontend
pnpm --dir apps/mobile exec tsc --noEmit
pnpm --dir apps/web build
docker compose -f compose.test.yaml down -v
```

Integration tests create and remove disposable PostgreSQL databases and uniquely
named S3 buckets. Never point these test settings at production services. Unit tests
use mocked external services; integration tests use real PostgreSQL and Silo and
mock only external music-provider network calls. CI runs both suites.
