# Cached boundary-silence analysis [KB-13]

Status: design only. Implementation is paused for a later session.

## Goal

When song transitions are enabled, skip confirmed leading and trailing silence
so the configured crossfade overlaps audible music. Keep original files,
internal pauses, and the original playback clock used by lyrics.

This work is independent of the frontend fixes in PR #143. The configurable
crossfade changes in that PR are an integration dependency, not part of this PR.

## Proposed implementation

1. Resolve a downloaded song's local file through the existing
   controller → framework → access layers. Do not accept arbitrary file paths or
   remote URLs from the client. Initially support Spotify downloads and RockIt
   uploads; leave live radio and video playback unchanged.
2. Return cached bounds immediately. On a cache miss, enqueue a background job
   and return a pending response. Playback continues with the original bounds;
   neither an HTTP request nor playback waits for FFmpeg.
3. Use FFprobe to obtain the file duration and FFmpeg's silencedetect filter to
   inspect bounded head and tail windows. Start with a maximum of 20 seconds
   per edge, one decoder thread, one filter thread, and low process priority.
   Validate accurate tail seeking for each supported format. Ambiguous or
   unsupported cases retain the original bounds.
4. Detect only silence connected to the start or end of the file. Initial
   parameters for testing: -55 dB, at least 0.5 seconds of silence, and a
   0.1-second safety margin around audible material. These are provisional:
   validate soft intros, fades, noise floors, and stereo channels before release.
   An entirely silent or unusually short file must not produce invalid bounds.
5. Store start, end, and source duration in a shared disk cache, keyed by file
   identity, size, modification time, and analysis-version settings. Write
   atomically; invalidate after replacement or redownload. Do not copy or
   re-encode the song. Choose a persistent shared directory and define a cache
   cleanup policy before implementation is considered complete.
6. In the player, seek to the confirmed intro boundary only for a fresh track
   start. Schedule the crossfade against the confirmed outro boundary.
   Preserve explicit seeks, resumed positions, playback ownership, pause/skip
   behavior, album protection, and repeat-one semantics. Do not rebase time:
   lyrics continue to use the original media position.
7. Request bounds for the current and preloaded next song, only while
   transitions are enabled. Coalesce client requests and use bounded pending
   retries. Do not jump suddenly when late analysis arrives during playback;
   apply intro bounds on a future fresh start and use outro bounds only if
   still safely ahead of the current position.

## Resource and failure limits

- One active analysis process per backend host, including multiple API workers.
  An in-process semaphore alone is insufficient; use a shared worker or
  cross-process lock. Multiple hosts require deployment-level coordination.
- Deduplicate the same source across users and workers. Bound pending jobs
  (initial target: 32 per host); a full queue falls back to normal playback.
- Bound subprocess lifetime and captured output. Kill and reap subprocesses on
  timeout, cancellation, and shutdown; release locks in all cases.
- Cache failures briefly to prevent repeated retries for corrupt or unsupported
  files. Missing FFmpeg, read-only storage, or analysis failures never prevent
  ordinary playback.
- Check the source fingerprint again before publishing a result. Validate
  finite bounds with 0 ≤ start < end ≤ duration.
- Run blocking filesystem work outside the event loop. Never hold a database
  transaction open while waiting for an analysis job.

## Acceptance and verification

- Real generated audio fixtures cover leading silence, trailing silence,
  silence at both ends, no silence, internal pauses, entirely silent files,
  stereo with one quiet channel, soft intros, and gradual fades.
- Ten simultaneous users requesting one uncached song produce at most one
  successful analysis for that fingerprint; all requests return without waiting
  for decoding. Cached requests do not spawn FFmpeg.
- Requests for distinct files respect the global process limit and bounded queue,
  including across two worker processes. Test timeout, cancellation, failed
  analysis backoff, restart cache reuse, and source replacement.
- Measure cold and warm API latency, event-loop responsiveness, CPU, and disk I/O
  with ten concurrent playback clients, against playback without analysis.
  Record the hardware and results; concurrency limits alone are not evidence
  that performance is unaffected.
- Frontend tests cover intro seeks, crossfades ending at the audible boundary,
  unchanged lyric timestamps, late results, user seeks, resume, album/repeat
  protection, disabled transitions, missing metadata, and offline playback.
- Verify on a real iPhone/PWA before promoting KB-13 to Done.

## Tracking

- Kanban tag: kb-13.
- Branch: feat/audio-silence-analysis.
- Keep future implementation commits marked [KB-13].
- Move the card to In Progress when implementation resumes, and To Review after
  the required checks. This draft does not implement silence skipping.
