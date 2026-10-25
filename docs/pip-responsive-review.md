# Picture in Picture review [KB-24]

## Implemented behavior

- Four content layouts: compact artwork overlay, vertical stack, horizontal
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

Chromium: 85 passing viewport/content combinations, using real React components
with isolated state adapters, a local photo, and generated local WebM videos.
No JavaScript errors or primary controls outside the viewport were observed.

Viewport sizes:

- 160×120, 220×220, 259×320, 260×219, 260×220, 299×160, 300×160.
- 320×240, 320×420, 360×640, 480×160, 640×180.
- 480×320, 480×480, 640×360, 800×450, 1200×300.

Every size was tested with a photo, horizontal video, vertical video, radio,
and no current media. Titles and artist names include long phrases and long
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

TypeScript and ESLint pass. Cold installation of the entire monorepo was not
verified: offline package metadata was incomplete, and automatic approval review
for the online metadata check failed due to a usage limit. The lockfile change
is limited to Playwright and its core package; application dependencies are
unchanged.

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
