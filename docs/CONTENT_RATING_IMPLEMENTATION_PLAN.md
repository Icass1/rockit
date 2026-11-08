# Persisted content rating and download-refresh follow-up

Stack: PR191 → `feat/explicit-metadata-redownload-refresh` → PR192.
Implementation is complete; production backfill and user/device acceptance remain
explicit follow-ups. Required CI is checked separately on the final commit.

## Required outcomes

1. Persist content rating with provenance, read it from our backend on playback and
   Library views, integrate downloader ingestion and a bounded existing-library
   backfill, and allow reviewed Edit Metadata corrections.
2. Reproduce and correct stale provider/recording metadata after a redownload in
   mixed-provider queues and playlists, preserving the current queue occurrence.

## Classification policy

- States are unknown, explicit and clean. Missing metadata is not clean.
- Structured publisher/provider metadata and a reviewed manual correction are
  stronger than guesses based on a track title or a word list.
- Provider adapters interpret their own source fields. Core stores and coordinates
  generic evidence; it imports no YouTube/Spotify-specific implementation.
- Spotify's explicit=false can mean unknown as well as not explicit according to
  its API reference. Do not promote that value to confirmed-clean automatically.
- Identity matters: source ID/ISRC/recording and version must agree. A clean edit,
  remix or live recording must not inherit an unrelated recording's label.
- A profanity list cannot reliably classify recording content across languages,
  homographs and editions. It must not silently produce authoritative clean labels.
- Manual decisions take precedence over automatic ingestion. Backfill is bounded,
  resumable/idempotent and does not download or rewrite audio/S3 objects.

References checked during implementation (details in CONTENT_RATINGS.md):
https://developer.spotify.com/documentation/web-api/reference/get-track
https://ytmusicapi.readthedocs.io/en/stable/reference/search.html
https://ytmusicapi.readthedocs.io/en/stable/reference/browsing.html

## Implementation checklist

- [x] Read current provider, downloader, queue, edit-request and persistence paths.
- [x] Reproduce stale mixed-queue metadata with controlled HTTP data; guard completed-download refresh.
- [x] Implement identity-safe shared refresh, preserving duplicate queue occurrences.
- [x] Add rating persistence and typed backend requests/responses.
- [x] Interpret source evidence inside providers; ingest in downloader.
- [x] Implement bounded existing-library backfill and reviewed manual edits.
- [x] Generate DTOs and vocabulary; display persisted explicit labels.
- [x] Add focused backend, DOM/native, HTTP-contract and mixed-queue regressions.
- [x] Publish incremental commits and enable all required checks on the stacked PR.
  The final CI result is recorded in PR192; it is not inferred from local tests.

Existing inspected behavior: Spotify raw DTOs contain explicit but do not persist
it. Edit Metadata creates review proposals. A completed download dispatches a media
completion event; the queue has no listener that refreshes recording metadata.
These are findings, not yet a complete explanation of the reported mixed-list crash.

## Queue-refresh checkpoint

Shared queue refresh listens for completed download messages and patches all
occurrences and page caches by identity, preserving queue-item IDs, selection and
playback. Collection refresh rejects old-lifecycle/wrong-ID replies and handles
transport failures. Generic media lookup now converts empty successful provider
lists to NOT_FOUND instead of indexing an empty list. These are demonstrated
refresh/robustness defects; they do not yet establish every cause of the reported
production mixed-playlist failure. Focused checks: 25 queue tests and four empty-
provider tests pass; desktop TypeScript passes. Full final gates remain pending.


## Rating checkpoint

Migration 5 adds nullable evidence, provenance and an atomic manual-override guard
to core.media. Provider-owned source interpretation, downloader ingestion, bounded
local/cache-only pages, optional remote CLI refresh and reviewed metadata choices
are implemented. DTOs are generated; all new labels are in Vocabulary.xlsx for
en/es/fr. Unknown-only PostgreSQL VALUES batches use typed Boolean NULLs.

See CONTENT_RATINGS.md for the design, source references, operator commands,
proven behavior and coverage limitations. No production scan or S3 operation was
performed. Both Kanban cards are To Review pending the user's validation.
