# Frontend verification

## Fast pull request gate

Use Node 24 and the pnpm version in `package.json`. With dependencies installed:

```sh
pnpm test:frontend
```

This runs import/palette/vocabulary boundaries, fixture TypeScript checks, Vitest
portable/browser component contracts, Jest native component/adapter contracts and
the existing desktop Node tests. It does not build Next or Expo, install browsers,
start an emulator or contact external music providers. The local HTTP/WebSocket
fixture binds an ephemeral loopback port and closes after its tests.

Workspace types, web/mobile lint, generated theme consistency and workbook-tooling
checks also run in CI. Backend, TypeScript and frontend jobs report directly to
GitHub. Check the workflow and repository ruleset for the required status names.
The fast gate does not include production builds or emulator boots.

To target affected behavior during development:

```sh
pnpm exec vitest run tests/frontend/unit/httpContract.test.ts
pnpm test:frontend:native
pnpm --filter @app/web test
pnpm typecheck
```

Finish a coherent change before checking it. Repeat checks when failures or later
changes justify them, rather than running every suite after each small edit.
JSON timing/results artifacts are written under `.test-build/frontend/` and
uploaded by CI.

## Contract fixture

`tests/frontend/fixtures/backend.ts` supplies explicit authenticated routes,
generated request/response schemas, local SVG artwork and an authored silent WAV
with byte-range handling. It reads real workbook translations through the standard
library exporter; it does not require backend Python dependencies, PostgreSQL, S3
or provider credentials. An unknown route returns 501 instead of generic success.

Data includes an album, a playlist-only song and enough synthetic songs for bounded
pagination. Tests cover browser versus native session handling, malformed successes,
HTTP/authentication failures, accents, single-song queues, stale work/account reset,
offline-cache failures, socket disposal, semantic themes and accessible controls.
The fixture records calls/timings, supports injected failures and validates selected
WebSocket messages. Browser tests reject unhandled routes and protocol errors.

These tests verify client behavior against current generated contracts. They cannot
establish backend SQL/business-rule correctness or production provider availability.

## Optional production/browser acceptance

```sh
pnpm exec playwright install chromium webkit
pnpm test:frontend:build
pnpm test:frontend:browser
```

The build script creates real Next and Expo production outputs against the isolated
fixture, prepares the PWA shell and checks its source-map dependency graph. Playwright
starts the fixture and both production servers itself. No external backend is used.
Browser projects cover desktop Chromium and mobile browser emulation. Emulation
checks the browser runtime; it does not establish native Android behavior or
installed iPhone PWA compatibility. Use `PLAYWRIGHT_CHROMIUM_EXECUTABLE` when
running an installed Chromium outside Playwright's browser cache.

The manual frontend platform acceptance workflow keeps production builds and
Android emulator checks outside ordinary PR CI. A workflow definition is not a
successful run: record the tested commit, target and result with release evidence.

## Device release gate

Before switching mobile production traffic, verify an installed iPhone PWA and
Android APK: offline audio/restart, screen lock and queue progression, media controls,
interruptions/resume, downloads, storage-pressure handling and upgrade/logout.
Native component tests do not run Android services, and WebKit automation is not
an installed iPhone PWA. No physical-device result is inferred from either.
See [deployment and origin migration](deployment.md) before rollout.
