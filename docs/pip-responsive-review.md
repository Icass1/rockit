# Picture in Picture review [KB-24]

## Implemented behavior

- Five content layouts: compact artwork overlay, narrow/tall stack, vertical stack, horizontal
  media/details split, and larger artwork stack. Measure the viewport instead of
  letting oversized body content determine the layout.
- Media and text cannot expand their grid tracks. Artwork and horizontal/vertical
  video retain their aspect ratios. Long song/artist names use ellipsis and full
  text tooltips.
- Primary controls stay inside the viewport. A viewport-bounded options menu
  exposes shuffle, repeat, favorites, lyrics, and vinyl even in compact layouts.
  Larger vertical layouts also show shuffle/repeat directly.
- Reuse the existing vinyl renderer and session preference, including reduced
  motion. Selecting a non-song does not display vinyl or song lyrics.
- Use the actual videoUrl field instead of the nonexistent videoSrc field. The
  existing muted video preview follows the main player's time and play/pause;
  playback ownership remains with the main player.
- Keep keyboard focus visible, restore focus when closing lyrics/menus, close
  lyrics with Escape, and finish a seek on pointer cancellation or blur. Disable
  seeking for radio and unknown duration.
- Scope PiP CSS to its document, inject it once per mounted document, and clean
  up on unmount. Avoid a separate external font request and concurrent opens.

## Verification performed

Chromium: 118 passing unique viewport/content combinations across 28 sizes, using real React components
with isolated state adapters, a local photo, and generated local WebM videos.
No JavaScript errors or primary controls outside the viewport were observed.

Viewport sizes:

- 160×120, 220×220, 259×320, 260×219, 260×220, 299×160, 300×160.
- 320×240, 320×420, 360×640, 480×160, 640×180.
- 480×320, 480×480, 640×360, 800×450, 1200×300.
- Narrow/tall: 160×320, 160×480, 180×640, 200×800, 220×600, 240×720.
- Long bars: 640×120, 800×120, 800×140, 960×160, 1200×160.

All 28 sizes were tested with a photo, horizontal video, and vertical video.
Radio and no-current-media cases cover the original 17 sizes. The 300×160 and
480×160 cases were rechecked with all five content states after updating the
bar layout. The default command now includes all five states for all 28 sizes;
that full 140-case expansion has not been run. Titles and artist names include long phrases and long
unbroken strings. Checks exercise play/pause, previous/next, menu actions,
shuffle, all repeat modes, favorites, lyrics navigation, vinyl, keyboard seek,
pointer cancellation, and menu Escape behavior.

Additional checks: empty lyrics, broken artwork fallback, native video playback
and pause, lyrics Escape, and the report's filter/zoom controls.

A real Document Picture in Picture window opened, mounted one PiP style element,
responded to its play button, and closed with the opener's state reset. Headless
Chromium reported a 1280×720 native PiP viewport despite the requested initial
size. The size matrix therefore validates the content renderer in browser
viewports, not operating-system window resizing.

TypeScript and ESLint pass. Clean root and frontend installations have been
verified with pnpm 11.0.8 and --frozen-lockfile. The Playwright lock entries
include the optional Darwin dependency fsevents@2.3.2; all snapshot dependency
references resolve.

## Repeat the browser checks

From frontend/apps/web, after installing workspace dependencies:

```sh
pnpm exec playwright install chromium
pnpm test:pip
```

FFmpeg must be on PATH to create bounded local video fixtures. The suite uses an
isolated local HTTP server and does not require the backend or a user account.
It prints the temporary directory containing results.json and all screenshots.

Optional overrides:

```sh
PIP_CHROMIUM_PATH=/usr/bin/chromium \
PIP_REPORT_DIR=/tmp/rockit-pip-results \
pnpm test:pip
```

PIP_TEST_SIZES accepts a JSON array of width/height pairs; PIP_MEDIA_CASES accepts
comma-separated song, landscape, portrait, station, or empty for a focused run.

## Remaining review

Review the gallery and test the integrated app with real playback, browser zoom,
window resizing, and the browser's native PiP minimum dimensions. These fixture
checks do not validate backend operations, production audio synchronization, or
browser/OS combinations outside the tested Chromium environment. Keep KB-24 in
To Review until that integrated review is complete.

## Integrated lyrics follow-up (KB-24)

Low-height bars now place metadata and playback controls on one row. A dedicated
lyrics button is visible beside playback controls. Expanded windows share the
media area between artwork and lyrics, with playback and seek controls available;
wide windows show them side by side. Compact bars and cover-only minis show the
current line instead. Escape exits lyrics and returns focus to the lyrics button.
The current track result survives view toggling and resizing. Static lyrics are
shown when synchronized lyrics are unavailable. Transparent letterboxing remains.

Targeted follow-up: 18 cases across six content viewports (400×100, 180×640,
320×420, 640×360, 260×220 and 160×120), with song artwork and both video
orientations. The earlier 118 cases describe the previous iteration, not a fresh
complete run of this revision. Isolated adapters and native-window limitations
listed above still apply.

## Cover-derived palette and rounded media (KB-24)

PiP reuses the existing dominantColor metadata and Home's parseDominantColor
helper, without additional image analysis or requests. A lightened cover accent
colors active lyrics, playback, seeking, hover and keyboard focus; the background
has a subtle cover tint. Missing color uses the existing neutral fallback. The
image/video element itself has rounded corners, including letterboxed media.

Verified 15 fixture cases across 400×100, 180×640, 320×420, 640×360 and 160×120
(song and landscape/portrait video), plus native Document PiP opening and closing.
Checked live palette updates for gold, teal, purple, black, white and missing
color, matching lyrics/play/slider colors and preserved image aspect ratio.
TypeScript, targeted ESLint and Prettier checks passed. These are isolated fixture
checks; integrated production playback and real cover metadata remain for review.
