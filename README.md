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

Backend startup matches Delices: package path bootstrap, lazy `core` helpers, database initialization, optional S3 bucket setup, reference/provider seed data, and session readiness. Rockit then starts its download worker; shutdown cancels it and closes WebSockets. Internal imports use `core`, `config`, `logger`, and provider names without a `backend.` prefix.

```sh
uv run --project apps/backend python -m apps.backend models
uv run --project apps/backend python -m apps.backend import-vocabulary
```

The models command uses the same ORM, HTTP client, Zod, and enum generation stages as Delices. Rockit's manually maintained frontend enums are preserved.

### Storage

Existing music, video, images, downloads, uploads and Range streaming stay on local disk with their existing paths. The template's S3-compatible object-storage layer is available alongside them: object records, uploads/downloads/deletes, separate private/public endpoints, AWS credential-chain support, and presigned URLs. Configure `S3_BUCKET` and the optional S3 settings to enable bucket initialization. Authenticated `/storage-object` routes expose object metadata. Nothing moves existing media to S3.

PostgreSQL supports password authentication and the template's IAM/TLS configuration (`DB_IAM_AUTH`, `DB_REGION`, `DB_SSLMODE`, `DB_SSLROOTCERT`).

### Checks

```sh
cp apps/backend/.env.test.example apps/backend/.env.test
pnpm check:backend
pnpm check:frontend
```

PRs targeting `develop` or `main` run the same backend and TypeScript quality gates as app-template. Unit tests and direct-controller integration tests run without external services. `apps/backend/tests/system_tests` is intentionally empty, and Rockit has no system-test workflow. See [backend tests](apps/backend/tests/README.md).

### Containers

Dockerfiles live under each app. `compose.yaml` preserves Rockit's deployment configuration and local volumes; the publish workflow builds the relocated backend and web images.

```sh
docker build -f apps/backend/Dockerfile -t rockit-backend .
docker build -f apps/web/Dockerfile -t rockit-web .
```

Backend maintenance scripts live in `apps/backend/scripts` and can be invoked from the repository root with `uv run --project apps/backend python -m apps.backend.scripts.<module>`.

### Notifications

Rockit uses app-template’s event/subscription notification system, with recipient-scoped personal events and admin subscription controls. Existing history migrates on startup. See [notification documentation](docs/notifications.md).
