# Rockit — repository guidance

Rockit is a self-hosted music player with a Next.js web app, an Expo React Native
mobile app, and an async FastAPI backend backed by PostgreSQL and S3-compatible
object storage. This is a pnpm/Turborepo workspace; Python dependencies use uv.

## Application instructions

Read the applicable application guide before changing its code. For changes across
applications, read each affected guide:

- [Web application](apps/web/AGENTS.md): Next.js, React, styling, browser playback,
  hydration, and web checks.
- [Backend application](apps/backend/AGENTS.md): API layers, database access,
  providers, error handling, Python conventions, and backend checks.
- [Mobile application](apps/mobile/AGENTS.md): Expo routing, native components,
  playback, platform behavior, and mobile checks.

Application instructions supplement this file within their application directory.

## Workspace layout

- `apps/web/`: Next.js 16, React 19, TypeScript, Tailwind CSS v4.
- `apps/mobile/`: Expo, React Native, TypeScript.
- `apps/backend/`: FastAPI, Pydantic, async SQLAlchemy, asyncpg, providers, CLI,
  and Python tests.
- `packages/shared/`: shared HTTP client, generated DTOs, models, managers, audio,
  authentication, and utilities.
- `packages/config/`: shared frontend configuration.
- `scripts/`: workspace checks, builds, and release tooling.

## Shared rules

- Write code, comments, and identifiers in English.
- Follow existing patterns and keep changes focused on the requested behavior.
- Use configured absolute imports. Do not add production `console.log` or
  `console.warn` statements.
- Keep business logic in managers or backend framework classes, outside UI components.
- Keep credentials out of source control and logs. Use environment configuration.
- Use public UUID identifiers in client APIs; database integer IDs stay internal.
- Validate API responses with the generated Zod schemas and use the existing HTTP
  client. Preserve authentication and session handling on every request.
- Never edit `packages/shared/src/dto/` by hand. Change backend models and regenerate
  from the repository root:

  ```sh
  uv run --project apps/backend python -m apps.backend models
  ```

- Place shared TypeScript types, interfaces, and enums in
  `packages/shared/src/models/`; application-specific ones belong in
  `apps/web/models/` or `apps/mobile/models/`. Component prop types may stay with
  the component. Use the aliases configured in each application's `tsconfig.json`.
- Shared code must remain compatible with web and native runtimes. Keep browser
  APIs and native integrations in their application adapters.
- Use the vocabulary managers for user-facing strings. Add feature-prefixed keys
  to the backend vocabulary and update the relevant languages.

## Development and verification

Use Python 3.12 and the pnpm version pinned in `package.json`. From the root:

```sh
uv sync --project apps/backend --locked --dev
pnpm install --frozen-lockfile
pnpm dev:backend
pnpm dev:web
pnpm dev:mobile
```

Run the checks in each affected application guide. For shared client changes, check
both web and mobile; `pnpm typecheck` checks the frontend workspace. For API changes,
regenerate DTOs and check the backend plus affected clients.

The full workspace gate is `pnpm check`, or run `pnpm check:backend` and
`pnpm check:frontend` separately. These scripts install dependencies; the backend
script regenerates DTOs, and the frontend script formats source files. Review their
resulting diffs before finishing. Report what was checked and any checks that could
not run.

## Instruction maintenance

Keep general rules here and application-specific workflows in the three application
`AGENTS.md` files. Keep these guides self-contained: do not link to or require
reading supplementary documentation. Preserve technical reference material separately
from the agent instruction hierarchy.
