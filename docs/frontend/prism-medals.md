# Prism medals

The shared collection has six league designs. SVG miniatures and the browser
inspector use the same silhouettes, gemstone contours, family palette and frames.
The existing 615 achievement identities, thresholds and dates are preserved.
The expanded catalog has 903 achievements across 64 families and six leagues,
providing 384 family/league artwork combinations.

## Visual progression

| League   | Construction                                                                 |
| -------- | ---------------------------------------------------------------------------- |
| Bronze   | Round bronze coin, concentric polished rim and family inlay.                 |
| Silver   | Rhombus, stepped silver bevels and a smooth matte metal center.              |
| Gold     | Octagonal gold frame around a large hexagonal amber step-cut gem.            |
| Platinum | Four-point star frame and a teal rhombus-cut crystal.                        |
| Diamond  | Blue octagonal gem, additional stepped facets and angular side frames.       |
| Legend   | Violet pick-shaped gem with the approved Resonance cut and split metal arcs. |

Bronze uses a 96-segment contour and a smooth SVG circle. All six leagues carry the same
filled family symbol in both the static miniature and the inspector. Gemstone
leagues retain their existing cuts, transparency and restrained pavilion tints.
Family names and objectives remain available in the profile UI.
League silhouettes and colors stay stable, rather than changing with each family.

`medalShapes.ts` owns the die paths and cuts. `medalGeometry.web.ts` builds closed
front crowns, reflective internal pavilions and supporting frames. Gemstones have
flat bases entirely in front of the reverse plate. There are no detached shard
clusters, center belts or mechanical claws. Uniform material roughness avoids the
previous grain texture. Gold and Platinum use satin inset fields with dark
gold-brown and dark blue league tones, respectively, matching the miniature
palettes. Their low metalness retains the hue between the gem and polished
frame under studio lighting.

## Family symbols

`emblemFamilies.ts` owns 64 original filled vector marks on one 32-unit grid.
The 48 additional families reuse the approved six league shapes and add their
own distinct master symbols. They use substantial silhouettes and open counters instead of thin outline icons,
fonts or emoji. The waveform, clock, vinyl, compass, flame, plane, companions, video,
infinity, checked calendar, crescent, dawn, ticket, book, jubilee crown and keyhole
provide a distinct visual identifier for every family.

The badge's known `scope` takes precedence over historical `visualVariant` values.
Some legacy session/time awards originally reused artwork from another family;
this presentation resolver keeps them consistent without changing award records.
Unknown variants have a safe fallback. Shared profile, web collection, inspector
fallback and native SVG adapters all pass the scope through.

`createMedalInlay` extrudes the filled symbol with real top faces, counter walls
and thin side walls. It clips the symbol against existing crown facets and follows
their surface height. This keeps the full mark visible above the gemstone without enlarging its table
or replacing its cut. Diamond and Legend use smaller league-specific placements
so their complete family relief stays on the flat table, with clearance from the
sloped facets. Platinum uses a half-size family mark at its original center;
Gold retains its existing surface-following placement. Tops are
0.016 world units above the surface, with a 0.014-unit metal thickness. Metal is
drawn after the glass transmission capture so its silhouette does not create
repeated refraction ghosts inside the gem. The reverse is unchanged.

## Reverse and inspection

Each reverse preserves the original RockIt! vector logo cut into the metal, the
viewed profile's existing username, persisted award date and Roman rank. Locked
medals have no award date. No legal name or surname is inferred or stored.

The brand's contours, recess walls, floor and enclosed metal islands are physical
geometry. The cut is fitted proportionally inside narrow plates without changing
the logo's proportions. Names, dates and Roman ranks use bounded canvas text and
subtle bump/occlusion maps. Platinum's compact text layout fits its star-shaped
plate. User text is never interpolated into SVG or HTML.

Both profile hosts open a dedicated medal detail view from a miniature. The collection
stays mounted while inspecting, retaining its filters, page and scroll position.
The desktop host reuses its existing Dialog: Back/Escape first returns to the
collection and restores the trigger; a second Escape closes the profile. Native
uses the same Modal, safe areas and Android Back behavior. Account/target changes
replace the entire profile scope.

