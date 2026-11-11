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
