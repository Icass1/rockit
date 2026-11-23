# Lyrics retrieval, timing and reviewed corrections

## Baseline and claims

The user's approximate baseline is 30% synchronized satisfactorily, 40% present
but misaligned, and 30% missing (70% present overall). This is user-reported, not
a measured benchmark. CI fixtures verify behavior, not an improvement percentage.
No live audio alignment, listening evaluation, or production migration was run.

## Finding text and preserving musical versions

LRCLIB previously used only `/api/get` with album and duration, stopped on 404,
required the nonstandard `lyricsfile` field, and ignored integer LRC timestamps.
Lookup searches by title/artist without album or duration constraints. An exact
word-synced result can return immediately; line-synced and plain results remain
fallbacks while the bounded searches look for word sync. A search failure preserves
the best canonical result already found.
At most five HTTP requests (one exact lookup and four deduplicated searches),
a 10-second per-request timeout and a 20-second overall network budget, one closed
client, and at most 100 examined entries per search. The unified provider bundle fetches both lyric forms once.

Unicode comparison first normalizes compatibility characters, composed/decomposed
accents, invisible formatting, whitespace and apostrophe/dash presentation. It
preserves original display text and meaningful symbols. Canonical identities with
accents take priority over relaxed alternatives, regardless of duration score.
Only when none is found does a second Latin-only comparison remove diacritics and
expand Latin letters such as ligatures/stroked letters. It does not romanize Greek,
Cyrillic, CJK or other scripts or discard their combining marks. This is not fuzzy
spelling correction or an artist-alias database.

Search uses original, cleaned and Latin-folded parameters, with a final title-only
query to escape a server artist filter that missed diacritics. Every result still
passes local artist/title/version gates. All bounded search results are inspected
before accepting a relaxed identity; if folding collapses distinct canonical
artist/title/version identities, no automatic choice is made. An incomplete search
cannot authorize a relaxed identity. A valid canonical plain-text exact match is
preserved if fallback search fails. No normalization mutates source lyrics or names.
Optional unused name/release metadata and absent lyric forms do not invalidate an
otherwise identified entry; invalid non-finite/negative durations are rejected.

Artist and recording version are identity gates. Presentation labels and an exact
artist prefix are removable; versions in titles AND track-named singles/EPs are
retained. Parentheses and spaced dashes are equivalent; Single/EP packaging is
ignored. The Hype inside The Hype (Berlin) or The Hype (Alt Mix) cannot be used for
the studio request. Explicit live/session albums also qualify the recording.
No artist/song-specific exception or popularity fallback is used. Conservative
matching can still miss inconsistent artist credits or ambiguous release labels.

Identity-compatible candidates prefer usable word sync, then line sync, then
plain text, then no lyrics. Album and duration break ties within a sync tier. They never establish
alignment: an extra second at the end does not imply an offset; an extra second
at the start might. Even equal-length edits can have different vocal timing.
The earlier +/-3-second rule for hiding timed lyrics has been removed. Original
provider timestamps remain available and are described as unverified provider
timing, not verified by duration. No time scaling or invented offset is applied.

## Existing cache and LRC input

Entries without word timing are retried through LRCLIB on every lyrics request.
Plain entries can gain line or word sync; line entries
can gain word sync. Upgrades preserve cached plain text and the stored offset and
never downgrade an existing sync tier. Word-synced entries need no upgrade lookup.

Lyricsfile 1.0 YAML supplies line and word starts and optional ends in milliseconds.
Safe, bounded parsing rejects unsupported versions, aliases and duplicate keys.
Word text must reconstruct its complete line, including spaces; invalid word data
falls back to the line text. Invalid files fall back to legacy LRC and plain lyrics.
The cache stores word segments and optional line ends in migration 8. API DTOs carry
these fields through reviewed source snapshots, web, PiP and native playback. Display
may infer a missing word end from the next word or line end; inferred ends are never
stored. Dump import supports both legacy and Lyricsfile-enabled SQLite schemas.
Fresh source imports recognize integer/decimal timestamps, repeated timestamp tags
and LRC offset metadata in milliseconds; parsed events are sorted by source time.
No published correction is sent to the external LRCLIB service.

## Source data and Rockit overlays

Use existing core.user_request rows with requestType LYRICS as an append-only
review history and effective overlay. Original LRCLIB rows and timestamps are not
edited by proposals or approval. The existing lrclib.lyrics.offset is the legacy
baseline; the latest compatible approved overlay supplies the effective offset and
optional edited text/times. Offset-only overlays retain source word timing; edited
line text or timestamps use line sync. Word data participates in revision hashes,
while legacy line-only source hashes remain compatible.

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

Regression tests cover identity and album-only versions, malformed input,
word/line/plain preference, Lyricsfile precision and fallback, legacy and new dump
schemas, LRC offsets/repeated tags, cache upgrades, correction compatibility,
word highlighting, seeking, and subscription cleanup. Backend and web suites,
focused frontend tests, DTO generation, formatting, lint and workspace type checks
run locally. PostgreSQL persistence tests need a dedicated test database; native
playback needs device or simulator verification.

For functional measurement, use a fixed set with examples from all three baseline
groups, including originals/live/remixes, equal-duration displaced audio, added tail
silence, intro/dialogue and middle edits. Record text availability separately from
provider timestamps, admin-approved corrections and observed vocal timing error at
multiple points. Recheck the SAME files and lyrics after changes. Until that review,
report implementation and CI results, not improved production percentages.

API reference: https://lrclib.net/docs
