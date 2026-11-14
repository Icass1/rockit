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

### Interactive radio exploration — PR 212

Mobile Radio now uses a full-screen vector map with one-finger pan, two-finger
pinch, zoom/reset controls and a persistent results drawer. Search stays above
the map; country matches focus located stations in the visible map area. Tapping
a station previews it before Play. The drawer and its virtualized list share one
scroll owner, so preview actions remain reachable while the panel expands.

Desktop retains Leaflet pan/zoom and now plots country results alongside saved
stations, with mouse/keyboard popups and Play. Both renderers share finite-coordinate
validation and deduplication; stations without coordinates remain in the list
instead of being assigned invented country-center positions. Translated map
controls are sourced from Vocabulary.xlsx and sizing stays in shared theme tokens.

Verification includes real Chromium CDP pan/pinch/drawer gestures, preview-before-play,
desktop mouse/keyboard popup playback, shared coordinate edge cases, both production
builds, TypeScript and lint. Screenshots use fixture stations. Physical iOS and
native Android gesture acceptance remains to be done on devices.

The mobile vector map now uses square Web Mercator geometry. The build generator,
station markers and country-focus calculations share the world size and projection;
poles are clamped to the finite Mercator latitude limit. This preserves rectangular
map navigation and keeps station positions aligned with the regenerated country paths.

### Shared listening circle — PR 212

Friends now opens with an interactive listening circle on desktop and mobile.
It shows up to six real friends, prioritizing people listening now, around the
current user's avatar. Selecting a person previews their current presence and
track; a separate action sends an invitation through the existing listening
manager. Offline users never display stale tracks as live activity. The empty
state opens friend discovery. Existing directories, requests, sharing, activity,
rankings and listening sessions remain available.

`packages/ui` owns the native-compatible component and selection hook. Both
applications supply scoped manager state and actions. The stage has no polling
or continuous animations; phone layouts stack the preview below the avatars and
wide containers place them alongside each other. Sizes/colors come from shared
theme tokens and new English, Spanish and French copy comes from Vocabulary.xlsx.

Verification covers portable and native component interactions, removal of a
selected friend, offline/empty states, explicit invitation payloads, desktop
keyboard selection and mobile layouts at 320, 390 and 768 pixels. Screenshots
use synthetic fixture identities. TypeScript, lint, theme/vocabulary tooling and
both production builds are checked separately. Physical iOS and APK acceptance
remains a device check; Chromium screenshots do not establish native rendering.

### Listening passports and shared emblems — PR 212

The listening circle and friend directory now open a listening passport on web
and mobile. The center avatar opens the current user's passport; desktop ranking
entries also link to friend profiles. Passports expose backend-provided listening
hours, recorded listens, streak, level/XP and earned emblem counts. They load only
on request through the existing authenticated friend-level/self-level endpoints.
Backend friendship authorization is unchanged. Account changes and late replies
cannot publish a previous account's profile.

`ListeningProfile` in `packages/ui` owns the shared view and bounded emblem catalog:
three highlights, nine items per catalog page, earned/all filters and an inspectable
description/progress for each emblem. The original RockIt! die, engravings and
shared palette now have one SVG source. Browsers use isolated SVG images; Expo
supplies its installed native SVG adapter and bundled logo. Gradient identifiers
are unique when the SVG adapter renders several emblems inline. No new package,
background polling or continuous animation is introduced.

Web composes the existing focus-managed Dialog; mobile composes its native Modal,
safe-area container and one scroll owner. Both retain current friend actions and
explicit listen-together invitations. Profile loads have error/retry states, and
missing/denied responses do not become fabricated zero-valued statistics.

Verification includes three portable profile tests, a native control test, two
manager contracts for account isolation/endpoints, and Chromium mobile/desktop
flows for hours, medal inspection/paging, retry, own profiles, keyboard access and
Escape/focus restoration. Existing circle tests also pass. Production builds,
application lint, frontend/test types and generated theme/vocabulary checks cover
the integration. Screenshots use synthetic fixture identities. Physical iPhone
and APK acceptance remains separate from these automated checks.

### Long-term emblem collection — PR 212

The backend catalog now has 615 emblems: 115 preserved identities and 500 new
objectives across 16 categories. Calendar anniversaries extend to twenty years;
25 secret milestones reveal their names and objectives only after a persisted
unlock. Six leagues use distinct silhouettes, shared palettes and category
engravings. The browser and Expo SVG adapter render the same artwork source.

The shared profile catalog adds horizontal family/league filters and retains
nine-item pagination. The older desktop comparison collection now paginates too.
Leaderboards request earned emblems and explicit collection totals, while full
profiles retain the catalog. This keeps locked objectives out of every friend's
ranking payload and avoids rendering hundreds of SVGs. No native dependency or
continuous animation was added.

