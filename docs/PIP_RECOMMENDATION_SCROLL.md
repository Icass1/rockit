# PiP vinyl and recommendation scrolling

VinylRecord used the opener's global requestAnimationFrame and cancellation even
when React rendered the disc through a Document PiP portal. The loop now uses the
disc's ownerDocument.defaultView for both operations. The same acceleration, gradual
pause and rotation are retained. It adds no timers, audio operations or playback
state changes; reduced-motion handling remains at the existing callers.

The shared fixed-row virtualizer calculated startIndex solely from scrollTop. The
queue scroll container also contains non-virtual recommendations. Once the viewport
moved below the queue, startIndex could exceed itemCount, producing an ever-larger
top spacer and invalid start/end ranges. Clamping to the actual item count keeps
indices bounded and the sum of spacers plus rendered row heights constant. Both
desktop and mobile queues use this contract. Recommendations keep their natural
height in the desktop flex container.

Pointer/keyboard scroll intent suppresses desktop auto-follow during manual
navigation. Explicit follow operations retain smooth scrolling; the container no
longer applies smooth behavior to every programmatic scrollTop correction.
Recommendation selection, loading, pagination APIs, queue playback and providers
are unchanged. No new visible text or Vocabulary entries are needed.

## Directed verification

A local Chromium harness used the actual Queue, AutoplayRecommendations, virtualizer
and VinylRecord components, with fixed recommendations and simulated media/context
boundaries. It compared the previous source from develop with the corrected source.
With three queued songs and 80 fixed recommendations, the previous scroll height
varied from 5511 px to more than 7400 px during repeated scrolling. The corrected
height remained 5511 px across all six passes. Returning upward restored all queue
rows; a metadata refresh while using the scrollbar did not force the view back to
the playing item. The recommendation count stayed 80 and loaded once.

With the opener animation clock deliberately suspended, the previous disc remained
static while the corrected disc's transform continued changing in the secondary
window. Frame cancellation on unmount, independent documents, pause/resume and
bounded virtual geometry have regression fixtures for CI. TypeScript, ESLint, Ruff
and diff checks were used; local test suites were not run.

This checks the scheduling and layout mechanisms in Chromium with local fixtures.
It is not an OS-level Vivaldi minimization test or an end-to-end test of live Rockit
recommendations. The secondary window in the harness is a popup, not the native
Document PiP surface. Targeted evidence and screenshots are outside Git in
/workspace/artifacts/pip-scroll. Physical-browser verification remains appropriate.
