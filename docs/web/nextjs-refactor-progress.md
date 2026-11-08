# Next.js web refactor progress

Branch: `refactor/nextjs-web`. Started 4 November 2026. Architecture and acceptance criteria: [refactor plan](nextjs-refactor-plan.md). Scope inventory: [423 source files](nextjs-refactor-inventory.md).

Update this file immediately after completing each implementation step. A completed substep does not mean its parent stage or the whole refactor is complete. Record checks, limitations, and the next concrete action. Preserve playback, native compatibility, authorization, and offline data throughout migration.

Verify, record and commit each completed refactor step separately. At the user's
request, run the complete web test suite before each further step commit and fix
any failures; do not accept baseline test failures as a passing gate.

## Checklist

- [x] Create the requested branch and preserve the plan/inventory.
- [ ] 0. Baseline and contracts: reproducible production/browser measurements and parity checklist.
- [ ] 1. Reliable server boundary.
    - [x] Preserve HTTP success/failure independently of status; test invalid 200 responses.
    - [x] Separate typed server/browser transports and request-local session access.
    - [x] Move resource routes off browser managers and process-wide private caches.
    - [x] Verify status handling, web/mobile/shared types, lint, tests and production build; record the two reproduced baseline test failures below.
- [ ] 2. Vocabulary and safe server delivery.
    - [x] Generate English fallback from the authoritative workbook.
    - [x] Resolve locale/dictionary on the server and provide synchronous React Context.
    - [x] Migrate web vocabulary consumers and auth screens; preserve runtime notifications/language changes.
    - [ ] Migrate worker/private-page caching without breaking offline playback.
    - [ ] Verify first-render text, locale changes, account isolation and offline entry.
- [ ] 3. Semantic theme and reusable UI primitives.
    - [x] Introduce a single global style entry and semantic Tailwind tokens.
    - [x] Centralize the interface palette in theme.css and replace component palette utilities with semantic roles.
    - [x] Remove inline/CSS/chart/SVG/PiP color literals and enforce central palette references.
    - [ ] Add persisted user theme settings and complete light/system visual verification.
    - [ ] Add shared buttons, fields, choices, ranges and overlays; migrate initial consumers.
    - [x] Shared Popup surface/behavior and ui-folder menu/slider relocation.
    - [ ] Add accessibility/visual verification and architecture/color enforcement.
- [ ] 4. Persistent runtime and shell.
    - [x] Remove import-time startup; seed session and connect without initial backoff.
    - [x] Scope playback service consumers and own native media-session/gesture setup and cleanup in the persistent provider.
    - [x] Own socket connections in the persistent provider; cancel stale sends and reconnects.
    - [x] Own bookmark subscriptions in the shell and reject stale account/media work.
    - [x] Own navigation-pin subscriptions/wake listeners and migrate pin consumers to runtime Context.
    - [x] Own notification subscriptions, scope header consumers and guard stale inbox/navigation work.
    - [x] Own friend subscriptions, scope social consumers and guard stale reads/mutations.
    - [x] Own sharing subscriptions, scope inbox/composer consumers and guard stale playback/mutations.
    - [x] Own listen-together subscriptions/heartbeat, scope its consumers and guard stale consent/playback/restoration.
    - [x] Own saved-volume restoration, subscriptions and debounced writes in the playback provider.
    - [x] Own user queue-type subscriptions, scope logout consumers and guard session reads/logout/cache ordering.
    - [x] Scope user profile/preferences/language mutations and reset their active settings consumers across account changes.
    - [x] Own web player visibility, autoplay-retry gestures and iOS ended polling in the playback provider.
    - [x] Own shared player socket/visibility synchronization and reject stale acknowledgements across cleanup/account changes.
    - [x] Own queue subscriptions, cancel autoplay timers and guard stale refresh/page/recommendation work.
    - [x] Guard explicit collection/recommendation selection, list insertion and delayed collection cache opening.
    - [x] Invalidate pending shared-player source loads and playback continuations; recover interrupted loads on shell restart.
    - [x] Scope web preloads/bounds retries, transition timers, video restoration and native play promises.
    - [ ] Add lifecycle-owned/injected runtime services and migrate consumers.
    - [ ] Verify navigation, Strict Mode, reconnects, queue ownership and account reset.
- [ ] 5. Home: server initial data, local recommendations, isolated external discovery, small client islands.
    - [x] Fetch primary data on the server and stream external discovery separately.
    - [x] Verify real production HTTP HTML, request deduplication and delayed-provider streaming with isolated fixtures.
    - [ ] Finish splitting presentation from playback islands and live invalidation.
- [ ] 6. Library: additive paginated APIs, generated DTOs, bounded UI, full-library playback/search/bulk/offline semantics.
    - [x] Fetch the initial library and featured top albums on the server; remove mount requests and library skeletons.
    - [ ] Add paginated APIs/query ownership and verify complete playback, search, bulk and offline parity.
- [ ] 7. Collections/artists: server headers/data, correct errors, preserved virtual tree, independent provider content.
- [ ] 8. Downloads/social/search/radio: hydrated query ownership, URL state, event bridge and lazy panels/map.
- [ ] 9. Settings/stats/admin: server data, reusable forms/ranges, timezone handling and lazy uploads/charts/tabs.
- [ ] 10. UI consolidation: all remaining controls/styles, media cards/rows, menus and PiP.
- [ ] 11. Cleanup: remove compatibility facades/registry/obsolete paths, tighten CI, run complete gates and save before/after measurements.

## Completed work

### Branch and tracking — 4 November 2026

Created `refactor/nextjs-web` from the current checkout, retaining the existing untracked plan and inventory. Added this checklist before implementation. The previous planning turn's baseline web TypeScript check passed; it was not a browser performance baseline.

### HTTP result correctness — 4 November 2026

`HttpResult` now stores the actual success discriminator instead of deriving it from HTTP status. Invalid JSON and invalid DTOs returned with status 200 remain failures while retaining the source status for diagnostics. The generated client already constructs those failures correctly, so no generated file or generator-template change was required. Four transport-boundary regression tests passed (invalid JSON, invalid schema, valid session, expired session).

### Vocabulary instruction — 4 November 2026

Added the explicit no-hardcoded-user-facing-text rule to both web and mobile
AGENTS.md. It covers labels, placeholders, messages, tooltips and accessible names;
missing keys must be added to the authoritative workbook in all supported languages.

### Typed server boundary — 4 November 2026

Added a server-only typed transport that forwards request-local session cookies and preserves all HeadersInit forms with uncached private requests. Browser transport no longer imports Next server APIs. Album, playlist, featured-list and artist routes use request-scoped loaders; removed the process-wide album response cache. Auth/session checks share a request-local loader. Resource classification preserves upstream errors instead of turning them into 404s; the error boundary no longer relies on serialized server Error class identity. Web TypeScript and request-cookie isolation/status tests passed.

