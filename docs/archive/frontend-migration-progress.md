> **Historical reference — not current instructions.** See the [documentation index](../README.md) and [engineering instructions](../../AGENTS.md). Paths to retired files are retained as text.

# Frontend migration progress

Tracking branch: `docs/frontend-platform-architecture`, [PR #189](https://github.com/Icass1/rockit/pull/189).
Starting point: `develop` at `62958ed7bec53bf4843c8ac7b70946b28c36e0f1`.
Target: [desktop and universal mobile architecture](frontend-platform-decision.md).

## Delivery rules

- Commit and push working increments by responsibility; keep this checklist current.
- Current user preference: finish implementation before running the consolidated
  frontend verification and fixing CI. Do not rerun tests for each minor edit.
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

| Stage                              | State                                                 | Deliverable / acceptance                                                                                                                           |
| ---------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0. Baseline and plan               | Complete                                              | Current branch/guidelines reviewed, feature/adapter inventory, reproducible commands.                                                              |
| 1. Shared design system            | Complete                                              | Single token source for web CSS and native values; colors, spacing, radii and typography; no component palettes.                                   |
| 2. Portable application boundaries | Complete                                              | Lifecycle/config/session/storage contracts, browser/native adapters, shared policy outside UI, import-boundary checks.                             |
| 3. Shared presentation             | Complete                                              | Universal primitives/headless bindings actually consumed by desktop and mobile; vocabulary from Excel, accessibility names.                        |
| 4. Universal mobile runtime        | Complete                                              | Expo web/PWA boot with browser session, playback and offline adapters; native Android retains native services.                                     |
| 5. Feature migration and parity    | Implemented; device review pending                    | Home, Library/search, collections, player/queue/lyrics, downloader, settings and existing ancillary routes work on both mobile targets.            |
| 6. Desktop separation              | Complete                                              | Desktop entry excludes mobile shell/integrations; independent build/deployment configuration and documented origin migration.                      |
| 7. Frontend test system            | Complete                                              | Contract-validating fake backend, unit/component tests, browser interaction tests and native component coverage; deterministic assets and timings. |
| 8. Release verification            | Software gates passed; installed-device gates pending | Types/lint, production builds/export, focused tests and CI; precise remaining physical-device/SDK gates, no invented compatibility claims.         |

## Verification strategy

The user explicitly authorized essential frontend tests for this migration.
Complete implementation first, then run the consolidated frontend gate and fix
its failures. Avoid unrelated local backend suites. Tests must validate
observable behavior and real HTTP contracts, including authentication, failures,
cancellation, stale responses, pagination, queue actions, vocabulary and platform
boundaries. Mock data and artwork must not depend on external providers.

WebKit automation represents a browser engine, not an installed iPhone PWA or iOS
background policy. Native component tests and Metro exports do not establish APK
installation, Android services or lock-screen behavior. Record each separately.

Architecture overview, actual component reuse and a Library search flow:
[implemented frontend diagrams](../frontend/architecture.md).

## Current verification and release status

Implementation is ready for review in PR #189. This is not a production cutover.
Next production build and Expo web export pass; the mobile web source-map graph
contains no desktop application or native first-party implementation sources.
Workspace types, both application linters, theme generation and portable boundaries
pass. All required GitHub jobs at the verified implementation commit `44ec20a7` are green:
backend, TypeScript, frontend and the strict aggregate quality check.

The final GitHub fast gate passed 294 tests in approximately 30.9 seconds: 25 Vitest,
8 native Jest and 261 desktop tests, including boundary and fixture type checks.
The earlier consolidated local gate took 44.2 seconds before the last two cases;
a previous GitHub run took 19.4 seconds. Runner/cache load affects these timings.
Two additional workbook-tooling tests passed in 0.159 seconds locally. Timings include
no production builds and should not be represented as application latency.

Seven production Chromium browser flows pass: desktop SSR/session/deep search,
PWA WEB-cookie login, playlist-only one-song playback, bounded pagination and saved
theme/logout, failed search/retry, offline shell/private metadata reload, and mobile
context-menu sharing. Browser acceptance found and corrected bottom navigation
covering pagination, missing web accessibility states and three incomplete fixture
routes. The mock now acknowledges current-media ownership over WebSocket.

Local WebKit installation was denied by environment network policy. No Android SDK
or physical iPhone/Android acceptance was available. The optional manual acceptance
workflow contains production browser and installed APK/emulator checks; it has not
been dispatched. Screen lock, real background playback, interruptions, audio offline
restart and storage pressure still require installed-device acceptance before rollout.
The migration task stays in To Review until the user validates it.

Commands, fixture contracts, timing evidence and platform limits:
[frontend verification](../frontend/testing.md). Production origins, credentials,
backend persistence and existing S3 objects are unchanged. Follow
[deployment](../frontend/deployment.md) to coordinate mobile origin activation with
the desktop shell change.

## Work log (incremental evidence)

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

- Session ownership: the shared user manager now owns the seeded session and
  ignores obsolete updates. Browser volume and playback lifecycles accept portable
  service contracts. Existing session/volume/Media Session regressions pass (45).

- Runtime integration: the independent mobile web export now authenticates against
  the local HTTP fixture using an HttpOnly cookie. PWA login is classified as WEB;
  Android keeps MOBILE secure-store sessions. Native and browser playback/video
  surfaces are selected by platform files. Player services cover popup portals;
  logout cancels socket reconnection and obsolete session work.
- Design rollout: native presenters consume live shared semantic theme values;
  512 repeated spacing/radius/type properties now use common scales. Palette
  values pass the native color processor in dark and light modes. Additional
  controls/messages are translated in all workbook languages without rewriting
  existing formula caches. Remaining literal/feature audits are still open.
- Test foundation: 17 unit/browser-renderer tests and 5 native-renderer tests pass,
  including real generated HTTP contracts, playlist-only song search, invalid
  responses, offline cache failures, stale requests/accounts and socket disposal.
  The first production-export login test passes in Android Chromium emulation.
  Broader browser interaction acceptance is in progress. WebKit download is denied
  by the local network policy; CI must install/run it. No physical iPhone or
  installed Android APK acceptance has been claimed.
- Loading: Expo web uses production route chunks. A measured export reduced the
  uncompressed entry from about 5.5 MB to about 1.1 MB; this is bundle evidence,
  not a production latency claim. Current Next and Expo production builds pass.

- Verification scheduling: following the user's latest instruction, checks and CI
  fixes are deferred to the final consolidated gate. The latest CI checkpoint
  passed backend quality but exposed missing shared-source path mappings in the
  UI package; its compiler configuration is being corrected. Subsequent artwork,
  native cache and feature work has not yet been revalidated.

- Feature integration: mobile now exposes paginated artist catalogs, all five
  personal RockIt lists, Library stations/shared collections, navigation anchors,
  radio search/play/save, friends/requests/activity, media sharing and listening
  sessions through portable account-scoped services also used by desktop.
  Native queue actions retain queue-item IDs, including repeated songs. Related
  rows use the common external-first recommendation and artwork fallback policy.
- Offline integration: mobile browser downloads use IndexedDB audio/artwork records;
  native files retain their existing locations. Metadata is private per session,
  and storage errors remain optional. Local availability checks avoid reading a
  Blob for every row. These increments are committed; their final verification is
  intentionally pending.
- Deployment: added a separate static mobile PWA Docker target and opt-in Compose
  overlay. Desktop no longer mounts its old hidden mobile shell. The rollout guide
  documents authentication origins, installed-PWA storage isolation and required
  device acceptance; no production routing or storage was changed.

- Fast-test constraint: the PR gate contains deterministic unit/component/HTTP
  contract checks only. Production frontend builds, browser-engine acceptance and
  installed Android/emulator checks live in the separate, manually dispatched
  `frontend-platform-acceptance.yml` workflow. Do not make those builds/emulator
  startups mandatory on every PR. Test execution timings must be measured and
  reported separately from dependency installation and compilation.
- Notification parity: extracted the existing notification inbox from the DOM
  toast renderer. Desktop and mobile share account/reset/read/destination policy;
  mobile exposes a translated, bounded notification sheet. Existing desktop toast
  behavior remains in its adapter. Final acceptance has not run yet.

- Final integration: serialized native session writes reject obsolete Set-Cookie
  responses; portable notifications retain desktop toast rendering and add a mobile
  inbox. Mobile sharing now opens from the context menu and uses the same scoped
  sharing policy as desktop, with a virtualized recipient list and workbook text.
- Final browser corrections: reserve scene height for navigation/miniplayer, expose
  selected/disabled states in both renderer accessibility trees, and derive the
  header fade from the active background. Pagination, theme/logout and sharing
  passed against production Expo output. Final required CI status is recorded on
  the PR; installed-device rollout gates remain open.

- Final lifecycle review: a dismissed share sheet checks its account scope before
  clearing the composer, so an old account's close callback cannot clear a new
  account's composer for the same media ID.
