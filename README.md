# Rockit

Self-hosted music player, using the app-template monorepo layout.

```text
apps/
  backend/       FastAPI, providers, CLI, Python tools and tests
  web/           Next.js application
  mobile/        Expo application
packages/
  shared/        Shared client, generated DTOs and application code
  config/        Shared frontend configuration
scripts/         Workspace checks and frontend build/release tools
```

Use Python 3.12 and the pnpm version in `package.json`. From the repository root:

```sh
uv sync --project apps/backend --locked --dev
pnpm install --frozen-lockfile
cp apps/backend/.env.example apps/backend/.env
pnpm dev:backend
pnpm dev:web
pnpm dev:mobile
```

Set real development credentials and a random session-signing secret in the backend environment file. `ENV_FILE` selects an explicit file; `ROCKIT_ENV_FILE` and the existing environment variable names remain supported. Shared configuration uses the template's Pydantic `Settings`.

Backend startup matches Delices: package path bootstrap, lazy `core` helpers, database initialization, S3 bucket setup, reference/provider seed data, and session readiness. Rockit then starts its download worker; shutdown cancels it and closes WebSockets. Internal imports use `core`, `config`, `logger`, and provider names without a `backend.` prefix.

```sh
uv run --project apps/backend python -m apps.backend models
uv run --project apps/backend python -m apps.backend import-vocabulary
```

The models command uses the same ORM, HTTP client, Zod, and enum generation stages as Delices. Rockit's manually maintained frontend enums are preserved.

### Storage

All persistent music, video, artwork, downloaded media, uploaded media and APK builds use S3-compatible object storage. Configure `S3_BUCKET`, credentials (or the AWS credential chain), and private/public endpoints. Backend streaming reads S3 with bounded buffers and HTTP byte ranges; ZIP exports and media conversion use disposable temporary files. `TEMP_PATH` is only upload assembly and processing scratch space, not persistent file storage. Historical media columns named `path`, `video_path`, or `file_path` contain S3 object keys. Authenticated `/storage-object` routes expose object metadata. Existing local files must be uploaded to S3 and their database values changed to object keys before deploying this version; the application never falls back to a local media directory.

PostgreSQL supports password authentication and the template's IAM/TLS configuration (`DB_IAM_AUTH`, `DB_REGION`, `DB_SSLMODE`, `DB_SSLROOTCERT`).

### Checks

```sh
cp apps/backend/.env.test.example apps/backend/.env.test
pnpm check:backend
pnpm check:frontend
```

PRs targeting `develop` or `main` run the same backend and TypeScript quality gates as app-template. Unit tests and direct-controller integration tests run without external services. `apps/backend/tests/system_tests` is intentionally empty, and Rockit has no system-test workflow. See [backend tests](apps/backend/tests/README.md).

### Containers

Dockerfiles live under each app. `compose.yaml` mounts only temporary processing space and logs; persistent files live in S3; the publish workflow builds the relocated backend and web images.

```sh
docker build -f apps/backend/Dockerfile -t rockit-backend .
docker build -f apps/web/Dockerfile -t rockit-web .
```

Backend maintenance scripts live in `apps/backend/scripts` and can be invoked from the repository root with `uv run --project apps/backend python -m apps.backend.scripts.<module>`.

### Notifications

Rockit uses app-template’s event/subscription notification system, with recipient-scoped personal events and admin subscription controls. Existing history migrates on startup. See [notification documentation](docs/notifications.md).
