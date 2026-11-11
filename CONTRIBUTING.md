# Contributing to RockIt!

Contributions to the RockIt! web app, mobile app, backend, tests, and documentation are welcome.

## Getting started

1. Fork and clone the repository, or create a branch if you have repository access.
2. Follow the [local development setup](README.md#local-development).
3. Read the [repository conventions](AGENTS.md) and the guide for each application you will change: [web](apps/web/AGENTS.md), [backend](apps/backend/AGENTS.md), or [mobile](apps/mobile/AGENTS.md).
4. Keep your change focused. For substantial features or architectural changes, open an issue first to discuss the problem and proposed approach.

## Reporting issues

For a bug report, include the affected app, steps to reproduce, expected and actual behavior, and relevant browser, device, or server details. Include sanitized logs or screenshots when useful. For feature requests, describe the use case and the behavior you would like.

Remove credentials, session cookies, tokens, and personal data from reports and logs. For suspected vulnerabilities, follow [SECURITY.md](SECURITY.md) and use a private reporting channel before sharing technical details.

## Development conventions

- Write code, comments, and identifiers in English, and follow existing patterns.
- Keep business logic in managers or backend framework classes rather than UI components or controllers.
- Use configured absolute imports and the shared HTTP client. Validate API responses with generated Zod schemas and preserve authentication and session handling.
- Expose public UUIDs in client APIs; keep database integer IDs internal.
- Put shared TypeScript types in `packages/shared/src/models/` and app-specific types in the app's `models/` directory. Keep browser and native integrations in their respective app adapters.
- Use the vocabulary Context in web clients and the server vocabulary resolver in Server Components; native uses its vocabulary manager/provider. Add feature-prefixed keys to `Vocabulary.xlsx`, translate every supported language, and regenerate the vocabulary artifacts.
- Use semantic theme tokens and existing `components/ui/` primitives rather than feature-local colors or competing base components.
- Store persistent media in S3-compatible storage. Local media files are temporary processing artifacts.
- Keep secrets in environment configuration and avoid production `console.log` or `console.warn` statements.

Backend code follows `controllers/ → framework/ → access/`: controllers handle HTTP, framework classes implement business rules, and access classes own database queries. Follow the backend guide's `Result`, session, and error-handling conventions.

### API contracts

Do not edit `packages/shared/src/dto/` by hand. Change the backend request or response models, then regenerate from the repository root:

```sh
uv run --project apps/backend python -m apps.backend models
```

Include generated changes in your pull request and check both web and mobile consumers.

## Checks before submitting

Run checks appropriate to your change. Documentation-only edits should be reviewed for accurate commands, working relative links, and whitespace errors with `git diff --check`.

### Web

```sh
pnpm --filter @app/web typecheck
pnpm --filter @app/web lint
```

Run `pnpm build:web` when changing routing, server rendering, configuration, or bundling. Check affected interactions at desktop and mobile sizes, including keyboard access and loading, error, and empty states.

### Mobile

```sh
pnpm --filter @app/mobile typecheck
pnpm --filter @app/mobile lint
```

Verify affected flows on Android and iOS when available. Playback changes should include backgrounding, interruptions, lock-screen controls, and track transitions. Mention any unavailable device checks in the pull request.

For shared TypeScript changes, run `pnpm typecheck` to check the frontend workspace.

### Fast frontend tests

Run `pnpm test:frontend` for deterministic portable, browser/native component and
HTTP contract checks. The ordinary PR gate runs in seconds and excludes production
builds and emulators. Use the separate manual platform acceptance workflow for
those checks. See [frontend verification](docs/frontend/testing.md) for targeted
commands, fixture contracts, timings and device acceptance limits.

### Backend

From `apps/backend`:

```sh
uv run pytest -q --ignore=tests/integration/listening_rewards
uv run ruff format --check .
uv run ruff check .
uv run pyright
```

Format changed Python files with `uv run ruff format <changed-python-files>` before checking. Add meaningful tests for new behavior and error paths.

Most unit and direct-controller integration tests run without external services. Optional PostgreSQL persistence tests require `ROCKIT_TEST_DATABASE_URL` and create and drop disposable databases; use a dedicated test server. Without that variable, those tests skip. There is no system-test suite.

### Full workspace gates

From the repository root:

```sh
cp apps/backend/.env.test.example apps/backend/.env.test
pnpm check:backend
pnpm check:frontend
# Or:
pnpm check
```

These scripts install dependencies. The backend script regenerates DTOs; the frontend script formats source files. Review the resulting diff and include only changes relevant to your contribution. Pull requests targeting `develop` or `main` run backend and frontend quality checks in CI.

## Pull requests

- Use a descriptive title and explain the problem and resulting behavior.
- Keep changes focused and update documentation when setup or behavior changes.
- Describe how you verified the change, including skipped or unavailable checks.
- Include screenshots or recordings for visible UI changes when useful.
- Call out API, configuration, database, or storage changes and any migration steps.
- Ensure checks pass and respond to review feedback.

Contributions are made under the project's [MIT License](LICENSE). Preserve existing copyright and license notices. Third-party code and assets must retain their applicable notices and license terms.
