# Experimental web song transitions

The web player now has an opt-in first implementation of the short, conservative
transitions auditioned with Jumpsuit / Happy Ending → Pet Cheetah. It does not
implement the earlier 126 BPM long blend, tempo matching or instrument separation.
No audio files, Python processing, audio libraries or external services are added.

## Trying it

In **Settings → Audio**, enable **Song transitions (experimental)**, then start
the next song. Settings are saved on this browser/device, independently of the
old server crossfade setting (which did not drive a mixing engine).

- Maximum overlap: 0.8, 2 or 3.5 seconds. The actual overlap may be shorter.
- Keep endings within the same album: enabled by default. This skips overlap
  between songs with the same known album ID, preserving interludes conservatively.
  Disable it to test mixes between the supplied Twenty One Pilots album tracks.
  It is not a claim of sample-accurate gapless album playback.
- Disabling cancels any current overlap; the next song returns to a fresh native
  audio element. Reloading with the feature off also uses the original path.

Test the end of a song normally. Seeking straight to its last seconds deliberately
uses the short fallback because there is insufficient energy history.

Only audio songs crossfade in this iteration. Videos, stations and repeat-one use
their existing playback paths. The Expo player is unchanged.

## How it works

The player reads a 512-sample analyser at most five times per second, storing at
most 128 timestamped energy samples from the last 24 seconds. It compares a
reference window 20–12 seconds before the end with the recent four seconds. A
quiet tail selects up to 3.5 seconds, a moderate tail 2 seconds, and a strong or
insufficiently observed tail 0.8 seconds. This is a live approximation of the
offline excerpt heuristic, not a vocal/phrase/interlude detector. It never seeks
past the incoming intro, fetches PCM windows, or decodes whole files for analysis.

Two persistent audio elements use native streaming and one mixer AudioContext.
Each deck has a fourth-order Linkwitz–Riley split at 180 Hz; mids/highs cross
smoothly and the complementary low-band transfer starts later. Gains are scheduled
with AudioParam on the audio clock. The shared master reserves headroom (0.6), so
the experimental route is quieter than ordinary playback at the same volume.
No playback-rate changes or artificial effects are applied.

The next track must be a playable, buffered song and the current client must own
playback. The automatic handoff follows the existing base-player end/queue/WS
protocol: it reports one logical end and requests the new identity normally.
The outgoing tail is retained, but incoming audio stays paused until its server
grant. On slow acknowledgement the old track can finish before the next starts;
the feature does not bypass ownership to hide network latency.

The old deck's ended event cannot advance the new song. Pause, seeks, manual
navigation, settings changes, remote revocation and an audible incoming stall
cancel the overlap. A prepared deck's initial waiting event retains the old tail.
The retired element becomes the next preloader. Sources are connected once per
element and discarded native elements are used when leaving the experimental
route. A routed stream error retries once without Web Audio/CORS on a fresh native
element; ordinary native errors still follow existing error handling.

Cross-origin routed audio needs credentialed CORS, matching the backend's allowed
frontend origins. The mixer has its own context; the existing iOS silent audio,
keepalive context, audio session and Media Session actions remain independent.

## Validation and remaining device testing

Automated tests cover energy decisions, two successive deck promotions, server
grants/revocation, late acknowledgement, outgoing-end deduplication, pause/seek/
skip/disable, initial waiting and stalls, insufficient buffering, album protection,
repeat-one, native retry and the native video-audio path. Existing iOS playback
and streaming/service-worker tests remain part of the web test command.

A foreground Chromium 154 test with generated streaming audio exercised this
actual MediaPlayerManager: the new deck started while the old tail was still
playing, exactly one end was reported, and pause stopped both. This is not a
measurement of iPhone battery, latency or background reliability.

Before enabling broadly, test installed PWA on real iOS 26 and 27 separately:
multiple automatic transitions while locked; lock before/during a transition;
lock-screen play/pause/next/previous; seek/skip during overlap; Bluetooth and phone
interruptions; offline files, weak network, authenticated streams and remote
ownership changes. Also listen and test on Firefox and desktop Safari. Background
JavaScript scheduling can be delayed: fades already scheduled use the audio clock,
but arming a new transition still requires a running page. If it cannot arm, the
ordinary end handler remains responsible for the next track.