### First-render vocabulary and auth forms — 4 November 2026

Generated the complete English JSON fallback from Vocabulary.xlsx through the backend vocabulary generator. Added quality-aware server locale resolution and a synchronous VocabularyProvider; migrated 107 web files from vocabulary atoms to Context. Runtime notifications retain a compatibility adapter; explicit language changes update the preference cookie and refresh server text. Login/register now use native forms and shared fields/buttons/checkboxes, without mount-time vocabulary requests or global Enter listeners. Added translated route errors/offline text in English, Spanish and French and regenerated vocabulary artifacts. First-render SSR, missing-key fallback and locale-negotiation tests passed; the workbook/fallback consistency test passed. Live browser language switching remains to be exercised.

### Semantic UI foundations and common popups — 4 November 2026

Added semantic Tailwind roles, a single global CSS entry, Button/IconButton, Input, Field, Checkbox, Dialog and Popup primitives. Moved both ContextMenu and PopupMenu families and Slider into components/ui; updated consumers/tests. Media menu action policies remain in the media feature. Context menus, submenus, popup menus and header popovers share Popup's surface, positioning, nested-layer handling, keyboard navigation, mobile Tab containment, outside dismissal and focus restoration. Removed duplicate header popup behavior and the unused positioning class. Five common-popup behavior tests and the three existing context-menu gesture tests passed. Browser/touch/assistive-technology verification and remaining custom overlays are pending.

### Server Home and production SSR smoke check — 4 November 2026

Home stats and local recommendations now load concurrently on the server. Removed the Home mount-fetch hook. External discovery is a separate streamed Server Component; its failure does not block local content. Date-sensitive greeting receives a consistent hydration snapshot. Primary cards/sections no longer hide their server markup while awaiting image callbacks or reveal effects. The user menu consumes a server session snapshot, and the runtime starts explicitly after mounting with an immediate first socket attempt.

Added a reproducible production smoke command (`pnpm --filter @app/web test:ssr`, after `pnpm build:web`). It launches ephemeral localhost frontend/backend fixture servers, checks translated Spanish HTML and real song content, asserts one server request per initial resource, verifies core HTML arrives before a deliberately delayed external provider, and checks the native login form. It passed. This fixture proves rendering/streaming behavior; its timings are not production performance benchmarks. The initial direct fixture check saw core content at 672 ms with discovery delayed by two seconds; the reusable smoke check also passed on a fresh process.

### Private document cache and offline entry migration — 4 November 2026

Protected document/RSC responses now use network-only worker delivery. Previous `rockit-pages` entries are deleted on worker activation and authentication cleanup. Added an explicit offline entry that validates cached session/vocabulary before mounting the existing library/playback UI, rather than replaying a protected RSC response. Native audio/range handling is preserved. Production worker generation passed; real browser offline reload, upgrade, multi-tab behavior and playback still require verification, so the offline acceptance step remains unchecked.

### Reusable UI location and final increment checks — 4 November 2026

Both menu families live under `components/ui/ContextMenu` and `components/ui/PopupMenu`. Generic popovers, loading indicators, the toaster and sliders also live under `components/ui/` alongside the new controls and shared Popup. All imports were updated; no imports of their former locations remain. Added an explicit web AGENTS.md rule requiring reusable base elements in this directory, while feature action policies stay with their features. Closed popups no longer subscribe to browser events; context-menu open callbacks run only when the menu opens. The 17 focused popup, gesture, HTTP and server-rendering tests passed after these changes. Additional lint checks for the new server/API/i18n modules passed, as did the final production build, backend type check and repeated production SSR smoke check.

### Listen-together WebSocket state — 4 November 2026

Removed all web session-list GET calls, including the 15-second fallback and the
Friends mount refresh. The backend sends typed participant-specific session
snapshots on connection/reconnection and after committed changes. The web runtime
registers its handler before connecting and validates snapshots with generated
Zod schemas. Guest consent, queue restoration, host heartbeats, local stale-host
pause and session expiry remain in place. Newer snapshots supersede playback
that is still loading.

Checks: six focused web tests and twelve backend social/WebSocket tests passed.
Web, mobile and shared TypeScript checks, web lint (including changed runtime
files), backend Ruff checks and Pyright passed. Regenerated DTOs and reviewed the
diff. The full web suite passed 88 of 90 tests, with the same two previously
documented adaptive-transition failures. The full backend suite passed 562 tests
and failed the existing search vocabulary test, which references the removed
`components/ContextMenu/Content.tsx` path. Browser playback and real connection-loss
verification remain pending; social and runtime acceptance stages stay unchecked.

### Download preference in the session — 4 November 2026

Moved `autoAddToLibrary` into the authenticated session response and removed both
`/downloader/settings` routes. Saving now uses `/user/download-settings` with a
dedicated request model. The checkbox consumes session Context without a mount
fetch; the user manager updates shared session state and the offline cache after
a successful save. Regenerated the shared DTOs and HTTP client.

Checks: all eleven new direct-controller tests passed, covering both preference
values, session serialization, authentication, validation, failed saves and the
removed routes. Web, mobile and shared TypeScript checks, web lint, backend Ruff
format/lint and Pyright passed. The full backend suite passed 577 tests with the
previously documented stale search vocabulary path failure; the full web suite
passed 91 of 93 tests with the two documented adaptive-transition failures.
The production web build passed. The production SSR smoke check failed twice with
`ECONNRESET` on its initial request to the local frontend fixture. Browser
interaction and native device verification remain pending.

### Server-rendered current playback and queue Context — 4 November 2026

The application Server Component now fetches the authenticated, bounded queue
page centered on current playback through the typed server transport. QueueProvider
supplies that request snapshot and a stable reference to the existing queue
manager. Footer subscriptions use the request snapshot for server rendering and
hydration, then follow the manager's existing Nanostores. The footer has no
mounted-state branch: the current track, artwork, artist, album and transport
controls are present in the initial HTML. Empty-state text is used only when the
server queue has no current media. Key-valued translation placeholders still use
the workbook fallback.

The provider seeds the existing runtime on the client. Queue startup reuses that
page, including its offset and total, without a second queue GET or overwriting
changes made after seeding. Pagination, queue refreshes and WebSocket playback
synchronization retain their existing ownership. The runtime compatibility
singleton remains for other consumers; this is an incremental Context migration.

Checks: all ten focused server-rendering/bootstrap tests passed, covering current
song details, radio, empty queues, snapshot isolation, duplicate initialization,
no repeated startup queue request, pagination and subsequent queue clearing.
Web, mobile and shared TypeScript checks, web lint, changed hook/server/manager
module lint and formatting passed. The production build and HTTP SSR smoke passed;
the latter checks the current track and controls in server HTML, isolated empty
queue rendering and one initial server queue request. The full web suite passed
94 of 96 tests with the same two documented adaptive-transition failures. Real
browser hydration, playback and viewport verification remain pending.

