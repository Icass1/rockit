# Rockit backend — agent guidance

These instructions apply to `apps/backend/` in addition to the root `AGENTS.md`.
Use Python 3.12, FastAPI, Pydantic, async SQLAlchemy, asyncpg, and PostgreSQL.

## Architecture

Each business module (`core`, `default`, `spotify`, `youtube`, `rockit`, and other
providers) follows `controllers/ → framework/ → access/`:

| Layer | Responsibility | Restrictions |
| --- | --- | --- |
| `controllers/` | HTTP parsing, Pydantic validation, authentication, framework calls, response mapping | Never call access directly or write SQL |
| `framework/` | Business rules and orchestration | Never call controllers, raise HTTPException, or write SQL |
| `access/` | SQLAlchemy queries and CRUD, returning ORM data through Result | Never call framework or contain business rules |

- Keep all SQL, including SQLAlchemy statements, in `access/` files.
- Keep provider-specific implementation out of `core`; use the provider abstraction
  and registry to integrate businesses.
- Request payloads and JSON response bodies must be Pydantic `BaseModel` subclasses,
  not raw dictionaries, lists, or scalars. Keep models in `requests/` and `responses/`.
- Use full module imports following the existing bootstrap (`core`, `config`,
  `logger`, `result`, and provider module names), without a `backend.` prefix.

## Results, logging, and style

- Framework and access methods return `Result[T]` (or `ResultCode` where required by
  the established interface), rather than raising exceptions or returning raw data.
- Always check `is_ok()` or `is_not_ok()` before calling `.result()`.
- Log with `logger.error(...)` or `logger.warning(...)` before returning a non-OK
  Result or raising an HTTPException. Propagate the error code/message or return a
  sensible fallback; never silently use a failed result.
- HTTPException belongs only at the HTTP boundary (controllers/middleware). Map
  framework errors through the existing Result HTTP-code helpers.
- Use `@safe_async` on access methods for exception conversion and session rollback.
  Keep it outside timing decorators in the callable decorator stack, below
  `@staticmethod`. Do not duplicate its behavior with manual try/except blocks.
- Use async static methods for framework/access operations, typed parameters and
  return values, typed variables, and concise docstrings. Use keyword arguments
  for Python calls.
- Group imports as standard library, dependencies/utilities, Result, access,
  framework, middleware, responses, and requests; let Ruff enforce configured sorting.
- Format changed Python files with Ruff; do not introduce a separate Black workflow.

## Database, authentication, and storage

- Controllers get the request's AsyncSession with
  `DBSessionMiddleware.get_session(request=request)`. Pass it through the layers.
  Never create sessions inside access functions.
- Background work uses the existing database session scope, with its commit/rollback
  behavior. Keep transaction boundaries explicit and avoid detached ORM access.
- Use singular table names and snake_case columns. Follow existing base classes
  and mixins for primary keys, public UUIDs, and added/updated timestamps.
- Integer `id` values are internal. Expose `public_id` through public API models.
- Batch related lookups; never issue one query per item in a loop. Query count
  must not grow with the number of processed items.
- Protect endpoints with the existing auth dependency. Check the Result returned
  by `AuthMiddleware.get_current_user(request=request)` before accessing the user.
  Preserve session-cookie handling and authorization for the resource owner.
- Persistent media, artwork, and builds belong in S3-compatible storage. Use the
  existing storage-object references and services. Local files are temporary
  processing/upload scratch space, never a persistent media fallback.
- Keep environment configuration in the existing Pydantic settings and `.env`
  mechanism; never put secrets into code or logs.

## Providers and API changes

Use the existing `BaseProvider` interface under `core/framework/provider/` and
registry in `core/framework/providers/providers.py`. Implement the relevant search,
media lookup, URL matching, and download operations in the provider business.
Preserve Result contracts, public identifiers, and download/WebSocket events.

For a feature:

1. Define typed request and response models in the relevant business.
2. Add batched access operations and framework orchestration.
3. Add an authenticated controller endpoint with checked Results and error logging.
4. Add meaningful unit or integration coverage for the behavior and error paths.
5. Regenerate shared DTOs from the repository root:
   `uv run --project apps/backend python -m apps.backend models`.
6. Check affected web/mobile consumers after regeneration. Never edit generated DTOs.

## Commands and verification

From the repository root:

```sh
uv sync --project apps/backend --locked --dev
pnpm dev:backend
uv run --project apps/backend python -m apps.backend models
```

From `apps/backend`:

```sh
uv run ruff format <changed-python-files>
uv run pytest -q --ignore=tests/integration/listening_rewards
uv run ruff format --check .
uv run ruff check .
uv run pyright
```

Run focused tests while developing, then the applicable backend gates. The full
root command `pnpm check:backend` syncs dependencies, regenerates DTOs using
`apps/backend/.env.test`, and runs tests, formatting, lint, and type checks.
Create local environment files from the supplied examples when needed.

Unit and direct-controller tests mostly run without external services. Test helpers
record SQL or invoke endpoints directly; they do not emulate real persistence or
HTTP middleware. PostgreSQL persistence tests require `ROCKIT_TEST_DATABASE_URL`
and create/drop disposable databases; only use a dedicated test server. Without
that variable, the optional persistence tests skip. There is no system-test suite
to run. Report skipped tests and unavailable checks explicitly.
