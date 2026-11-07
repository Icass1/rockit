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

The final functional commit `44ec20a7` passed this command in approximately
30.9 seconds in GitHub Actions: 25 Vitest tests, 8 native Jest tests and 261 desktop
tests (294 total), including boundary and fixture type checks. A previous GitHub
run took 19.4 seconds and the consolidated local gate took 44.2 seconds before
the last two cases. Runner/cache load affects timings; these are not promises for
dependency installation, runner provisioning or production latency.

The frontend job has a two-minute limit. Workspace types, web/mobile lint, generated
theme consistency and two fast Python workbook-tooling checks also run in CI.
`PR quality checks` requires backend, TypeScript and frontend jobs to succeed.
There are no production builds or emulator boots in that required gate.

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
Browser projects cover desktop Chromium, Android Chromium emulation and iOS WebKit
emulation. The seven local Chromium flows cover login/cookies, deep Library search,
one-song playback, pagination/theme/logout, failed-search retry, offline shell and
cached metadata reload, and contextual sharing with accented text.

For an installed Chromium outside Playwright's cache, set
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` to that executable. WebKit download was unavailable
under the local environment's network policy; no local WebKit pass is claimed.
Android browser emulation also represents the browser runtime a TWA would host; it
is not proof of Android native capabilities or a separately signed TWA package.

The `Frontend platform acceptance (manual)` workflow accepts a branch/commit and
keeps these heavier steps outside ordinary PR CI. Its separate Android job builds
and installs the real preview APK in an emulator, exercises login/Library/search/
single-song playback and checks native media state after backgrounding. It uses
an isolated local fixture and does not deploy or change production signing.
This workflow has been authored, not executed as part of the local verification.

## Device release gate

Before switching mobile production traffic, verify an installed iPhone PWA and
Android APK: offline audio/restart, screen lock and queue progression, media controls,
interruptions/resume, downloads, storage-pressure handling and upgrade/logout.
Native component tests do not run Android services, and WebKit automation is not
an installed iPhone PWA. No physical-device result is inferred from either.
See [deployment and origin migration](FRONTEND_DEPLOYMENT.md) before rollout.