### Scoped playback services and native lifecycle — 4 November 2026

Added a persistent PlaybackProvider with stable, injectable playback service
references. Footer controls, bookmark markers, keyboard controls, the web mobile
player hooks, and session/queue providers consume those references while retaining
the existing managers and narrow Nanostores subscriptions. No playback or queue
state has a second owner. Standalone consumers retain a compatibility fallback.

The provider owns a side-effect-free PlaybackLifecycle and an injected
MediaSessionManager. Native action handlers, metadata reporting, visibility
recovery, iOS keepalives and first-gesture listeners now have balanced setup and
cleanup. Repeated initialization is idempotent; cleanup permits Strict Mode
setup/cleanup/setup without pausing the transport. Ordinary session updates retain
the active integration. Logout immediately clears native controls and pauses the
player. Generation and context-identity checks prevent stale keepalive recovery
from restarting audio or closing a replacement context after cleanup. Removed
native media-session startup from the compatibility singleton and the duplicated
shell storage-persistence request; the existing runtime persistence request stays.

Checks: all 27 focused media-session/lifecycle/server-rendering tests passed,
including service injection and isolation from the compatibility runtime. Web
TypeScript, web lint, explicit lint of changed runtime/manager/model/test modules,
formatting, production build and production HTTP SSR smoke passed. The full web
suite passed 102 of 104 tests with the same two documented adaptive-transition
failures. The pinned pnpm 11.0.8 ran with temporary PNPM_HOME/XDG_DATA_HOME paths
because the default shim attempted to write outside the workspace.

Chromium fixture checks passed at 1440×900, 390×844 and 844×390, with no browser
errors. They exercised the actual provider and player/keyboard hooks in React
Strict Mode, stable parent rerenders, one-time gesture activation, keyboard
commands, logout and unmount cleanup, using injected fixture services. These are
not full application navigation, real audio or iOS device acceptance. The socket,
legacy manager listeners, complete account replacement, popups, language switching
and offline upgrade/reload checks remain pending; runtime acceptance stays open.

### Shell-owned WebSocket lifecycle — 4 November 2026

Added an injectable RuntimeProvider and ConnectionLifecycle around the persistent
shell. The provider seeds the server session before startup; the lifecycle waits
for existing manager handlers to initialize before enabling the socket. Startup
completed after unmount cannot connect. Strict Mode setup/cleanup/setup retains
one session subscription and one active connection. Session metadata updates and
shell rerenders retain the connection; username changes and logout close it and
invalidate pending sends. Removed socket startup from the compatibility runtime.

WebSocketManager no longer returns a process-wide instance. Its explicit
start/stop lifecycle gates legacy init/reconnect/send calls. Disconnect detaches
native callbacks, cancels retry and connection-wait timers, clears playback
acknowledgement state and releases suspended sends. Connection-generation and
socket-identity guards reject late callbacks and prevent queued sends crossing
session boundaries. The first attempt is immediate; failures use cancellable
backoff, including asynchronous transport closes. Opening/reopening a socket
replays the latest local playback selection once or requests authoritative state.
Presence updates now have one owner in FriendManager instead of being applied
twice by the transport and feature handler.

Checks: all 22 focused connection, request-race and listen-together tests passed,
including 13 new connection/lifecycle tests. Web typecheck and lint, explicit lint
of changed runtime/manager/model/test modules, formatting, production build and
production HTTP SSR smoke passed. The full web suite passed 115 of 117 tests,
with the same two documented adaptive-transition failures.

Chromium checks passed at 1440×900, 390×844 and 844×390 using the actual provider
and WebSocketManager with injected startup/session services and a local WebSocket
server. They verified session seeding before startup, deferred handler readiness,
Strict Mode cleanup, stable shell rerenders, real server-side connection loss and
recovery, playback-state resync, account connection replacement and logout cleanup,
with no browser errors. These fixture checks do not establish full application
account reset, legacy manager cleanup, real audio playback or offline acceptance.
The pinned pnpm ran with temporary PNPM_HOME/XDG_DATA_HOME paths as before.

### Shell-owned bookmark lifecycle — 4 November 2026

Moved bookmark startup out of the compatibility runtime and into the persistent
shell after legacy startup completes. BookmarkManager now accepts injected state
owners and has balanced, idempotent start/stop methods. It subscribes to session
identity and current media, clears bookmarks and the editor on account/track
changes, and releases both subscriptions on unmount. Metadata-only session updates
retain the current request. Lifecycle/request generations reject late reads and
create/update/delete responses after cleanup, account replacement or track changes,
including a return to the same account or track. Stale mutations cannot display
notifications in the replacement context. Playback and bookmark state keep their
existing owners.

Checks: all 21 focused connection/bookmark/request-race tests passed. Web typecheck
and lint, explicit lint of changed manager/runtime/model/test modules and formatting
passed. The full web suite passed 120 of 122 tests with the same two documented
adaptive-transition failures. Production build and HTTP SSR smoke passed, including
translated first-render content, the current queue footer, streaming and initial
request deduplication.

Chromium fixture checks passed at 1440×900, 390×844 and 844×390 using the actual
RuntimeProvider, BookmarkManager and WebSocketManager with injected services.
They verified Strict Mode, stable shell rerenders without duplicate bookmark
requests, stale account-response rejection, logout clearing, listener cleanup and
real socket reconnection, with no browser errors. These fixtures do not establish
full application navigation, real audio or offline acceptance.

### Shell-owned navigation pins and runtime Context — 4 November 2026

NavigationPinsManager now accepts injected services and starts/stops with the
persistent shell instead of the one-time compatibility bootstrap. It watches the
session identity through one subscription, with balanced focus, online and
visibility listeners. Cleanup clears shortcuts, pending operations and status,
invalidates in-flight responses and cancels queued writes before they reach HTTP.
Restarting the same account loads fresh state; responses/finalizers from the old
lifecycle cannot overwrite it or release its pending operations. Session metadata
changes retain state, and concurrent wake events still coalesce into one request.

RuntimeProvider now exposes stable services through Context. The navigation
shortcuts and pin/unpin menu actions use the scoped navigation-pin manager while
retaining narrow Nanostores subscriptions and the existing compatibility fallback
for consumers outside the shell. No pin state or mutation policy moved into UI.

Checks: all 47 focused pin, connection, bookmark/request-race and server-rendering
tests passed, including cleanup/restart, deferred startup, queued-write cancellation,
direct account replacement and isolated server Context delivery without startup.
Web typecheck and lint, explicit lint of changed manager/runtime/model/test modules
and formatting passed. The full web suite passed 126 of 128 tests with the same
two documented adaptive-transition failures. Production build and HTTP SSR smoke
passed, including translated first-render content, the current queue footer,
streaming and initial request deduplication. As in the preceding increments, the
pinned pnpm used temporary PNPM_HOME/XDG_DATA_HOME directories.

