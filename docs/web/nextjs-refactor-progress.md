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
