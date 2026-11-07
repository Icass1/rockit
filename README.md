# Rockit

A self-hosted music player with a personal library, web and mobile apps, and social listening.

Rockit combines a Next.js web app, an Expo mobile app, and a FastAPI backend. PostgreSQL stores application data, while S3-compatible object storage holds media, artwork, and app builds.

## Features

- Personal music libraries, playlists, search, and playback queues.
- Provider integrations, including Spotify and YouTube, with media download processing.
- Web and native mobile playback with shared application logic and WebSocket synchronization.
- Friends, listening activity, shared music, and listening sessions.
- S3-compatible persistent storage, including support for MinIO.

## Technology

| Area | Stack |
| --- | --- |
| Web | Next.js 16, React 19, TypeScript, Tailwind CSS v4 |
| Mobile | Expo, React Native, TypeScript |
| Backend | FastAPI, Pydantic, async SQLAlchemy, asyncpg |
| Data and storage | PostgreSQL, S3-compatible object storage |
| Workspace | pnpm, Turborepo, uv |

## Local development

Run the following commands from the repository root unless stated otherwise.

### Prerequisites

- Node.js 24 and pnpm **11.0.8**, as pinned in `package.json`.
- Python **3.12** and uv.
- A running PostgreSQL instance with a development database and credentials.
- An S3-compatible service with credentials and a bucket available to Rockit.
- FFmpeg on `PATH` for media processing. Native Python dependencies may also require a compiler and PostgreSQL development headers.
- For native mobile development, the Android SDK or Xcode on macOS, as appropriate.

### Install and configure

```sh
pnpm install --frozen-lockfile
uv sync --project apps/backend --locked --dev
cp apps/backend/.env.example apps/backend/.env
cp apps/web/.env.example apps/web/.env.local
# Optional: configure the mobile app.
cp apps/mobile/.env.example apps/mobile/.env
```

Edit the copied files before starting the apps. Example credentials are placeholders.

| File | Configuration |
| --- | --- |
| `apps/backend/.env` | Set `DB_*` for your development database, `S3_*` for object storage, and a random `SESSION_TOKEN_SECRET` of at least 32 characters. Set `CORS_URLS=http://localhost:3000`, session domains to `localhost`, and suitable session durations in seconds. Configure provider credentials for the integrations you use. |
| `apps/web/.env.local` | Set `NEXT_PUBLIC_BACKEND_URL=http://localhost:8000` and `NEXT_PUBLIC_S3_PUBLIC_ENDPOINT_URL` to the storage endpoint reachable by the browser. |
| `apps/mobile/.env` | Set `EXPO_PUBLIC_BACKEND_URL` to a backend address reachable by the device or emulator and `EXPO_PUBLIC_PLATFORM` for the target platform. A physical device cannot use your computer's `localhost`. |

The backend accepts `ENV_FILE` to select an explicit configuration file; `ROCKIT_ENV_FILE` is also supported. Keep local environment files and credentials out of version control.

Media URLs point directly to the public S3 endpoint. Configure storage access and browser CORS for your deployment. Persistent media belongs in object storage; `TEMP_PATH` is temporary processing space.

### Start the applications

Run each application in a separate terminal:

```sh
pnpm dev:backend
```

```sh
pnpm dev:web
```

```sh
# Optional: start the Expo development server.
pnpm dev:mobile
```

The backend listens on port **8000** and the web app on port **3000** by default. Open [the web app](http://localhost:3000) or [the API documentation](http://localhost:8000/docs). Native mobile integrations may require a development build; see [the mobile guide](apps/mobile/AGENTS.md).

## Repository layout

```text
apps/
  backend/       FastAPI API, providers, CLI, and Python tests
  web/           Next.js web application
  mobile/        Expo mobile application
packages/
  shared/        HTTP client, generated DTOs, models, and shared managers
  config/        Shared frontend configuration
scripts/         Quality checks, builds, and release tooling
docs/            Technical references and feature documentation
```

## Verification

```sh
cp apps/backend/.env.test.example apps/backend/.env.test
pnpm check:backend
pnpm check:frontend
# Or run both gates:
pnpm check
```

The backend gate installs dependencies, regenerates DTOs, and runs tests, formatting, lint, and type checks. The frontend gate installs dependencies, formats source files, checks workspace types, and runs web lint. Review any generated or formatting changes afterward.

See [CONTRIBUTING.md](CONTRIBUTING.md) for focused checks and contribution conventions.

## Containers and deployment

Build the backend and web images from the repository root:

```sh
docker build -f apps/backend/Dockerfile -t rockit-backend .
docker build -f apps/web/Dockerfile -t rockit-web .
```

The checked-in `compose.yaml` is a deployment-specific starting point. It expects a root `.env.production`, an existing external PostgreSQL Docker network, and separately provisioned PostgreSQL and S3 storage. Review its network names, ports, and frontend build arguments, including the backend URL, before using it for your own host. Public frontend configuration is embedded at build time.

The Compose stack includes a YouTube proof-of-origin token provider. Backend volumes hold temporary files and logs; persistent media remains in S3.

## Documentation and contributions

- [Contributing](CONTRIBUTING.md)
- [Documentation index](docs/README.md)
- [Repository conventions](AGENTS.md)
- Application guides: [web](apps/web/AGENTS.md), [backend](apps/backend/AGENTS.md), [mobile](apps/mobile/AGENTS.md)

## License

Rockit is licensed under the [MIT License](LICENSE).