Chromium fixture checks passed at 1440×900, 390×844 and 844×390 with the actual
RuntimeProvider, NavigationPinsManager, navigation list and pin/unpin menu action,
alongside the bookmark/socket integrations. They exercised injected consumer
services, pin/unpin interaction, stable rerenders, wake-event coalescing, stale
account responses, logout and unmount listener cleanup, with no browser errors.
These fixtures do not establish complete application navigation, real audio,
assistive-technology, iOS or offline acceptance; parent runtime stages stay open.

### Shell-owned notifications and scoped inbox consumers — 4 November 2026

NotificationManager now accepts injected session/socket services and has balanced,
idempotent start/stop methods. The shell starts notification subscriptions before
legacy asynchronous initialization completes, so opening the inbox during startup
works, and registers the handler before the socket can connect. Cleanup releases
both subscriptions, clears the inbox/counts/errors/page/filter, dismisses feedback
and invalidates pending work. UserManager no longer drives notification identity.
Session metadata updates retain state; account changes and logout reset it without
fetching inbox history until requested.

The header badge and notification menu use runtime Context with the existing
narrow Nanostores subscriptions. Generation guards reject stale page reads,
mark-read results and destination lookups after cleanup, account replacement or a
return to the same account. A destination cannot navigate if the account changes
during the mark-read refresh. Mutation transport failures are handled locally.
Toast tap/drag/cancel handlers now belong to each rendered toast through React;
there are no global document listeners to leak, and feedback remains interactive
on auth pages outside the shell.

Checks: all 58 focused notification, connection, bookmark/request-race, pin and
server-rendering tests passed, including 11 new notification lifecycle tests.
Web typecheck and lint, explicit lint of changed manager/runtime/model/test modules,
formatting, production build and production HTTP SSR smoke passed. The full web
suite passed 137 of 139 tests with the same two documented adaptive-transition
failures. The existing crane GIF precache warning remains. The pinned pnpm used
temporary PNPM_HOME/XDG_DATA_HOME directories as in previous increments.

Chromium fixture checks passed at 1440×900, 390×844 and 844×390 using the actual
RuntimeProvider, NotificationManager, WebSocketManager, header badge, notification
menu and toast UI with injected services and a local socket server. They verified
Strict Mode, lazy inbox fetching, opening during deferred startup, stable rerenders,
pagination, account reset, cancellation of navigation during an old mark-read
refresh, unmount subscription cleanup and toast taps inside/outside the shell,
with no browser errors. These fixtures do not establish full application account
reset, real playback, iOS, assistive-technology or offline acceptance; parent
runtime stages remain open.

### Shell-owned friends and scoped social consumers — 4 November 2026

FriendManager now accepts injected session/socket/feedback services and starts and
stops with the persistent shell before asynchronous legacy startup completes.
Cleanup balances the session and three socket subscriptions and clears friends,
blocked users, requests, activity, search results, errors and loading state.
Session metadata retains work; identity changes, logout and same-account lifecycle
restarts invalidate every read and mutation, including leaderboard responses and
follow-up refreshes. Stale failures cannot show feedback in a replacement context.
Socket snapshots supersede pending list reads; completed mutations invalidate
older reads that could restore removed friends or pending requests. Presence can
clear a previous now-playing value.

Friend consumers use runtime Context with narrow store subscriptions. A lifecycle
scope resets local social form, search, confirmation and leaderboard state across
account transitions. Short search queries invalidate pending results. Sharing and
listen-together still use their existing owners and are separate pending migrations.

Checks: all 23 focused friend/connection tests passed, including nine new friend
lifecycle tests. Web typecheck and lint, explicit lint of changed runtime/manager/
model/test modules, formatting, production build and production HTTP SSR smoke
passed. The full web suite passed 146 of 148 tests, with the same two documented
adaptive-transition failures. The existing crane GIF precache warning remains.

Chromium fixtures passed at 1440×900, 390×844 and 844×390 using the actual provider,
FriendManager, WebSocketManager and friend/search/request/leaderboard UI with
injected services and a local socket server. They exercised Strict Mode, search
and mutations during deferred startup, socket snapshots, stable rerenders, account
round trips, stale search rejection, local form reset, logout and subscription
cleanup, without browser errors. Peripheral sharing/listen-together UI and CSS were
stubbed: these are interaction checks, not visual, real playback, complete account
reset, iOS, assistive-technology or offline acceptance.

### Shell-owned sharing and scoped inbox/composer — 4 November 2026

SharingManager now accepts injected session/socket, media lookup, queue, player and
feedback services. The persistent shell balances its session/socket subscriptions;
account replacement, logout and cleanup clear inbox/sent items, loading/errors and
the composer. Request and lifecycle generations prevent stale reads and finalizers
from changing a replacement account or a restarted lifecycle. Reads and mutations
handle unsuccessful Results and transport failures; inbox errors are visible in
the shared-media UI. Mark-seen failures cannot launch a success refresh.

Shared media lookup/play/queue commands check their lifecycle after awaiting media
metadata, preventing old lookups from changing a replacement account's playback.
Share submissions check again after refreshing sent items. A replaced composer
also invalidates old submit completion, so it cannot close or notify over the new
form. The inbox, composer, activity actions and context-menu share action consume
runtime Context; inbox labels use the vocabulary Context. The Friends page no
longer duplicates the manager's initial inbox/sent requests. Composer fields now
have explicit accessible label associations.

Checks: all 44 focused friend/sharing/notification/connection tests passed, including
10 new sharing lifecycle tests. Web typecheck and lint, explicit lint of changed
runtime/manager/model/test modules, formatting, production build and production
HTTP SSR smoke passed. The full web suite passed 156 of 158 tests, with the same
two documented adaptive-transition failures. The existing crane GIF precache
warning remains.

Chromium fixtures passed at 1440×900, 390×844 and 844×390 with the actual provider,
friend/sharing/socket managers and friend/inbox/composer UI. They verified Strict
Mode, deferred startup, scoped consumer interaction, send/refresh/close behavior,
inbox playback commands, stable rerenders, account round trips, stale playback
cancellation, composer clearing and logout/unmount cleanup, without browser errors.
Playback command targets, peripheral listen-together/activity UI and CSS were
stubbed. Real audio, visual/accessibility-device verification, complete application
account reset and offline behavior remain pending.

### Shell-owned listen-together and scoped controls — 4 November 2026

ListenTogetherManager now accepts injected session/socket/playback/feedback services.
The persistent shell owns its session and playback subscriptions, socket handler,
visibility listener and heartbeat timer before legacy startup completes. Start/stop
are balanced and idempotent. Metadata updates retain guest consent; account
replacement, logout and same-account restarts clear it and discard the old queue
snapshot without restoring another account's queue. Guests still explicitly join;
snapshots and heartbeats do not poll session history or autojoin invitations.

