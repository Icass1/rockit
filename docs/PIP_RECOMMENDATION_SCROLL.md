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
These scrolling changes do not alter queue playback or pagination. No new visible
text or Vocabulary entries are needed.

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

## Recommendation artwork and external-first preference

The autoplay footer sent empty artwork to the legacy authenticated backend path
/image/song-placeholder.png. That path now looks up storage objects, so it is not
an appropriate static fallback. Recommendation artwork now uses the bundled
/song-placeholder.png for missing images and failed image loads, in both the
footer and recommendation cards.

Discover items previously discarded artwork even when their matched local song
already had it. The existing batched resolution now supplies that cover (or its
album cover). Generic external suggestions preserve optional image_url through
cache serialization; Last.fm alone parses its image array and ignores empty
values, the service's known placeholder, and unsupported URLs. Next image patterns
allow its two artwork hosts. Storage and persisted media are unchanged. Missing
artwork is resolved lazily as described below. Last.fm frequently omits images in track.getSimilar; these now trigger lazy
track.getInfo album-art lookup rather than stopping at a placeholder. Existing cached entries without
image_url remain valid and gain external artwork on their normal cache refresh.

At the user's request, usable external discoveries now replace local picks in
recommendation displays. Autoplay uses one bounded related-songs request with
external discovery enabled, keeping loading visible until the answer arrives;
empty, unavailable or unconfigured discovery falls back to the local songs in
that same response. Queue exclusions and deduplication still apply. Core does
not import or select concrete integrations; the provider registry remains in
charge of external recommendations. Playback and transition engines are unchanged.

A directed Chromium fixture verified the real artwork component with missing,
404 and valid URLs: missing/broken covers loaded the bundled asset, valid covers
retained their URL. The real queue builder selected external picks exclusively,
and local picks for an empty external answer. This used controlled image responses,
not a live Last.fm request. Evidence: covers-review-results.json alongside the
other artifacts. Regression coverage for artwork propagation/cache compatibility
and external priority/fallback is included for CI; local suites were not run.

## Lazy album-art lookup for missing covers

Preserving an image field cannot solve track.getSimilar payloads with no images.
The Last.fm provider now exposes the generic optional artwork capability using
track.getInfo, which can return album.image. Returned artist and title must match
normalized requested identities (including version words) before using a cover.
The same CDN/placeholder validation applies. If the album is absent there too,
no cover is invented and the local placeholder remains.

An authenticated /recommendation/artwork endpoint validates bounded provider,
artist and track query parameters and delegates through the external provider
registry. Core contains no Last.fm imports, API URLs or service-specific rules.
It does not download audio, create media, or touch S3/the database. DTO and HTTP
client changes are generated from the backend.

The web artwork manager and actual artwork component load missing or failed
external covers only near the viewport. Known working covers need no lookup.
Two frontend requests at a time and shared in-flight promises avoid duplicate
work across rows/cards. The backend also has two artwork slots, a bounded queue,
an eight-second total deadline, existing Last.fm pacing, and at most 2,048 cached
tracks: successful artwork lasts a day, a confirmed absence one hour, transient
failure 30 seconds. Artwork requests are separate from discovery/playback so
slow images do not delay the recommendation list. This adds a bounded metadata
request per uncached visible missing cover, not a lookup of the whole list.

Directed Chromium verification used the real component and manager with controlled
responses: two Belief rows issued one lookup; a working cover issued none; a
below-fold row issued none until scrolled into view; a broken cover was replaced;
an absent album stayed on the placeholder. Peak concurrency was two and no page
errors occurred. Evidence: /workspace/artifacts/pip-scroll/lazy-covers-results.json.
Provider/API regressions cover track.getInfo parsing, identity/version mismatch,
positive/negative caching, in-flight sharing, failure isolation, authentication
and input bounds. Manager cache/concurrency coverage is included for CI. No local
test suites were run. These are controlled checks, not live Last.fm evidence.
