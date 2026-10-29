# LRCLIB lookup and timing

The former lookup called only `/api/get` with artist, title, album and duration.
A 404 ended retrieval. Music-video durations or different album metadata could
therefore hide lyrics available in LRCLIB. In addition, the API model required
`lyricsfile`, which is not part of standard responses, and the LRC parser required
decimal seconds, dropping valid integer timestamps such as `[01:02]`.

## Lookup policy

- Keep the exact lookup as a fast path, checking returned artist/title identity.
- If it is missing, empty, instrumental or has incompatible identity, search by
  artist/title without album or duration. Retry with cleaned presentation labels
  only when the title differs. At most three requests, 10-second HTTP timeout
  per request, one closed async client, and at most 100 records examined per search.
- Normalize Unicode, casing and punctuation. Remove bracketed presentation labels
  such as Official Video and an exact artist prefix. Preserve live/remix/acoustic
  and other version text; do not fuzzy-match different titles/artists.
- Rank eligible records by duration within three seconds, matching album, presence
  of synchronized lyrics, then duration distance and ID for deterministic ties.
  No record is excluded solely because its duration or album differs.
- Treat HTTP/invalid-response failures as errors, not negative lyric matches.
- Accept standard API responses without `lyricsfile`. For synced-only responses,
  derive plain text from parsed lines. Accept integer and decimal LRC seconds.

## Timing and existing data

A successful identity match does not prove synchronized timestamps fit a videoclip.
Intros, dialogue or edits can cause constant or variable offsets. Timestamps remain
as published; do not scale them using the duration ratio or invent an offset.
The existing playback clock and manual offset controls remain unchanged.
Existing saved lyrics and user offsets are not rewritten. Cache hits still use the
saved entry, including entries with plain lyrics only; this change improves missing
lookups and does not bulk-repair historical assignments or audio files.

Regression cases in `tests/unit/test_lrclib_lookup.py` use HTTP fixtures and run in
CI. No local test suites were executed. Formatting, lint and focused type checks
can run locally. Live LRCLIB matching has not been demonstrated in this environment.
The matching deliberately remains conservative about artist spelling and credits.

API reference: https://lrclib.net/docs
