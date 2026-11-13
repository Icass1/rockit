# Prism medals

The profile collection keeps six league silhouettes and shared metal/family
palettes. Selecting an emblem opens the browser inspector on desktop and the
Expo web PWA. Miniatures remain SVG; the Three.js runtime is imported only when
an inspection is mounted. Native APKs retain the static medal and objective
without importing Three.js or adding a native GL dependency.

## Artwork and engraving

`emblemArtwork.ts` is the source for league outlines and the sixteen family
motifs. Miniatures clip motifs to a reserved interior and omit overlaid logos
and numeric labels. Three.js builds beveled extrusions from those same outlines;
raised tubular contours give the motif physical depth and react to studio light.
The league metal and colored enamel come from shared semantic theme tokens.
Legend uses a convex central cup with a polished inward bevel, real inner walls
and an almost flush enamel field, only 0.012 model units below the lip.
Legend uses exact flat SVG stroke geometry for the metal inlay, preserving corners
and straight segments instead of resampling them through a smoothing spline.
Nine double-sided faceted crystals form its crest, including two small upper
rhombi. Front and rear crowns meet directly at a shared equator, without a flat
central belt. Neighboring stones have a small clearance and remain closed solids;
the smaller crystals have proportionate depth. The enamel
and rear plates follow the core rather than copying the wing silhouette, keeping
them clear of the crystals. Miniatures use the same core, well and crystal layout.
Eight small instanced metal claws seat the side-crystal roots against the rim on
both faces. Metal and enamel use uniform smooth roughness without a grain map.
No post-processing, remote textures or animation loop is introduced.

The reverse carries the original RockIt! vector logo, the viewed profile's
existing username, a Roman rank and the persisted award date without a timezone
suffix. Locked medals have no award date. No legal name or surname is inferred or stored.
Names are drawn into a fitted canvas texture, never interpolated into SVG/HTML.
The logo is cut into the rear plate using the original vector contours, including
recess walls, a deeper floor and the enclosed metal islands. Text uses bump and
subtle occlusion maps, avoiding per-letter geometry. This is a visual collectible,
not a manufacturing model.

## Interaction and cost

The viewer uses Three.js ExtrudeGeometry, SVGLoader, OrbitControls and a local
RoomEnvironment. There are no remote HDR images, fonts or texture services.
Pointer/touch rotation, pinch/wheel zoom, arrow keys and explicit front/reverse/
reset controls are available. The surrounding profile retains textual objective,
progress and award details for assistive technology.

Rendering happens on control changes, resizing and returning to a visible page.
There is no animation loop, auto-rotation or continuous reduced-motion effect.
Pixel ratio is capped at two, textures are bounded, and each profile has at most
one active inspector. Closing, changing medal/account or unmounting releases
controls, observers, listeners, geometries, materials, textures and the WebGL
context. Initialization failure and context loss retain a static preview.

## Verification

Fast geometry contracts check closed, consistently wound cup/crystal meshes and
a genuinely recessed central face. Other contracts cover Roman ranks, bounded
collection rendering, inspection controls, cleanup and the unavailable-WebGL
fallback. The browser flow exercises
actual WebGL rendering, front/reverse selection, close/reopen and simulated
context loss. Native component checks cover the static profile path. Browser
captures use synthetic profiles and award dates. Physical iPhone GPU acceptance
is separate from Chromium checks.

Three.js references: [ExtrudeGeometry](https://threejs.org/docs/#ExtrudeGeometry),
[OrbitControls](https://threejs.org/docs/#OrbitControls) and
[SVGLoader](https://threejs.org/docs/#SVGLoader).

## Next league

Diamond color and facet differentiation from Legend remains a separate design
pass. This refinement changes Legend only; the other five forms keep their
existing geometry and palette.

Design reference for the single-medal refinement:
[Three.js Graphics Builder](https://github.com/majidmanzarpour/threejs-game-skills/blob/main/skills/threejs-aaa-graphics-builder/SKILL.md),
using its form-first, material-role and bounded-rendering guidance.
