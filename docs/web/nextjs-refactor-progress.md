# Frontend migration progress

The previous migration log is preserved in the
[historical progress record](../archive/web/nextjs-refactor-progress.md).
Use the [frontend guide](../frontend/README.md) for current development entry points.

Record new refactor milestones here when required by the web engineering guide;
keep release-specific test evidence tied to its commit and target platform.

## Mobile UX follow-up — PR206

Library now uses one virtualized vertical scroll, with featured collections and
anchors in horizontal shelves. Search separates result categories into horizontal
shelves. Featured artwork and the animated hand/flame like presenter are shared
with desktop; mobile likes now persist through the existing authenticated API.
Radio uses a local Natural Earth SVG map on native and web, without map tiles or
a WebView. Friends prioritizes friends, requests, activity and listening sessions;
secondary destinations and destructive actions use contextual menus. Profile
photos use Expo gallery adapters and the existing upload contract. A new Android
build is required for the image-picker module. Display names remain outside this
change because the existing account contract exposes a username only.

Checks: web/native TypeScript, lint, production exports and focused regression
tests. Chromium verifies search scrolling and existing mobile destinations against
a local fixture backend. These checks do not establish physical iOS/Android
acceptance. Orientation-specific design work is deferred at the user's request.

Artist credit alignment follow-up: grid cards now request centered credits
explicitly and constrain their width to the cover. Row credits retain left
alignment and one-line ellipsis. Album headers explicitly center credits and allow
up to five lines, including long unbroken names.

## Official artwork, discovery and mobile ZIP export

Official collection artwork now lives in `packages/ui/assets`; native bundles use
local asset references and each web origin serves its own copies. The PWA caches
viewed artwork without adding all monthly covers to installation prefetch.
Radio map generation uses geographic antimeridian clipping at build time; the
runtime only renders SVG. Downloads is an icon beside Library view controls;
worldwide radio exploration follows Search results. Friends consumes the global
online count from the existing socket, with a shared semantic online color.

Library context menus can start collection selection. A bottom action bar exports
the selected public IDs through the existing ZIP endpoint. Browser downloads use
the authenticated binary client; native downloads stream to a temporary file and
open the OS sharing sheet. Cancellation and session changes abort work; partial
files are removed. Existing `react-native-safe-area-context` providers and shell
insets reserve space above system navigation; no fixed OS margins are introduced.

Verification covers real Chromium ZIP downloads with album and playlist IDs,
global presence, native stream cleanup/cancellation, error and stale-session
handling, TypeScript, lint and production bundles. APK sharing and iOS system
insets still require device acceptance. A native rebuild is required for sharing.

## Mobile layout and MediaSession regressions — PR212

Stats charts measure their containing card and fit all bars and sampled labels
without horizontal overflow. Radio preserves the SVG's aspect ratio. The mobile
shell owns the bottom inset once; page footers no longer repeat navigation-sized
padding. Collection playback moves into the compact search/action row. Transport
SVG fills use explicit theme colors, avoiding inherited Safari link colors.

Library combines featured collections and personal anchors in one horizontal
shelf, deduplicating builtins. Mobile Home keeps personalized discovery and omits
the featured shelf. Both Home renderers use a shared session-backed profile image
with a recoverable initial fallback. Web queue dragging shows the exact before or
after insertion boundary; keyboard reordering uses Alt + Up/Down. The destination
calculation uses queue occurrence IDs and preserves the current track.

Browser MediaSession commands are reasserted when real playback starts, including
between tracks without a logical pause and when the keepalive becomes active.
Relative-seek actions remain disabled. Playback and transition behavior is
unchanged. See [iOS playback](../frontend/ios-playback.md) for device acceptance.

Verification: mobile/web and test TypeScript, lint, production Expo/Next bundles,
portable/native component contracts and focused manager tests. Local Chromium
checks cover 31-bar charts at 320/390/430 px, one Library shelf, Home photos,
compact playback, map proportions, simulated safe-area layout, real audio command
registration and a persisted HTML queue drag. Fixture screenshots use synthetic
accounts/media. Physical iOS system controls/insets and Android device acceptance
remain unverified; tasks are in To Review.

## Foreground playback and mobile player review — PR212

Browser playback now silences late starts from inactive decks and expires stale
transition tails on foreground recovery without interrupting a valid crossfade.
Five new regressions cover suspended clocks/timers, retired decks, idle preloads
and inactive audio/video outputs; the adaptive playback suite passes 54 cases.

Mobile lyrics use measured line frames inside an unpadded wrapper, with enough
leading/trailing space to center the first and last lines. Player panels are
bounded to their visible snap point rather than the sheet's offscreen overdrag
area. The lyric font keeps a stable size across highlights to avoid rewrapping.
The shared header remains visible above the player, shows global presence to the
left of the logo and notifications to the right, and owns the only header copy.
Player artwork measures the space left by metadata and controls; larger bottom
tab actions remain reachable. Header, handle and panel dimensions use theme tokens.

Library uses one virtualized mixed feed, ordered globally by each item's library
addition time, with shared-playlist deduplication and the existing type filters,
grid/list toggle and selection/export flow. The feed retains library timestamps
instead of sorting each media type separately.

Chromium checks cover player geometry at 320/390/430 px, wrapped lyric centering
on open/resize/seek and mixed-library ordering/filtering/selection. Screenshots use
fixture content. Native/web TypeScript, lint and production bundles supplement
those checks; real iPhone lock/unlock and Android device acceptance remain open.

## Queue input, selection feedback and search follow-up — PR212

Mobile queue handles now use captured browser pointers in the PWA and the native
responder adapter in APK builds. Rows retain occurrence identity, show an insertion
marker, scroll near the viewport edges and preserve the selected song. Pointer
cancellation leaves the ordering intact; desktop/native keyboard accessibility
uses the same manager operation. Only the active drag disables swipe deletion.

Pending playback selection is separate from confirmed playing media: the mini
player publishes metadata and a loading indicator before collection/recommendation
requests complete. Stale requests, failures and account cleanup cannot retain an
old preview. A browser test verifies feedback within 500 ms against a two-second
fixture response; this does not claim shorter network or audio startup latency.

Mobile search invalidates previous work on input, clear and unmount. Desktop's
existing request-version guards remain in place. Featured headers now compose the
shared official artwork and list icon. Explicit badges use semantic filled-gray
backgrounds with a dark E on both renderers. Workbook translations include the new
touch reorder label in English, Spanish and French.

Verification includes persisted touch reordering in Chromium, late search replies,
featured icons, queue/search manager regressions, native badge rendering, TypeScript,
lint and the production mobile export. Opt-in screenshots cover the principal
mobile destinations and player panels against synthetic fixture data. Real-device
WebKit gestures and APK acceptance remain separate from these browser checks.