Verification covers legacy award identities, translated copy, leap-year account
anniversaries, redacted secrets, batched grants/SQL shape, six distinct silhouettes,
a 615-item component fixture, native controls and Chromium filters on both hosts.
Both production builds and frontend/backend type and lint checks are included.
See [backend rules and limits](../backend/emblem-collection.md), including UTC
habit counters and optional PostgreSQL persistence acceptance. Screenshots use
representative fixture entries; artwork previews use the production SVG source.

### Annual recap stories — PR 212

The current user's listening profile now opens a shared annual story presenter.
A single existing Stats V2 request provides the calendar-year facts. Shared rules
produce a bounded artist countdown and conservative narrative templates; current
years are labeled in progress, and the previous year remains selectable. Web
uses the existing Dialog with a portrait stage; mobile reuses its Modal and safe
areas. Progress pauses on hold, explicit pause and app backgrounding; reduced
motion uses manual navigation. The presenter does not alter music playback.

Research, exact rules, data coverage and validation are documented in
[Annual recap](../frontend/annual-recap.md). Browser screenshots use synthetic history;
physical iPhone/APK background acceptance remains separate.

### Explicit marker proportions — PR 212

Replace the font-dependent explicit label with one shared filled vector silhouette:
12 px square, light gray with a dark cut-out glyph, without label padding or a
border. Web and native adapters render the same path and retain the translated
accessible name and positive-evidence policy. Existing DOM/native media-identity
checks and both app type checks pass; the browser preview measures 12×12 px.

### Prism medal inspection — PR 212

Shared miniatures now reserve a clipped family-motif field and remove the logo/
rank overlap. A browser-only, dynamically imported Three.js inspector builds
six beveled league forms with shared metal/enamel colors and raised family
contours. The reverse uses the existing profile name and persisted UTC date with
an engraved brand/rank texture. Rotation/zoom and keyboard controls render on
change; disposal and context-loss fallbacks preserve the lightweight catalog.
Native keeps a static preview without browser GL imports. See
[Prism medals](../frontend/prism-medals.md) for engraving and verification limits.

### Legend hierarchy and brand engraving — PR 212

Legend now has an expanded crystalline crown and seven raised side/crest facets,
with one shared silhouette/palette for miniatures and the browser viewer. The
reverse logo is a physical cut in the plate with preserved metal islands and a
recessed floor. The award date keeps its existing instant and omits the visible
timezone suffix. Text engraving remains texture-based. The inline preview uses
the production geometry and palette.

### Legend cavity and crystal topology — PR 212

Replace stacked wing silhouettes with one closed central cup and joined closed
crystal roofs. The front enamel and family motif sit inside a physical recess;
the polished rim descends into the face instead of stacking above it. Adjacent
crystals share their boundary edges, while enamel and reverse plates remain
inside the core. The original cut rear logo and award text are preserved.
Miniatures use the same separated core/well/crystal outlines. Diamond remains
queued for a separate color and facet refinement.

Verification: nine focused geometry/artwork/lifecycle checks and the native
profile control pass. Both production builds, strict UI/app/test types, app lint
and boundary/theme checks pass. Three Chromium inspector flows cover six
finishes, phone bounds, front/reverse, close/reopen and context-loss recovery.
The production-renderer demo also passes at 320 px without overflow. Physical
iPhone GPU acceptance remains separate.

### Legend medal finish and exact video inlay — PR 212

Refine only Legend with a rounded central outline, thin metal lip and almost
flush enamel field. Replace its smoothed tubular motif with the SVG loader's
exact planar stroke geometry, preserving video-icon corners and line proportions.
Both sides of each crystal now have a polished table and cut crown, joined
through a narrow belt. Eight instanced metal claws seat their roots on the rim.
Smooth roughness values differentiate the metal, enamel and crystal material. The cut reverse logo remains intact.

Geometry contracts cover closed crystal/cup topology, the shallow lip and planar
video inlay. The interactive preview uses the production renderer. Remaining
leagues stay outside this design pass; physical iPhone GPU acceptance is separate.

### Smooth Legend surface — PR 212

Remove the generated grain roughness map after visual review showed a cardboard-like
surface. Legend now uses uniform smooth material roughness, with a more polished
front field and inlay. Crystal cuts, metal claws and the reverse engraving remain.
The preview uses the same production material settings.

### Legend crystal silhouettes — PR 212

Remove the flat center belt from each crystal: front and rear facets now meet
directly at the equator. Each stone remains a separate closed solid with a small
clearance from its neighbors. Add two small rhombi beside the upper crown stone,
with proportionate depth and shared miniature/3D placement. Preserve the smooth
metal field, root mounts and reverse engraving.

The two new shoulder rhombi follow the frame angle and their depth clears the
front lip and rear plate, so they appear seated rather than as detached tips.

### Six-league medal collection — PR 212

