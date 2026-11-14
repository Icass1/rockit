# Prism medals

The shared collection has six league designs. SVG miniatures and the browser
inspector use the same silhouettes, gemstone contours, family palette and frames.
The existing 615 achievement identities, sixteen families, thresholds and saved
award dates are unchanged.

## Visual progression

| League | Construction |
| --- | --- |
| Bronze | Round bronze coin, concentric polished rim and family inlay. |
| Silver | Rhombus, stepped silver bevels and a smooth matte metal center. |
| Gold | Octagonal gold frame around a large hexagonal amber step-cut gem. |
| Platinum | Four-point star frame and a teal rhombus-cut crystal. |
| Diamond | Blue octagonal gem, additional stepped facets and angular side frames. |
| Legend | Violet pick-shaped gem with the approved Resonance cut and split metal arcs. |

Bronze uses a 96-segment contour and a smooth SVG circle. Bronze and Silver keep
precise family engravings; gemstone leagues use restrained family tints inside
their pavilion. Family names and objectives remain available in the profile UI.
League silhouettes and colors stay stable, rather than changing with each family.

`medalShapes.ts` owns the die paths and cuts. `medalGeometry.web.ts` builds closed
front crowns, reflective internal pavilions and supporting frames. Gemstones have
flat bases entirely in front of the reverse plate. There are no detached shard
clusters, center belts or mechanical claws. Uniform material roughness avoids the
previous grain texture.

## Reverse and inspection

Each reverse preserves the original RockIt! vector logo cut into the metal, the
viewed profile's existing username, persisted award date and Roman rank. Locked
medals have no award date. No legal name or surname is inferred or stored.

The brand's contours, recess walls, floor and enclosed metal islands are physical
geometry. The cut is fitted proportionally inside narrow plates without changing
the logo's proportions. Names, dates and Roman ranks use bounded canvas text and
subtle bump/occlusion maps. Platinum's compact text layout fits its star-shaped
plate. User text is never interpolated into SVG or HTML.

The browser inspector opens on desktop and the Expo PWA. Pointer/touch rotation,
pinch/wheel zoom, arrow keys and front/reverse/reset controls work on one active
canvas. Closing, changing medal/account or losing the context releases resources.
Initialization or context failure retains the shared static miniature. Native
apps retain the SVG adapter without importing Three.js or a native GL dependency.

## Rendering budget and verification

Rendering happens only on interaction, resizing and returning to a visible page.
There is no animation loop, automatic rotation, post-processing or remote asset
request. Local studio reflection cards are baked once per inspector and released
after environment creation. Coarse pointers use a pixel-ratio ceiling of 1.5;
desktop uses two. Only selected medals load the Three.js runtime.

The six-design Chromium review measured 18–35 draw calls, fewer than 15,000
triangles and at most five textures per view. These are resource counts, not
physical iPhone frame-rate measurements. Phone bounds and coarse-pointer pixel
ratio are checked separately. Physical iPhone GPU acceptance remains a device
check; Chromium does not establish Safari performance.

Fast contracts cover closed/wound crowns, flat gem bases, the round bronze
contour, exact inlays, original-logo containment in all six plates, lifecycle,
context-loss fallback and bounded profile rendering. Browser flows cover all six
finishes, front/reverse, close/reopen and recovery. Native controls retain the
static profile path. Captures use synthetic names and award dates.