Lifecycle generations reject stale invites/joins/leaves, sync completions, media
loads and restoration seeks. Old finalizers cannot release a replacement request's
loading/sync state. New snapshots supersede pending playback; repeated empty
snapshots preserve a pending valid restoration. Normal leave/termination restores
the saved queue and position, while stale-host pause and expiry remain intact.
The session panel and invitation controls consume runtime Context; player controls
and session identity use their scoped providers.

Checks: all 46 focused listen-together, connection, sharing and friend tests passed,
including seven new lifecycle/race cases. The final 13 listen-together tests passed
after the repeated-empty-snapshot restoration fix. Web typecheck and lint, explicit
lint of changed runtime/manager/model/test modules, formatting, production build
and production HTTP SSR smoke passed. The full web suite passed 163 of 165 tests
with the same two documented adaptive-transition failures. The existing crane GIF
precache warning remains. Pinned pnpm used temporary PNPM_HOME/XDG_DATA_HOME paths.

Chromium fixtures passed at 1440×900, 390×844 and 844×390 with the actual provider,
ListenTogetherManager, WebSocketManager, session panel and invitation UI. They
verified Strict Mode, invites during deferred startup, explicit guest consent,
play/pause commands, stable rerenders, queue/position restoration, account round
trips, stale playback cancellation and logout/unmount subscription/timer cleanup,
without browser errors. Playback targets, session/playback provider hooks and CSS
were fixture adapters. Real audio/queue progression, visual/device accessibility,
complete application account reset and offline behavior remain pending.

### Playback-owned volume preference lifecycle — 4 November 2026

Moved saved-volume restoration and the volume-change subscription/debounce timer
from one-time UserManager startup into an injectable VolumePreferenceLifecycle
owned by PlaybackProvider. Construction is inert; repeated setup/cleanup balances
both session and volume subscriptions. Account replacement and logout cancel
queued writes and invalidate in-flight completion. Stale finalizers cannot unlock
or drain a replacement account's pending save. Existing debounce/coalescing,
transport-failure recovery, invalid-value fallback and iOS fixed-volume behavior
are preserved.

Session metadata and same-account lifecycle restarts retain the active volume;
new account identities restore their saved preferences. Restored values are not
written back as user edits, including when Nanostores defers a volume callback
until after the session subscriber returns. Logout observed during a shell restart
also clears restoration identity before the next same-account login.

Checks: all 36 focused volume, native lifecycle and server-rendering tests passed,
including eight new volume tests. Web typecheck/lint, explicit changed-module lint,
formatting, production build and production HTTP SSR smoke passed. The full web
suite passed 171 of 173 tests with the same two documented adaptive-transition
failures. The existing crane GIF precache warning remains. Pinned pnpm used
temporary PNPM_HOME/XDG_DATA_HOME paths.

Chromium fixtures passed at 1440×900, 390×844 and 844×390 with the actual playback
provider, player/keyboard hooks, queue provider and volume slider, using injected
playback targets and HTTP responses. They exercised Strict Mode, volume restore
and edit/save, stable navigation/rerenders, metadata retention, account preference
replacement, stale-save cancellation, logout and unmount subscription cleanup,
with no browser errors. These checks do not establish real audio, native iOS,
complete account reset or offline acceptance.

### Shell-owned user session and scoped logout — 4 November 2026

UserManager has injectable session transport/cache, queue, socket and logout-reset
services. The shell registers/removes its queue-type handler and waits for user
startup before connecting, including when compatibility startup already completed.
Initialization reuses the server session without another GET or rewriting it to
the cache. Strict Mode restart balances the handler, retains established state,
and permits fresh initialization when a previous startup read was cancelled.
Header and settings logout controls consume the scoped runtime user service.

Session reads use request revisions and lifecycle/account generations. Older
successes, 401s, transport failures, offline reads and finalizers cannot replace a
newer session or a restarted shell. Offline fallback rejects a different account's
cached session during refresh. Expiry/logout clear user identity, profile,
privileges, playback preferences and session state immediately. Logout invalidates
pending refreshes before awaiting cache cleanup, and an old logout cannot clear a
replacement account's feature state. Cache writes and clears are serialized and
account-scoped; logout clearing survives unmount and finishes after an old save,
while a newer account's queued save follows any already-running clear.

Checks: all 25 focused user-session/connection tests passed, including ten new
user-session tests and a user-startup connection gate. Web typecheck/lint, explicit
changed-module lint, formatting, production build and production HTTP SSR smoke
passed. The full web suite passed 182 of 184 tests with the same two documented
adaptive-transition failures. The existing crane GIF precache warning remains.
Pinned pnpm used temporary PNPM_HOME/XDG_DATA_HOME paths.

Chromium fixtures passed at 1440×900, 390×844 and 844×390 with the actual runtime,
playback and session providers, UserManager, WebSocketManager, header user menu
and settings logout button, using injected HTTP/cache/playback targets. They
verified Strict Mode, server-session reuse, live queue-type messages without
duplicate handlers, stable rerenders, stale logout/refresh rejection, account
replacement, logout cache clearing and unmount cleanup, without browser errors.
Profile/settings/language mutation guards and consumers remain a separate step;
complete application account reset, real audio, native and offline entry acceptance
remain pending.

### Scoped user profile, preferences and language mutations — 5 November 2026

UserManager now uses its injected typed HTTP, vocabulary and feedback services
for profile uploads, download preferences, listening-history preferences and
language changes. Lifecycle/account generations and per-operation revisions reject
stale successes, failures and follow-up reads, including account round trips and
same-account restarts. Stopped managers cannot launch settings mutations. Profile
refresh validates the returned identity and patches only the image, preserving
newer settings. Successful preference patches update both session state and the
serialized offline snapshot and invalidate earlier session reads. Completion after
cache persistence checks scope again before reporting success.

Language changes fetch the requested dictionary, verify current scope before
installing it, and emit feedback/the refresh event only after success. Rejected
updates or vocabulary refreshes keep the current dictionary and use translated
feedback. Removed the manager's hardcoded listening-history error message in favor
of the existing vocabulary error. Active settings/profile/language/download
controls and settings feedback use runtime Context. A user scope resets settings
and download forms across account/lifecycle changes; the profile callback also
checks scope before showing upload feedback.

Checks: all 18 user-session/profile/preference tests passed, including eight new
mutation tests. Web typecheck/lint, explicit changed runtime/model/hook/test lint,
formatting, production build and production HTTP SSR smoke passed. The full web
suite passed 190 of 192 tests with the same two documented adaptive-transition
failures. The existing crane GIF precache warning remains. Pinned pnpm used
temporary PNPM_HOME/XDG_DATA_HOME paths.