Promote the approved Resonance prototype into the production inspector and give
each league its own construction: round bronze coin, silver rhombus, amber/gold
hexagonal jewel, teal platinum star, stepped blue diamond and violet pick-shaped
Legend. Shared shape data drives native/web miniatures and the browser geometry.
Preserve all 615 achievement identities and sixteen families; lower leagues use
precise family inlays and jewel leagues use restrained pavilion tints.

Keep the flat metal reverse with its original physical brand cut, bounded owner
text, persisted date and Roman rank. Proportionally fit the logo into narrow
plates and adapt Platinum text to its star. Replace former shard/belt/claw geometry
with closed front crowns and internal reflective pavilions. Diamond now has its
own blue palette distinct from Legend. No package or API change is introduced.

The event-driven viewer uses one canvas, local reflection cards and a 1.5 pixel
ratio ceiling for coarse pointers. The six-design Chromium review records at most
35 draw calls, under 15,000 triangles and five textures. Physical iPhone GPU
performance remains device acceptance. See [Prism medals](../frontend/prism-medals.md)
for construction, platform boundaries and verification.

Validation: closed-crown/flat-base contracts, 96-segment bronze roundness, exact
metal inlays and cut-brand containment pass for all six plates. Existing profile,
artwork, native controls, lifecycle and fallback contracts pass. Strict UI/app/test
types, both production builds, application lint and generated-theme/boundary checks
pass. Three real-browser app flows cover all six front/reverse views, keyboard
rotation, close/reopen, context loss and the mobile render-buffer ceiling. A
separate touch/DPR-3 gallery review checks all six leagues at the 1.5 ceiling and
320/390/768 px without overflow. No physical iPhone performance result is inferred.

### Filled family symbols on every medal league — PR 212

Replace the former thin engravings with sixteen original filled vector marks,
using one shared master for web/native miniatures and physical browser relief.
Keep the approved six constructions and reverse engraving. Add the symbol to
Gold, Platinum, Diamond and Legend, following their existing crown facets instead
of hiding it beneath the glass or enlarging a gem's table. Preserve open counters
and thin metal walls; exclude the relief from the glass refraction capture to
avoid repeated silhouettes inside the crystal.

Resolve artwork from the actual family scope before legacy visual variants, so
old session/time awards no longer show another family's symbol. Pass the scope
through shared profiles, the web collection and both platform fallbacks. No
achievement identity, API model, package dependency or translated copy changes.

Validation: 39 portable/DOM tests and one native control test pass. The geometry
contracts cover all sixteen symbols across all six leagues: complete projected
area, finite and bounded meshes, open video counter, outward top faces and
positive clearance above every crown facet. Original brand containment, closed
gem topology, inspector lifecycle and profile filters remain covered. Strict
UI/web/mobile/test types, both production builds, application lint and generated
theme/boundary checks pass. Static marks were visually reviewed at 16/24/84 px.

The production-renderer gallery checks six symbol-bearing fronts and the reverse,
plus 320/390/768 px bounds. Touch/DPR-3 review retains one canvas, a 1.5 pixel-ratio
ceiling, at most 37 draw calls, fewer than 16,000 triangles and five textures for
the measured clock/video marks. These counts do not establish physical iPhone
frame rate. Safari/iPhone GPU acceptance remains a device check.

Three compiled-app Chromium flows also pass: six front/reverse finishes, keyboard
rotation, close/reopen, context-loss fallback and phone bounds/render-buffer cap.

### 64 families and 903 persistent achievements — PR 212

Expand the collectible system from sixteen to 64 families, with 384 family/league
artwork combinations. Preserve the previous 615 definitions byte-for-byte in their
identity/goal/title/variant/rank fields and add 288 achievements: six increasing
ranks for each of 48 new families. Add distinct original filled symbols for all
new families, reusing the approved six die/gem designs and physical relief path.
The single selected canvas, reverse engraving and mobile pixel-ratio cap remain.

New evidence covers four listening windows, seven weekdays, four fixed seasonal
month groups, five special dates, six kinds of calendar diversity, three rotation
patterns, eight saved-library counters and eleven sharing counters. Use only
persisted play/library/recommendation records. Calendar diversity does not imply
consecutive listening, and account age does not imply active years. Preserve
library awards after deletions and deduplicate recommendations by their actual
sender/recipient/item semantics. Three additional batch statements serve all 48
counters; summary reads now use seven fixed statements for any user/badge count.
No database migration, provider inference, polling or new dependency is added.

Expand the backend scope contract and regenerate shared DTOs. Add all 432 copy
keys to Vocabulary.xlsx in English, Spanish and French and regenerate vocabulary
types/fallbacks. Both profile hosts discover the expanded families from API data;
render only nine collection entries per page. Portable coverage exercises a
903-entry catalog, all 64 family filters and every symbol over all six crowns.

