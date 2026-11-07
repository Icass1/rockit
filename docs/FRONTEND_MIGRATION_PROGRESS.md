# Frontend migration progress

Tracking branch: `docs/frontend-platform-architecture`, [PR #189](https://github.com/Icass1/rockit/pull/189).
Starting point: `develop` at `62958ed7bec53bf4843c8ac7b70946b28c36e0f1`.
Target: [desktop and universal mobile architecture](FRONTEND_PLATFORM_ARCHITECTURE.md).

## Delivery rules

- Commit working increments by responsibility; keep this checklist current.
- Keep desktop Next, mobile Expo web/PWA and native Android separate at entry points.
- Share portable policies, headless controllers, UI primitives, vocabulary contracts
  and semantic design tokens. Platform APIs belong in injected application adapters.
- Preserve the current mobile PWA as the feature/visual reference and native Android
  integrations. Do not describe an export or mocked test as physical-device validation.
- Do not change provider rules, persistence schema, S3 objects, production origins,
  signing identities or credentials as part of this frontend migration.
- TWA is not the selected native Android architecture. Android browser tests cover
  the web runtime a TWA would host; APK/native integration checks remain separate.

## Stages

| Stage | State | Deliverable / acceptance |
| --- | --- | --- |
| 0. Baseline and plan | Complete | Current branch/guidelines reviewed, feature/adapter inventory, reproducible commands. |
| 1. Shared design system | In progress | Single token source for web CSS and native values; colors, spacing, radii and typography; no component palettes. |
| 2. Portable application boundaries | In progress | Lifecycle/config/session/storage contracts, browser/native adapters, shared policy outside UI, import-boundary checks. |
| 3. Shared presentation | In progress | Universal primitives/headless bindings actually consumed by desktop and mobile; vocabulary from Excel, accessibility names. |
| 4. Universal mobile runtime | In progress | Expo web/PWA boot with browser session, playback and offline adapters; native Android retains native services. |
| 5. Feature migration and parity | Pending | Home, Library/search, collections, player/queue/lyrics, downloader, settings and existing ancillary routes work on both mobile targets. |
| 6. Desktop separation | Pending | Desktop entry excludes mobile shell/integrations; independent build/deployment configuration and documented origin migration. |
| 7. Frontend test system | In progress | Contract-validating fake backend, unit/component tests, browser interaction tests and native component coverage; deterministic assets and timings. |
| 8. Release verification | Pending | Types/lint, production builds/export, focused tests and CI; precise remaining physical-device/SDK gates, no invented compatibility claims. |

## Verification strategy

The user explicitly authorized essential frontend tests for this migration.
Run changed behavior tests while implementing, then the frontend gate once the
stages are integrated. Avoid unrelated local backend suites. Tests must validate
observable behavior and real HTTP contracts, including authentication, failures,
cancellation, stale responses, pagination, queue actions, vocabulary and platform
boundaries. Mock data and artwork must not depend on external providers.

WebKit automation represents a browser engine, not an installed iPhone PWA or iOS
background policy. Native component tests and Metro exports do not establish APK
installation, Android services or lock-screen behavior. Record each separately.

## Work log

- Planning: confirmed PR #189 remains open and the checkout is clean. Refreshed
  `develop`; no newer commits exist at the starting revision. Read root/web/mobile
  instructions and backend guidance for vocabulary work.
- Design tokens: introduced `@rockit/theme` as the common source for the existing
  dark/light palette and spacing/radius/type/motion scales. Web CSS is generated;
  native compatibility names consume the same values. Theme preference parsing is
  shared. Existing semantic-theme regressions (3), theme typecheck and generated
  artifact check pass. Component literals and live native theme propagation are
  tracked in the next presentation increment.
- Portable runtime: extracted vocabulary completion/fallback into shared code;
  removed the native player's inline English dictionary. Shared playback now
  receives resume events through an adapter hook, with browser visibility and
  native AppState implementations. Web/mobile TypeScript passed; 63 directed
  transition/Media Session regressions passed without changing audio policies.
- Browser services: moved the existing audio/transition engine, Media Session,
  authenticated browser HTTP and IndexedDB/offline helpers into
  `@rockit/platform-browser`. Desktop compatibility imports forward to that
  implementation. Browser services import no Next or desktop components; shared
  domain package no longer declares Next. Web/native/package typechecks pass.
- Shared presentation: `@rockit/ui` provides actual common artwork/identity and a
  scoped theme, consumed by desktop Library rows and native media rows. Explicit
  browser/native renderer exports keep platform selection out of presenters.
  Next SSR registers universal styles before hydration. Next production build,
  web/native/UI/browser typechecks, 4 Vitest web/core tests and 2 native component
  tests pass. The existing directed browser regressions still pass (76 including
  SSR loader checks). Frontend test reporters record timings; these are test
  execution times, not measured production latency.
- Platform qualification: native filesystem, secure session, media and orientation
  modules now have `.native` entry points. Browser HTTP/session/socket entries
  use browser cookies without exposing HttpOnly tokens; web updates no longer
  inspect native APK versions. Native typecheck and 3 new transport tests pass.
  Browser playback/storage boot and logout orchestration remain in progress.