Chromium fixtures passed at 1440×900, 390×844 and 844×390 with the actual runtime,
playback/session/vocabulary providers, user/vocabulary/socket managers, settings
page, profile uploader, preference controls, language selector and logout UI.
They checked preference and cache updates, image-only patching, live language
Context/document/cookie updates, form reset, suppressed stale upload feedback,
Strict Mode, account replacement and logout/unmount cleanup, without browser
errors. HTTP/cache/playback targets, the dictionary response and peripheral
settings controls were fixture adapters. Remaining settings localization/UI
consolidation, full navigation, actual media playback, native devices and offline
entry acceptance remain open.

### Playback-owned web player browser listeners — 5 November 2026

Removed the web MediaPlayerManager constructor's process-wide visibility binding.
PlaybackProvider now owns explicit, idempotent browser start/stop methods. Visibility
recovery, background-video switching, next-track preloading and iOS ended polling
keep their existing behavior while the authenticated playback scope is active.
Cleanup removes the visibility handler, stops ended polling and releases pending
play-permission gesture retries without pausing the transport.

Repeated rejected plays now replace the previous retry handler. Superseded or
stopped handlers cannot play, remove a replacement handler or survive logout and
same-account restarts. Poll generations reject already-queued callbacks after a
restart, and late play completion cannot create polling while stopped.

Checks: the 38 focused adaptive-transition/native-lifecycle tests passed 36 tests
with the same two documented adaptive-transition failures; all three new browser
lifecycle tests passed. Web typecheck/lint, explicit changed manager/runtime/test
lint, formatting, production build and production HTTP SSR smoke passed. The full
web suite passed 193 of 195 tests with those same baseline failures. The existing
crane GIF precache warning remains. Pinned pnpm used temporary home directories.

Chromium fixtures passed at 1440×900, 390×844 and 844×390 with the actual playback
provider, MediaPlayerManager and native integration. They verified no constructor
visibility listener, Strict Mode, balanced visibility setup, stable rerenders,
single retry ownership, stale retry rejection and logout/restart/unmount cleanup,
without browser errors. Media-source playback was stubbed; iOS ended polling used
unit fixtures. Real media/queue progression and native-device acceptance remain
open. Shared BaseMediaPlayerManager still owns separate one-time socket and
visibility handlers; moving those is the next bounded runtime step.

### Playback-owned shared player synchronization — 5 November 2026

BaseMediaPlayerManager now retains balanced socket/visibility cleanup and exposes
idempotent stopSynchronization(). Initialization keeps its existing mobile API;
web PlaybackProvider owns setup/cleanup instead of compatibility startup. Repeated
setup cannot duplicate current-media/current-time handlers, and cleanup detaches
from the socket instance used for setup. Ordinary shell restarts release listeners
without stopping the transport. Session metadata retains integration; direct
account replacement tears down synchronization, pauses the prior transport and
starts the replacement scope. Logout releases listeners before pausing playback.

Synchronization generations reject old callbacks at entry, after the queue-handler
microtask and after media loading. Late ownership acknowledgements cannot pause or
resume a restarted player, and old remote clocks cannot change its current time.
Existing acknowledgement order, seek validation, playback confirmation and native
recovery behavior remain in place. This does not complete queue/account state reset
or cancellation of every transport/source-loading operation.

Checks: all four new ownership/synchronization tests passed. The 42 focused
adaptive-transition/native-lifecycle tests passed 40 tests with the same two
baseline adaptive-transition failures. Web, mobile and shared TypeScript checks,
web lint, explicit changed runtime/test lint, formatting, production build and
production HTTP SSR smoke passed. The full web suite passed 197 of 199 tests with
the same baseline failures. The existing crane GIF precache warning remains.
Pinned pnpm used temporary PNPM_HOME/XDG_DATA_HOME paths.

Chromium fixtures passed at 1440×900, 390×844 and 844×390 with the actual playback
provider, shared/web player and native integration. They verified Strict Mode,
balanced socket and visibility handlers, stale acknowledgement/retry rejection,
stable rerenders, logout, restart and unmount cleanup, without browser errors.
HTTP/media-source targets were fixture adapters. Actual audio, queue progression,
native iOS/Android devices and full offline entry were not verified by these fixtures;
remaining runtime acceptance stays open.

### Server-rendered Library without skeletons — 5 November 2026

The Library route now awaits a request-local server loader for the full library
and featured top albums. Both requests run concurrently through the typed server
transport with the current session and uncached private responses. Invalid DTOs,
expired sessions and backend failures use the existing route error handling.
The top-album ranking uses a 30-day UTC window for its server snapshot.

LibraryClient receives the complete initial snapshot. Removed its mount-time
library/stats requests and the unused LibrarySkeleton component. Filtering, sorting,
bounded rendering and full-library song IDs reuse the server data; add/remove events
continue updating the local reducer. Session Context gates private library and
top-album data across account changes. Server snapshots are still saved to the
account's IndexedDB library cache. The explicit offline entry validates and loads
that cache before mounting the library, without fetching library data in the browser.

Checks: all 16 focused library/server-rendering tests passed, including account
isolation, failed/invalid initial responses and stable snapshot rendering. Web
typecheck/lint, explicit changed-module lint, formatting, production build and
production HTTP SSR smoke passed. The smoke check verifies real library song and
top-album elements in server HTML, no skeleton classes, one request per resource,
and empty-library rendering. The full web suite passed 198 of 200 tests with the
same two baseline adaptive-transition failures. The existing crane GIF precache
warning remains. Pinned pnpm used temporary PNPM_HOME/XDG_DATA_HOME paths.

Chromium checks passed at 1440×900, 390×844 and 844×390 against the production app
and isolated backend fixture. They verified hydration without errors or skeletons,
no browser library/stats requests, local filters/search, the desktop view switch,
IndexedDB snapshot persistence and reopening the saved library through `/~offline`.
Browser API requests were routed to the fixture and WebSockets were closed by the
test adapter. Real live-event delivery, actual playback, native devices and full
network-offline/service-worker acceptance remain open. This step retains the
existing full-library endpoint; Library pagination and complete query/runtime
ownership are still pending.

### Shell-owned queue lifecycle — 5 November 2026

BaseQueueManager now exposes balanced, restartable init/stop/reset methods. The
mounted connection lifecycle owns queue startup and cleanup and waits for queue
handlers before opening the socket. Compatibility startup no longer initializes
the queue. CurrentQueue/CurrentMedia handlers and current-media/playing/repeat
subscriptions detach from their original collaborators. Ordinary shell restarts
retain the queue and transport without replaying initial media; logout/account
replacement clears private queue, current item, pages and recommendations.

