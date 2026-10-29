# Lyrics retrieval, timing and reviewed corrections

## Baseline and claims

The user's approximate baseline is 30% synchronized satisfactorily, 40% present
but misaligned, and 30% missing (70% present overall). This is user-reported, not
a measured benchmark. CI fixtures verify behavior, not an improvement percentage.
No live audio alignment, listening evaluation, or production migration was run.

## Finding text and preserving musical versions

LRCLIB previously used only `/api/get` with album and duration, stopped on 404,
required the nonstandard `lyricsfile` field, and ignored integer LRC timestamps.
Lookup now keeps the exact fast path and searches by title/artist without album
or duration constraints on a miss. If exact lookup has only plain text, search
can still find compatible timed lyrics; a search failure preserves that plain text.
At most three 10-second HTTP requests, one closed client, at most 100 examined
entries per search. The unified provider bundle fetches both lyric forms once.

Artist and recording version are identity gates. Presentation labels and an exact
artist prefix are removable; versions in titles AND track-named singles/EPs are
retained. Parentheses and spaced dashes are equivalent; Single/EP packaging is
ignored. The Hype inside The Hype (Berlin) or The Hype (Alt Mix) cannot be used for
the studio request. Explicit live/session albums also qualify the recording.
No artist/song-specific exception or popularity fallback is used. Conservative
matching can still miss inconsistent artist credits or ambiguous release labels.

Album and duration rank identity-compatible candidates. They never establish
alignment: an extra second at the end does not imply an offset; an extra second
at the start might. Even equal-length edits can have different vocal timing.
The earlier +/-3-second rule for hiding timed lyrics has been removed. Original
provider timestamps remain available and are described as unverified provider
timing, not verified by duration. No time scaling or invented offset is applied.

## Existing cache and LRC input

Existing text, timed lines and offsets are not bulk rewritten. A cached plain-only
entry is retried at most once per minute per process (bounded 1024-entry cache),
adding ONLY missing synchronized lines. It preserves cached text and the stored
offset, and rereads them after an upgrade. Existing timed entries stay unchanged.
Fresh source imports recognize integer/decimal timestamps, repeated timestamp tags
and LRC offset metadata in milliseconds; parsed events are sorted by source time.
No published correction is sent to the external LRCLIB service.

## Source data and Rockit overlays

Use existing core.user_request rows with requestType LYRICS as an append-only
review history and effective overlay. Original LRCLIB rows and timestamps are not
edited by proposals or approval. The existing lrclib.lyrics.offset is the legacy
baseline; the latest compatible approved overlay supplies the effective offset and
optional edited text/times. There is no schema migration or S3 configuration change.

- A proposal contains an absolute effective offset (-120 to +120 seconds), optional
  full lines and the revision the user previewed. Times must be finite, ordered,
  nonnegative and either present for all lines or absent for all lines. Text-only
  proposals and proposals for locally downloaded songs with no provider lyrics
  are supported. Up to 1000 lines of 2000 characters are accepted.
- The server binds it to a digest of source lyrics, baseline offset, source public
  ID and media identity, plus a hash of the local storage object's recorded revision
  (public ID, etag, size and update timestamp). No object reads, writes, deletes or
  fingerprint analysis are needed for this identity. A provider-neutral capability
  performs the read through each provider's owned table. Unknown local identities
  leave source lyrics usable but disable correction submission/application.
- This is an object metadata revision, not an acoustic fingerprint. Out-of-band
  object replacement without updating recorded metadata cannot be detected here.
- Pending/rejected proposals never affect playback. Admin approval rechecks the
  revision under a media lock and marks the request accepted in the same transaction.
  Competing approvals from the same baseline cannot silently overwrite each other.
  Repeating an identical review is idempotent; terminal reviews cannot be reversed.
- At read time only the newest compatible accepted proposal applies. Source or audio
  replacement invalidates incompatible overlays; original rows remain untouched.
  Later offset-only proposals preserve earlier approved text edits.
- Historical unstructured lyrics requests cannot be automatically executed: submit
  a new structured proposal. Old generic metadata proposals remain manual requests.
- The old direct LRCLIB timestamp PATCH returns 410, closing an unmoderated path
  that overwrote cached source timestamps.

## Playback, preview and review

All web players, PiP, native mobile and preview use shared timing helpers:

    effective line time = source timestamp - effective offset

Thus a source event at 10 s heard at audio 11 s needs offset -1 s. Highlighting and
line seeking use the same formula; only the actual seek is clamped to zero (and
the preview's known duration). Real playback time is never moved or rescaled.

A unified authenticated context endpoint returns timed OR plain text, effective
offset, provider/approved status and the current proposal revision. Web, mobile
web, PiP and native mobile display plain text when no timed lines exist. This fixes
the former behavior where timed-lyrics failure hid available plain lyrics.

The existing metadata dialog contains a separate lyrics proposal editor. It allows
local audio preview, reversible offset adjustment, line text/time edits and an
explicit submission for admin review. Editing lyrics is no longer bundled inside
an opaque generic METADATA request. New UI strings live in Vocabulary.xlsx in
English, Spanish and French; shared vocabulary types and DTO/HTTP client are generated.

Admins can lazily open a comparison of current/proposed text and timing and listen
to the actual recording. Review errors are displayed instead of silently accepting
an unapplied change. UI approval invalidates mounted web lyric views in that window;
other clients retrieve changes on the next load. No new polling or push system is
introduced. Source data in provider-specific legacy GET endpoints remains raw;
players use the generic effective context endpoint instead.

The UI asks reviewers to compare beginning, middle and end. A stable delay may be
fixed with an offset; a changing delay needs line corrections or another edition.
Approval means reviewed, not an algorithmic proof that every line is correct.
Automatic reliable alignment would require evaluated speech/text alignment against
the actual audio; it is not implemented or implied by metadata matching.

## Verification and release review

No local test suites are run by user preference. CI regressions cover identity and
album-only versions, malformed input, exact/plain fallbacks, LRC offsets/repeated
tags, preserving existing text/offset on cache upgrade, overlay invalidation for
source/audio changes, latest revision selection and moderation before acceptance.
Formatting, static types, generation and diff checks can run locally.

For functional measurement, use a fixed set with examples from all three baseline
groups, including originals/live/remixes, equal-duration displaced audio, added tail
silence, intro/dialogue and middle edits. Record text availability separately from
provider timestamps, admin-approved corrections and observed vocal timing error at
multiple points. Recheck the SAME files and lyrics after changes. Until that review,
report implementation and CI results, not improved production percentages.

API reference: https://lrclib.net/docs
