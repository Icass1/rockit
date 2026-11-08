# Player follow-ups on the universal frontend

PR191 is stacked on PR189. Merge the frontend migration first, then retarget this
branch to develop. The parent implementation is kept intact.

## Behavior

- PiP uses one continuous background, integrated close/movement controls, and
  artwork/vinyl click-to-toggle playback. Vertical, compact horizontal and narrow
  layouts retain their controls. Even a 64-pixel-tall wide window stays horizontal.
- Browser Media Session never installs relative-seek handlers. Previous/next track
  and absolute seek remain available; the shared iOS detector also recognizes iPads
  using a desktop user agent. Native Android handlers are unaffected.
- Album redownload resolves all collection pages before deleting anything, deduplicates
  tracks, then checks each deletion and queue request. It stops on failures or account
  replacement. Existing backend admin authorization remains authoritative. Already
  queued tracks are not rolled back if a later request fails.
- Individual album/artist-page collaborator credits accept string and object metadata.
  Mobile cards display every supplied artist, and desktop artist rows preserve all
  names with a complete title. Missing historic credits are not invented or split
  heuristically from band names.
- PiP strings are sourced from Vocabulary.xlsx in English, Spanish and French;
  colors use semantic theme variables. No provider-specific rules were added to core.

## Captures

These are the real React PiP components rendered in local Chromium with synthetic
artwork and mock playback state, not production song artwork or an installed PWA.

| Vertical | Vinyl |
| --- | --- |
| ![Vertical PiP](images/player-followups/pip-vertical.png) | ![Vinyl PiP](images/player-followups/pip-vinyl.png) |

![Compact horizontal PiP](images/player-followups/pip-horizontal.png)

![Ultrathin PiP](images/player-followups/pip-thin.png)

[Narrow 180×560 capture](images/player-followups/pip-narrow.png).

## Verification and limits

The fast frontend gate passed 301 tests (29 Vitest, 8 native Jest, 264 desktop).
The focused provider credit suite passed 11 tests in 1.44 seconds. Workspace types,
formatting and web/mobile lint passed; the full required CI is green at 72dbfc65.
Artwork/vinyl pause and resume were exercised in five Chromium viewports:
320×420, 570×100, 300×420, 760×64 and 180×560.

Actual iPhone system-control presentation still needs device acceptance. Browsers
own native window chrome and can restrict auxiliary-window movement; the custom
handle cannot override that policy. Local captures validate the content UI and
mock playback transitions, not native window positioning or real background audio.