Lifecycle/request generations reject stale initialization, refreshes, page loads,
local/external recommendations, preparation completions and queued timer callbacks.
An old page completion cannot delete a replacement request at the same offset.
Paged next/previous/wrap work retains progression and abandons obsolete selections.
Autoplay debounce and retry timers are cancelled; old finally blocks cannot unlock
replacement preparation or schedule retries. Server seeds remain reusable across
Strict Mode restarts without duplicate initial queue requests.

Checks: all 11 new queue regression tests and all 17 connection tests passed;
server-rendering regressions passed. Web/mobile/shared TypeScript, web lint,
explicit changed-module/test lint, formatting, production build and production HTTP
SSR smoke passed. The full web suite passed 209 of 211 tests before the final two
queue tests were added; both added tests passed separately. The same two baseline
adaptive-transition failures remain. Existing crane GIF precache warning remains.
Pinned pnpm used temporary PNPM_HOME/XDG_DATA_HOME paths.

Chromium fixtures passed at 1440×900, 390×844 and 844×390 using the actual runtime,
playback and queue providers and web/shared queue manager. They verified Strict
Mode seed reuse, no duplicate initial request, stable navigation, stale page/handler
rejection, account replacement/logout and balanced listener cleanup with no browser
errors. HTTP/socket/player targets were fixture adapters. Actual audio, complete
queue/native-device behavior and full offline/service-worker acceptance remain open.

### Adaptive-transition test baseline repaired — 5 November 2026

Updated the two outdated immediate-skip expectations to the intentional 60-second
file-error delay introduced by the existing playback implementation. The fake
clock now records timeout deadlines and advances deterministically, so the tests
assert no skip before the deadline and correct forward/backward traversal after
it. The failed-file loop still stops. Added cancellation cases for pause, manual
selection, queue replacement and playback replacement, plus the one-second
repeat-one retry. No production playback delay or algorithm was changed.

Checks: all 30 adaptive-transition tests and the complete web suite (218 of 218)
passed. Changed-test lint, formatting and diff checks passed. Per the user's
updated gate, every subsequent migration commit requires the full suite to pass.

### Lifecycle-safe queue actions — 5 November 2026

Collection/featured playback, offline collection fallback, list insertion and
explicit recommendation actions now reject stale responses after queue lifecycle
or account changes. New explicit playback selections supersede pending selections;
manual selection also wins. Old song reads cannot start downloads, and stale
download acknowledgements cannot show feedback in a replacement scope. Active
playback, insertion and offline fallback retain their existing behavior.

Collection playback reuses the shared response application path, preserving API
total/offset, sorted state and web readiness instead of treating the returned
page as the complete queue. Locally created queues survive ordinary restart.
Collection cache opening checks the lifecycle before beginning a cache write.
This does not complete service-worker/private-cache account isolation.

Checks: all 22 queue regressions passed and the complete web suite passed 229 of
229 tests. Web/mobile/shared TypeScript, web lint, changed-module/test lint,
formatting, production build and production HTTP SSR smoke passed. Chromium
fixtures passed at 1440×900, 390×844 and 844×390, exercising stale explicit
collection selection and logout responses in addition to the preceding queue
lifecycle scenarios, without browser errors. HTTP/player/socket targets remain
fixture adapters; actual media, native devices and full offline acceptance remain
pending. Existing crane GIF precache warning remains.

### Scoped shared-player source loading and continuations — 5 November 2026

Shared player cleanup now invalidates pending source resolution and post-load
volume/seek/hooks independently of playback identity. An interrupted load restarts
once in the new shell without waiting for the discarded lookup; rapid Strict Mode
restarts preserve that recovery. Only the same selected object/occurrence can
resume; account/queue replacement rejects it. Completed transport playback is
preserved across ordinary cleanup. Existing native initialization remains intact.

Deferred play, toggle, audio-only and autoplay completions check their lifecycle
and selected item before affecting playback. File-error and repeat-one retries
share one cancellable timer; pause, replacement errors and cleanup release it,
and already-queued callbacks cannot revive a replaced request. The intentional
60-second skip delay and one-second repeat-one delay remain unchanged.

Checks: all 40 adaptive-transition/source tests passed; the complete web suite
passed 239 of 239 tests. Web/mobile/shared TypeScript, web lint, changed-test lint,
formatting, production build and production HTTP SSR smoke passed. Chromium
fixtures passed at 1440×900, 390×844 and 844×390 with the actual PlaybackProvider,
web/shared player and native integration, verifying navigation, rapid restart,
stale lookup rejection, logout/new-account isolation and cleanup without browser
errors. Source-resolution/native-load/play targets were fixture adapters. Actual
media and native devices remain unverified; already-running platform I/O is not
physically aborted by these generation checks. Existing precache warning remains.

### Browser-owned supplementary playback work — 5 November 2026

Web player cleanup now invalidates pending preloads, discards private bounds
metadata, cancels and releases bounds-retry waits, and rejects stale metadata
responses/finally blocks using per-request ownership. Restarted scopes can request
the same song without an old completion deleting their pending work. Preloads and
transition polling only run while the browser scope is active.

Foreground-video restoration checks lifecycle, selection, playback, visibility and
mode after loading before seeking/pausing/playing. Native play promises check the
active scope and request before reporting playing or installing retry gestures.
Cleanup cancels transition/ blend timers and releases the outgoing/spare deck while
preserving the active transport. Restart restores supplementary work for a playing
transport; queued old transition callbacks cannot affect the new scope.

Checks: all 46 adaptive-transition/source tests and the full web suite (245 of 245)
passed. Web typecheck/lint, changed-manager/test lint, formatting, production build
and production HTTP SSR smoke passed. Chromium source-lifecycle fixtures passed at
1440×900, 390×844 and 844×390 without browser errors. Source/transport targets remain
fixture adapters; real media, native devices and full offline entry acceptance are
open. Existing crane GIF precache warning remains.

### Central theme and semantic utility migration — 5 November 2026

Moved the interface palette into `styles/tokens/theme.css`, with named roles for
surfaces, text hierarchy, focus/borders, feedback and brand accents. `colors.css`
now contains compatibility aliases rather than a second palette. Replaced palette
utilities and legacy color-variable utility syntax across 135 source files,
including shell, library, home, settings, downloads, social, stats/admin and player
controls. Layout, opacity modifiers and state/viewport variants remain intact.

Checks: all 246 web tests passed, including the new semantic-utility architecture
check. Web typecheck/lint, formatting, production build and production HTTP SSR
smoke passed. Production Chromium Library checks passed at 1440×900, 390×844 and
844×390, including first render, filtering/views, saved offline snapshot and a
runtime token override proving compiled Tailwind utilities follow the central
palette. Desktop/phone screenshots were inspected. Existing precache warning
remains. Inline literals, feature CSS, charts, SVGs and PiP are the next color pass.

The user also requested a user-table theme preference and Settings selector.
Implement Dark/Light/System with existing accounts defaulting to Dark after the
remaining component color migration.