The common detail composition keeps the interactive stage outside every ScrollView;
only the bounded objective/status copy scrolls. Pointer/touch rotation, pinch/wheel
zoom, arrow keys and shared front/reverse/reset controls operate one canvas. Touch
scrolling is canceled at the stage, while captured pointer moves/up must propagate
to the document listeners used by OrbitControls. CSS owns the canvas dimensions;
the renderer updates only its drawing buffer. The camera fits portrait and landscape
bounds and preserves relative zoom across resize. Closing, changing medal/account
or losing the context releases resources. Initialization/context failure retains
the shared SVG miniature and offers retry.

Native iOS/Android use react-native-webview 13.16.1 to host the exact shared Three.js
renderer in a bundled local HTML asset, rather than maintaining a second geometry
implementation. The document contains all code, shapes and studio lighting; it
makes no network requests and needs no native GL package. A validated, sequenced
message bridge carries badge data, owner text, theme colors and orientation controls.
User text is never inserted into executable code. Stale instance replies are
ignored; duplicate commands do not replay. AppState pauses drawing in background.
The local document denies network connections/navigation; file access and shared
cookies are disabled. Process/context failures retain the static preview with retry.
A new native development/release build is required for WebView; Metro reload is
insufficient for older clients.

Generate the checked-in document with `pnpm build:medal-embed` after changing the
renderer; `pnpm check:medal-embed` in frontend CI checks it byte for byte. The
asset cache stores only static code, never user data.

## Compact detail and rarity

A two-icon overlay on the stage flips between front/reverse and resets the view.
Both controls retain localized accessible names and full touch targets. Gesture
instructions remain available as a hidden accessible description on web and a
native accessibility hint, without a visible instruction/button-text block.
The footer contains the editorial name with Roman tier, one short objective
story, and a compact league/date-or-progress/rarity row. It does not repeat the
family name. Family names/stories share one vocabulary-driven helper across the
collection and detail hosts; secret objectives keep their server redaction.

Use the server’s `holderPercentage`, formatted to exactly two decimals in the
current locale. Missing rarity stays hidden rather than becoming a false zero;
zero holders renders zero. The people icon has a localized screen-reader label
explaining that this is the proportion of all registered RockIt users. See the
backend collection guide for snapshot and population semantics.

## Rendering budget and verification

Rendering happens only on interaction, resizing and returning to a visible page.
There is no animation loop, automatic rotation, post-processing or remote asset
request. Local studio reflection cards are baked once per inspector and released
after environment creation. An additional narrow reflection card and soft rim light
make metal edges respond while rotating without an animation loop. Coarse pointers use a pixel-ratio ceiling of 1.5;
desktop uses two. Only selected medals load the Three.js runtime.

The family-symbol Chromium review measures resource counts for all six designs
and the most detailed marks; see the current validation entry in the frontend
progress log. Rendering retains one selected canvas and at most five textures. These are resource counts, not
physical iPhone frame-rate measurements. Phone bounds and coarse-pointer pixel
ratio are checked separately. Physical iPhone GPU acceptance remains a device
check; Chromium does not establish Safari performance.

Fast contracts cover closed/wound crowns, flat gem bases, the round bronze
contour, complete symbol coverage and positive relief clearance on every gem facet,
open counters, legacy family resolution, original-logo containment in all six plates, lifecycle,
context-loss fallback and bounded profile rendering. Browser flows cover all six
finishes, front/reverse, close/reopen, keyboard/focus restoration and recovery.
Real Chromium touch input verifies rotation and two-finger zoom without page
scroll. The bundled native document is tested separately with the same renderer,
including stale commands, safe text and background/resume. Native adapter tests
cover the bridge, rejected navigation, process failure/retry and AppState cleanup.
Production iOS/Android exports verify packaging and platform imports; these do not
establish physical WKWebView/Android GPU or gesture performance. Captures use
synthetic names and award dates.