Validation: 758 backend tests and 43 subtests pass; 14 optional integration cases
skip without configured services. Ruff and strict Python/UI/web/mobile/test types
pass. The focused portable/DOM suite passes 88 tests, native controls pass, and
the web test command passes. Both production builds and application lint pass.
Three compiled-app Chromium flows exercise new habit/library/rotation/sharing
symbols on all six finishes, front/reverse, keyboard rotation, close/reopen and
context-loss recovery. PWA checks cover phone bounds and render-buffer caps.
The preview exposes all 64 symbols over four pages and fits 320/390/768 px.
Touch/DPR-3 review measures at most 37 calls, fewer than 16,000 triangles, five
textures and one canvas at the 1.5 cap for the measured flower mark. These are
resource counts, not physical iPhone frame-rate measurements. Live PostgreSQL
persistence and physical iPhone/native GPU acceptance remain separate.

### Contain Diamond and Legend family relief on flat gem tables — PR 212

Reduce family symbols specifically on Diamond and Legend and center them within
the usable flat face. Share the placement between native/web SVG miniatures and
the physical browser relief. Preserve glyph proportions, gemstone cuts, materials,
reverse engraving and the remaining league layouts.

Geometry contracts cover every family on both flat tables, including thin
sidewalls and open counters: no vertex reaches a sloped facet, with at least
0.75 SVG units of edge clearance. Normalize projected-area checks by scale so the
whole symbol remains present instead of being clipped. The 75 focused geometry
and artwork tests pass, as do strict UI/web/mobile/test types, application lint
and boundary/theme checks. Production-renderer review covers the reported
playlist-sharing symbol, another broad video mark, and 320/390/768 px bounds.
No API, dependency or platform-integration change is involved.

### Match Gold/Platinum inset hues and halve the Platinum family symbol — PR 212

Give the inset between the gemstone and frame a satin material in Gold and
Platinum. Use the existing league face/shadow palette for a dark gold-brown Gold
field and dark blue Platinum field. Lower metalness keeps those colors visible
under the studio lighting instead of reflecting a near-black environment.

Reduce Platinum's family mark to 50 percent of its former width/height, preserving
its center and proportions in both SVG miniatures and physical browser relief.
The reverse engraving and the Diamond/Legend flat-table placements remain. No
new geometry, textures, theme literals, dependencies or API changes are added.

Validation: production-renderer review covers Gold/Platinum fronts, oblique
rotations, reverse views and 390 px bounds. One canvas and the existing resource
budget are retained. The 75 geometry/artwork contracts and strict UI/web/mobile
types pass; generated-theme and frontend-boundary checks pass. Physical device
GPU acceptance remains separate.

### Integrate Prism collectibles into profile detail navigation — PR 212

Open a dedicated medal detail view when selecting a profile miniature. Compose
one shared header, stage, objective/progress copy and orientation controls across
desktop, PWA and native. Keep collection filters, pagination and scroll position
mounted while inspecting. Desktop reuses the native Dialog and restores focus;
Back/Escape returns to the profile before dismissing it. Native uses the same
Modal, safe areas and Android Back semantics. Key the complete profile by
account/target and the native viewer by medal/owner/theme.

Keep the 3D stage outside scrolling content and scroll only the bounded metadata.
Cancel touch scrolling without blocking the document pointer listeners used by
OrbitControls. Let CSS own the canvas bounds, update only the render buffer, and
fit the camera to portrait/landscape while preserving relative zoom. Add one
narrow studio reflection card and a soft rim light. Rendering remains event-driven,
with one live scene, bounded pixel ratio, context-loss fallback and retry.

Native iOS/Android lazily load react-native-webview 13.16.1 and the offline HTML
asset generated from the exact shared Three.js renderer. No duplicated model or
native GL implementation is introduced. Validate sequenced bridge messages, keep
owner text out of executable HTML, reject stale instance replies, deny remote
navigation/file access/shared cookies, pause drawing on background and recover
from renderer/process failure. Frontend CI checks the generated asset byte for
byte. A new native client build is required for the WebView module.

Validation: 81 geometry/artwork contracts, 8 focused portable/DOM tests and all
19 native contracts pass. The existing web Node suite passes (26 test files).
Twelve production Chromium flows cover six front/reverse finishes, context loss,
keyboard/focus return, profile/collection/recap regressions, real vertical touch
rotation and pinch without page scrolling, and 320×667/390×844/844×390/768×1024
bounds. Production web/PWA builds and iOS/Android Hermes exports succeed; both
native packages contain the exact 951,988-byte local viewer. Platform source-map
checks exclude the other app/platform. Strict frontend/test types, application
lint, formatting, generated-theme and boundary checks pass. Captures use fixture
profiles. Physical WKWebView/Android gestures, GPU performance and native binary
installation remain device acceptance; exports and Chromium do not prove them.