### Component color literals consolidated — 5 November 2026

Removed fixed interface colors from component inline styles, SVG controls/provider
marks, chart configuration, feature stylesheets and PiP, plus shared browser
bookmark/artist color adapters and global feature styles. Simple SVG paint now
uses semantic Tailwind classes. Complex gradients, chart/Leaflet props and CSS
animations reference the same central theme variables. Brand/medal/flame/bookmark
colors and vinyl textures have named palette roles in theme.css. Registered CSS
color properties also live in the palette layer where literal defaults are valid.

Artwork-derived accents remain validated data; invalid colors use the central
fallback. Quick-access gradients now mix that color safely instead of appending
hex alpha. Like-button hover colors use classes instead of event-time style writes.
Moved the artwork color contract into web models. Semantic utility, literal-color
and undefined-token architecture tests guard the migration.

Checks: all 248 web tests passed. Web typecheck/lint, changed service/model/test
lint, formatting, production build and production HTTP SSR smoke passed. Production
Chromium Library/theme checks passed at all three viewport sizes; phone rendering
was inspected. The existing precache warning remains. Broader feature-by-feature
visual/native/PiP interaction acceptance remains open.

### Persisted account theme and Settings selector — 5 November 2026

Added a validated Dark/Light/System preference to the user row, migration, authenticated
user endpoint and session/settings responses. Existing accounts default to Dark.
Regenerated the shared DTOs/HTTP boundary and vocabulary artifacts from the backend
models and translated workbook entries. The Settings selector saves through the
scoped user manager, updates the session/offline snapshot only after success, and
retains the previous choice on failure or obsolete completions.

The root layout resolves the authenticated preference before rendering. A scoped
ThemeProvider carries that preference into browser navigation and a fallback cookie;
account session data remains authoritative. Central light palette overrides and a
CSS system-color preference support OS changes without client rendering gates.
Adjusted shell, artwork overlays, buttons, logos and PiP theme propagation for both
palettes. Browser acceptance uncovered a Settings network-indicator hydration mismatch;
a shared network hook now preserves the server snapshot through hydration.

Checks: all 250 web tests passed, along with workspace web/mobile/shared types, web
and changed-module lint, formatting, production build and HTTP SSR smoke (including
Light/System first-render markup). Backend checks passed: 591 tests and 37 subtests,
Ruff format/check and Pyright. The backend suite excludes listening_rewards as directed
by the application guide; dedicated PostgreSQL persistence checks were not run.
Production Chromium Settings checks passed at 1440×900, 390×844 and 844×390 without
browser/hydration errors, covering saved reloads, failed saves, OS color changes,
offline session-cache updates and account preference isolation. Desktop/phone light
screenshots were inspected. Existing crane GIF precache warning remains.

## Current work

Stopped after the persisted theme Settings step at the user's explicit request.
Semantic utilities, component color consolidation and saved Dark/Light/System themes
are implemented and checked. No next migration step has started.

Runtime work through queue actions and web/shared source lifecycle is implemented.
Download/playlist/library manager ownership and full account reset remain deferred.
Library still renders initial server data without skeletons/mount requests.

Latest checks: all 250 web tests and the standard backend suite pass; workspace types,
lint, production build/SSR and Chromium Settings checks pass at all three viewport
sizes. Actual media, native devices, dedicated PostgreSQL persistence and complete
offline/service-worker acceptance remain open. Parent stages remain unchecked until
their complete acceptance gates pass.

## Verification log

- Planning baseline: installed web TypeScript compiler passed (`--noEmit --incremental false`).
- Production build: passed (Next.js 16.2.0 / Turbopack / Serwist). Existing 2.85 MB crane GIF precache warning remains.
- Workspace types: web, mobile and shared passed.
- Web lint: passed after removing unused route imports.
- Web unit suite: 83 of 85 passed. The same two adaptive-transition failures reproduce against original HEAD `61dce4c61` in an isolated source copy: immediate error-skip expectations conflict with the existing delayed-skip implementation. Playback algorithms were not changed to hide these failures.
- Added HTTP/SSR/popup tests and existing context-menu gestures: all 17 passed.
- Backend vocabulary tests: three passed; changed Python files passed Ruff format/check; backend Pyright passed with zero errors or warnings.
- Production SSR smoke: passed with isolated fixture servers and no production data.
- Production browser performance, real audio, native devices, and offline worker behavior: pending.

## PR 179 integration after develop rebase

Retained Vocabulary Context, semantic theme roles and ui/ context-menu imports in
recommendations while integrating artwork and bounded virtual scrolling. The
shared queue retains develop's lifecycle-generation guard around the single
external-enabled suggestion request. Artwork cache ownership now lives in scoped Context rather than the compatibility singleton; metadata requests use the browser HTTP adapter. No user-visible strings were added. Static
web types and lint are checked; CI checks are recorded in PR 179. Earlier browser
fixtures remain historical evidence; runtime acceptance on the rebased application
and physical PiP/Vivaldi verification remain open.

## Universal frontend migration — PR #189

Desktop no longer imports or mounts the former mobile presentation shell. Next
retains its SSR/session boundaries and desktop integrations. Browser audio,
transitions, Media Session, HTTP and offline storage live in the common browser
adapter; Expo selects browser or native adapters without importing the desktop app.
Portable social/radio/notification policies, universal media controls and semantic
styles/vocabulary are shared by the two application shells.

Workspace types and web/mobile lint pass, Next production build and Expo web export
pass, and source-map checks show no desktop/native first-party sources in mobile
web. The final fast frontend gate passed 294 tests in approximately 30.9 seconds in
GitHub Actions, including boundary and fixture types. Seven production Chromium
flows also pass. All required jobs are green at the verified implementation commit
`44ec20a7`; documentation-only commits retain the same implementation.

The [migration progress](../FRONTEND_MIGRATION_PROGRESS.md),
[test guide](../FRONTEND_TESTING.md) and [deployment guide](../FRONTEND_DEPLOYMENT.md)
record the final scope and remaining installed iPhone/Android gates. Heavy browser/
APK acceptance is manually dispatched, not required on every PR. No physical-device
acceptance or production routing change is claimed. The current user instruction
is consolidated checks after coherent work, superseding the historical per-step
suite preference recorded above.

## Player follow-ups stacked on PR189

Separate branch `feat/player-kanban-followups`: continuous PiP header with close
and movement handle, artwork/vinyl playback toggle and compact layouts; relative
Media Session seek handlers removed in favor of track navigation. Shared album
redownload orchestration resolves pages before changing files and stops on failures
or account replacement. Artist credits remain visible in mobile cards and desktop
artist rows; provider album/artist parsing accepts individual string/object credits.
Frontend fast gate: 301 tests passed. Focused provider credit tests: 11 passed.
Physical iOS controls and auxiliary-window movement remain device/browser checks.
