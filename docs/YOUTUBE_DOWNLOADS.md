# YouTube downloader operations

The downloader prefers `mweb` with a generated GVS proof-of-origin (PO) token.
A successful metadata extraction does not prove that the media transfer will
complete: missing or invalid tokens can cause HTTP 403 after playback bytes have
already been downloaded. A 403 alone does not establish an IP block.

Upstream references:

- [yt-dlp PO Token Guide](https://github.com/yt-dlp/yt-dlp/wiki/PO-Token-Guide)
- [bgutil provider setup and verification](https://github.com/Brainicism/bgutil-ytdlp-pot-provider)
- [JavaScript challenge solver setup](https://github.com/yt-dlp/yt-dlp/wiki/EJS)

## Deploying

Compose explicitly connects the backend to `http://pot-provider:4416`. The
provider stays on the internal Compose network, without a published host port.
Standalone installations must set `YTDLP_POT_PROVIDER_URL` themselves.

Keep the Python plugin and sidecar pinned together. This deployment uses:

| Component | Version |
| --- | --- |
| yt-dlp | 2026.8.19 |
| bgutil plugin and sidecar | 2.0.2 |
| yt-dlp-ejs | 0.8.0 |
| JavaScript runtime | Node.js 22 or newer |

EJS is installed in the image rather than fetched from GitHub during downloads.
MP3 and MP4 jobs use the same runtime configuration. MP4 format selection still
prefers H.264/AAC and applies faststart during merging.

Build and recreate the services together:

```sh
ROCKIT_BUILD_REVISION="$(git rev-parse HEAD)" docker compose build backend
docker compose pull pot-provider
docker compose up -d pot-provider backend
docker compose logs --since=5m backend pot-provider
```

Startup diagnostics report the image revision, installed versions, Node version,
plugin discovery failures, sidecar reachability and major-version mismatches.
`unknown` for the revision means the build argument was omitted. Readiness is
checked again before downloads, with a 60-second cache so recovery does not
require a backend restart. Missing runtime/plugin packages and incompatible
provider major versions require operator action and do not automatically retry.
An unreachable provider is transient and retries with ordinary backoff.

A successful `/ping` only checks reachability and version compatibility. It does
not prove token generation or a complete transfer works. Look for provider
discovery and `Generating a player PO Token` or `Generating a gvs PO Token` messages, then run a full smoke check.
Verbose headers, signed URLs and proxy credentials are excluded from downloader
logs. Do not enable raw yt-dlp traffic logging on production instances.

## Full transfer checks

The diagnostic uses the same format, runtime, provider and transport options as
application jobs. It does not create download rows, change library media or
write permanent output. Temporary media is deleted when the command exits.
The default strategy is explicitly `mweb+pot`; a missing provider cannot silently
pass the diagnostic through a fallback client.

```sh
# Extract metadata/formats only; this does not prove media transfer succeeds.
docker compose exec backend python -m backend.youtube.diagnose \
  'https://www.youtube.com/watch?v=ktyhXq00RxQ'

# Download the complete video and audio, merge, and validate with ffprobe.
docker compose exec backend python -m backend.youtube.diagnose \
  'https://www.youtube.com/watch?v=ktyhXq00RxQ' --download --format mp4

docker compose exec backend python -m backend.youtube.diagnose \
  'https://www.youtube.com/watch?v=ktyhXq00RxQ' --download --format mp3
```

Repeat full MP3 and MP4 checks for several known public uploads, including a
longer video. Exit status 0 with `Full download validated` confirms positive
duration and the expected audio/video streams. Verify an application download
in beta afterward to cover the database, websocket and media-storage path.
Use `--strategy android_vr` or `--strategy web_safari` to investigate a fallback
independently. Perform these checks on the actual deployment host: another
network's success does not validate production egress.

## Video quality

MP4 downloads prefer the highest available compatible resolution up to 1080p,
then frame rate and video bitrate. H.264/AAC remain preferred for Safari.
Combined HLS formats and separate video/audio formats participate in the same
comparison; a 360p video-only format must not beat a 1080p combined stream.
Merging copies the source streams without resizing or re-encoding them.

The downloader first asks every configured client for at least 720p. It only
accepts a native SD source after every client reports that no matching HD format
is available. SD is also rejected when YouTube reports omitted format URLs, a
SABR-only catalogue, or formats skipped for missing tokens. Those warnings do
not establish that the upload itself is limited to SD. An HD transfer error is retried or tried with another client;
it does not silently become permission to download a 360p fallback. This can
make a blocked HD source take longer or fail pending a retry rather than appear
as a completed low-quality download.

Final download diagnostics include width, height, frame rate and stream bitrate.
A final resolution below 720p produces a warning. The diagnostic command also
prints these fields after ffprobe validation. Resolution is limited by the
upload: for example, `ktyhXq00RxQ` exposes at most 1280x720, while `obkrMiyDrbs`
exposes 1920x1080 at 60 fps in the verified format catalogue.

Changing the downloader does not upgrade existing library files. Use the media
context menu's redownload action to replace a previously saved low-quality file
after deploying the change. The video streaming endpoint serves the stored file
bytes directly, so a saved 360p file remains 360p during playback.

## Fallback and retry policy

With a configured provider the order is `mweb+pot`, `android_vr`, `web_safari`,
then optional cookie and proxy strategies. Without a provider only fallback
clients are available. yt-dlp skips formats that require missing tokens; the
application never forces `formats=missing_pot`. Web PO tokens cannot satisfy
Android or iOS token requirements.

| Failure | Handling |
| --- | --- |
| Media HTTP 403 | Fresh extraction through another client/candidate; long backoff if exhausted |
| HTTP 429 | Stop the client ladder; long backoff and record a global throttle |
| Explicit bot challenge | Try alternatives; record a block if all candidates fail |
| Private/removed/restricted video | Do not retry as a network failure |
| Missing runtime/plugin or incompatible provider | Fail with configuration error; repair deployment |
| Provider outage, network or conversion error | Ordinary retry policy |
| No matching format | Try another client; do not infer a global IP block |

YouTube and Spotify wrappers preserve these result codes for the scheduler.
Ordinary retry delays are 30s, 2m, 10m, 30m. Rate-limited retries use 5m, 30m,
1h, 2h, and never start before the shared cooldown expires. The breaker counts
fully exhausted bot challenges and explicit throttling, not every 403 or missing
format. Before switching strategy, only partial files belonging to that download
are removed. Missing final output is a failure, never a successful partial file.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `YTDLP_POT_PROVIDER_URL` | Compose: `http://pot-provider:4416`; standalone: unset | Token provider URL |
| `YTDLP_COOKIES_FILE` | unset | Optional Netscape cookies file for authenticated fallback |
| `YTDLP_PROXIES` | unset | Optional comma-separated proxy URLs |
| `YTDLP_SOURCE_ADDRESS` | unset | Local source address |
| `YTDLP_RATE_LIMIT_BYTES` | 0 | Optional throughput cap; 0 disables |
| `YOUTUBE_MIN_REQUEST_INTERVAL_SECONDS` | 3 | Minimum spacing between extraction starts |
| `YOUTUBE_BLOCK_THRESHOLD` | 5 | Exhausted challenges/throttles before cooldown |
| `YOUTUBE_COOLDOWN_SECONDS` | 900 | Shared cooldown duration |

If verified token-backed transfers still receive 403s, compare the same versions,
video and options from another network to isolate egress-related behavior.
Neither tokens, cookies nor proxies guarantee success. Cookies are not required
for the default strategy. Keep any optional credentials out of logs and PRs.

To roll back, restore the previous backend image and its matching provider image
together. Recreate both services and repeat readiness checks.
