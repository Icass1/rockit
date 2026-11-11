# Cached boundary-silence analysis [KB-13]

PR144 implements optional boundary analysis for web song transitions. Original files are never modified or re-encoded. Audio timestamps and lyrics retain their original clock. No new DJ engine, presets, tempo processing, waveform editor or queue redesign is included.

## Operation

The authenticated `GET /media/song/{public_id}/audio-bounds` dispatches through a generic provider capability. Spotify, SpotifyScrapper, YouTube Music and RockIt resolve their own local file using their access layers; unsupported providers return unavailable. Core contains no source-specific branches, imports or paths. Live radio, video and the native Expo player retain their playback paths.

On a miss, return pending without waiting for decoding. A non-blocking `flock` in `MEDIA_PATH/.audio-boundaries` permits one analysis task across API worker processes sharing that directory. There is **no pending server job queue**: busy callers can retry; the web client attempts at most six requests with bounded HTTP timeouts. Ten distinct files can therefore fall back to ordinary playback instead of accumulating jobs. Separate hosts require a shared coordinating worker or deployment-level limit; local disk locks alone do not coordinate them.

FFprobe reads duration and channel count. FFmpeg decodes at most 20 seconds at each edge, one codec/filter thread, low process priority. Analysis uses 48 kHz float PCM, 10 ms blocks, the peak over all channels, a -60 dBFS threshold, at least 0.5 seconds of boundary quiet and a 150 ms safety margin. Keeping channels separate avoids cancellation of antiphase material and preserves single-channel audio. Peak reduction runs off the event loop. No mono downmix or low-rate analysis discards audible high-frequency intro detail.

A gradual intro is **not** classified as wholly silent until the loud part begins: the first block above the conservative threshold anchors entry. Below-threshold sound can still be skipped; this is an amplitude detector, not a perceptual or semantic detector. Entirely silent windows, very short or multichannel sources, missing tools, errors and uncertain duration retain ordinary playback. Internal pauses are untouched. The detector deliberately leaves some quiet rather than risk cutting music.

Each subprocess has a 15-second timeout and 8 MiB stdout cap; cancellation kills and reaps children. Shutdown cancels active jobs. Cache identity includes canonical file path, inode, size, nanosecond mtime and analyzer version. Publication checks identity again and replaces metadata atomically. Failures back off for 60 seconds; at most 2048 cache entries are retained. Keep this directory persistent and shared by workers. FFmpeg, FFprobe, `nice` and Linux `flock` are deployment prerequisites; unavailable tools degrade to normal playback.

## Playback

Only query current/preloaded song metadata while transitions are enabled. Validate returned bounds against native media duration. Prepare the incoming seek and require buffering around that original-clock position before promoting its deck. Trigger overlap relative to the outgoing audible end; retain that endpoint throughout the fade, including a delayed playback grant. Reuse the existing ownership, queue handoff, repeat-one, album protection and cancellation behavior.

Late metadata never jumps an already playing intro. A first track on a cold cache can play its original intro; subsequent prepared transitions use confirmed entry bounds. Explicit seeks/resume are preserved. Missing/stale metadata, network failures and insufficient buffering use the previous playback path. No playback or database transaction waits for the background decoder.

There is no new user-facing text in this change, so no vocabulary keys are introduced. The feature follows the existing experimental song-transition setting.

## Evidence — 27 October 2026

Targeted experiments were executed rather than local application test suites. Environment: Linux x86_64, Intel Xeon Platinum 8573C (container quota: two CPUs), Chromium using real HTMLAudioElement streams and Web Audio. This is a development container, not production hardware.

Two short musical fixtures from [pydub test data](https://github.com/jiaaro/pydub/tree/master/test/data), `bach.ogg` (about 3 s) and `party.mp3` (about 6.6 s), were examined unchanged, then repeated into 25-second excerpts with known 2-second leading and 3-second trailing silence. These are **controlled excerpts, not two complete catalog songs**. Additional 30-second fixtures cover gradual amplitude growth, no silence, internal pauses, one active stereo channel, antiphase stereo, an entirely silent file and a 10 kHz signal.

- Original musical fixtures: no boundary removal.
- Padded excerpts: entry 1.85/1.87 s; end 27.15 s in 30-second files.
- Gradual fixture: actual quiet ends at 2 s, then a growing signal; entry 2.53 s, before its first above-threshold block, retaining the quiet rise rather than jumping to full volume.
- Internal pause and no-silence fixtures: original 0–30 s retained.
- One-channel, antiphase and 10 kHz fixtures: correct 1.85–27.15 s boundaries.
- Entirely silent fixture: unavailable, no fabricated seek interval.
- Measured full analysis wall time: approximately 200–423 ms, depending on excerpt. Child-process CPU and raw results are in the measurements JSON. This includes decoder startup and analysis; no production throughput claim follows from these numbers.
- Two separate Python processes: the first claimed the host slot; the second immediately returned busy. Both exited cleanly.
- Ten simultaneous metadata requests for the same cold source: one active task; pending responses together in 17.4 ms. Ten warm requests together: 4.8 ms, no remaining decoder tasks. These are service calls in one process, **not ten authenticated users streaming**.

In Chromium the actual MediaPlayerManager, shared base player and mixer were bundled with a fixture queue and simulated HTTP metadata/ownership transport. Both the musical pair and progressive-intro pair promoted once, overlapped before 27.15 s, entered the second deck at its detected original-clock position and ended without duplicate queue advancement or page errors. Pause stopped playback. Recordings capture the real mixer output. This does not validate authenticated multi-device WebSocket ownership or iOS background playback.

Artifacts in the task workspace: `/workspace/artifacts/audio-silence/`: `measurements.json`, `experiment.py`, `browser-music.json`, `browser-gradual.json`, `transition-music.mp3`, `transition-gradual.mp3`, and `boundaries.svg`. Audio files are deliberately not added to the repository.

Regression cases were added for CI without running local suites. Before marking Done, review the audio examples; validate real iPhone/PWA and production latency/CPU/I/O with concurrent streaming and multiple workers. CI checks code correctness but does not replace those listening/device checks.
