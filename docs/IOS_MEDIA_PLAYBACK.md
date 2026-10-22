# iOS video and background audio

## Web and installed PWA

On iPhone and iPad, videos with an `audioUrl` use the persistent HTML audio
element as the playback clock. The inline video is muted and follows that clock
while the page is visible. Locking the screen pauses only the picture; unlocking
resynchronizes it with the continuing audio. Pause, seek, repeat and queue changes
are owned by the audio element, so picture events cannot skip or pause the track.
The audio-only preference still hides the picture.

The mobile player attaches the persistent video element to its cover area and
returns it to the parking container on close. Previously this area rendered only
an image, leaving the video in a `display: none` container.

The canvas-stream video unlock was removed: it changed the active player's source,
left it muted, and could asynchronously clear a video selected by the user.
YouTube stream routes also bypass the service worker metadata cache, including
requests without a Range header or media destination.

Audio extracted from video must be served as a stable file with genuine byte
ranges. Mapping requested bytes to approximate timestamps in a new MP3 encoder
does not implement HTTP Range and fails Safari's small initial range probes.
The first request prepares the MP3; subsequent requests reuse it. This adds an
initial preparation delay for uncached videos and uses disk space under
`TEMP_PATH/video-audio`. The deployment's temporary-file retention policy should
include this cache. Source changes produce a new cache key.

## Native app

Both Expo media plugins explicitly enable background playback. The existing
checked-in iOS `Info.plist` already includes the `audio` background mode.
The player now waits for audio-session initialization before loading a source
and sets the video engine to `doNotMix`, matching the audio engine. Otherwise the
idle video engine can reconfigure their shared AVAudioSession to mix with other
apps. Video errors are forwarded into the playback error handler.

The native video player remains persistent with `staysActiveInBackground` enabled;
Expo manages the native audiovisual background playback policy. Rebuild/install
the iOS binary to apply plugin configuration changes. Test a standalone build,
not only Expo Go.

## Automated checks

Run `pnpm --dir frontend/apps/web test` and the backend tests in
`backend/tests/unit/test_video_audio_stream.py` (requires FFmpeg). The web tests
exercise the actual shared playback manager with fake media elements; they do not
simulate WebKit's OS-level suspension. Backend tests verify exact probe/seek/suffix
ranges, real encoding, cache reuse, invalidation, and failed-encoder cleanup.

## Device acceptance checks

Test Safari, an installed Home Screen PWA, and a rebuilt native iOS app on actual
iPhones/iPads. Run against each supported OS version; record the exact version and
device. Linux browser mocks cannot validate iOS suspension or hardware decoding.

1. Start a downloaded video from a user tap. Open the player and check moving
   picture, audible sound, and a single audio output.
2. Seek well into the video and check lip sync. Pause and resume.
3. Lock for at least two minutes. Confirm continuous audio and working lock-screen
   pause/resume/seek controls, then unlock and check picture recovery at the current
   audio position.
4. Repeat with the app in the background, opening another app, and returning.
5. Pause on the lock screen before returning. The picture must remain paused.
6. Skip between video, song and video; allow a track to finish in the background.
   Check that each queue transition occurs exactly once.
7. Close/reopen the full player and rotate the device. Confirm picture attachment.
8. Repeat with audio-only enabled, Bluetooth headphones, and Low Power Mode.
9. Check an existing older download as well as a newly downloaded H.264/AAC MP4.
   Unsupported codecs in old or uploaded files require conversion or redownload;
   changing the player does not convert existing assets.

WebKit owns background scheduling and autoplay permission. Playback must be
initiated by the user; no PWA can guarantee execution after the OS terminates it.
Videos lacking a separate audio source retain ordinary video playback behavior.

## References

- [Apple: Delivering video content for Safari](https://developer.apple.com/documentation/webkit/delivering-video-content-for-safari)
- [Expo SDK 57 video](https://docs.expo.dev/versions/v57.0.0/sdk/video/)
- [Expo SDK 57 audio](https://docs.expo.dev/versions/v57.0.0/sdk/audio/)
