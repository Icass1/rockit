# YouTube Download Reliability

Everything Rockit downloads ends up going through YouTube: Spotify and
SpotifyScrapper tracks are matched to a YouTube video first, and YouTube /
YouTube Music media is fetched directly. This document explains why downloads
were failing, what the pipeline does now, and which knobs to turn in production.

---

## 1. What was breaking

Two independent failures both surfaced to users as "download failed", and both
report as HTTP 429 in the logs.

### 1.1 YouTube Data API quota (the frequent one)

`search.list` costs **100 quota units** and a Google Cloud project gets **10,000
units per day** by default: **100 searches a day, total**.

The old matcher issued up to **two** `search.list` calls per uncached track
(`order=relevance`, then `order=viewCount`). That is **~50 new tracks per day**
across all users, after which every Spotify download failed until midnight
Pacific — and `QUOTA_EXHAUSTED` was not retryable, so those downloads died
permanently rather than waiting for the reset.

### 1.2 YouTube blocking the server's IP

yt-dlp requests were being challenged by YouTube's bot detection. Contributing
factors in the old code:

| Problem | Effect |
| --- | --- |
| One player client, no fallback | Any client-specific gate = hard failure |
| No proof-of-origin (PO) token | Formats filtered out, or 403 from `googlevideo` |
| `retries: 15` | On a 429, 15 more requests, deepening the block |
| Global Chrome `user_agent` | Disagreed with the InnerTube client we claimed to be |
| No request pacing | Bursts of downloads look exactly like scraping |
| No shared cooldown | Every queued download kept hammering a blocked endpoint |
| URL cached before download | A permanently-403 video was reused on every retry |

---

## 2. What the pipeline does now

### 2.1 Search: three backends, cheapest first

`backend/youtube/framework/youtubeSearch.py`

1. **YouTube Music** (`ytmusicapi`, unauthenticated) — free, no quota, and
   returns album and duration, which makes matching materially better.
2. **yt-dlp `ytsearch`** — free, no API key.
3. **YouTube Data API** — the old path, now a last resort.

Candidates are scored on title (40%), artist/channel (30%) and **duration
(30%)**. Duration is the strongest signal for rejecting covers, live cuts and
extended edits, and the Data API cannot provide it without a second charged
request.

The search returns the **top 3 candidates**, not one.

### 2.2 Download: two nested fallback loops

`backend/youtube/framework/youtubeDownloader.py`

```
for candidate video in top 3 matches:
    for strategy in the ladder:
        pace  ->  attempt  ->  classify failure
```

The strategy ladder (`ytdlpStrategies.py`), cheapest and least detectable first:

| # | Strategy | Requires | Notes |
| --- | --- | --- | --- |
| 1 | `android_vr` | nothing | No PO token, no JS player. Fastest. |
| 2 | `ios` + `formats=missing_pot` | nothing | Different gate; often works when 1 fails |
| 3 | `web_safari` + PO token | `YTDLP_POT_PROVIDER_URL` | First-class client |
| 4 | `tv_simply` + PO token | `YTDLP_POT_PROVIDER_URL` | |
| 5 | `tv_downgraded` + cookies | `YTDLP_COOKIES_FILE` | Authenticated |
| 6 | `android_vr` / `ios` via proxy | `YTDLP_PROXIES` | Rotates the exit IP |

Failures are classified (`ytdlpErrors.py`) into `BLOCKED`, `UNAVAILABLE`,
`TRANSIENT` or `UNKNOWN`. Only `BLOCKED` walks the ladder and moves to the next
candidate video; `UNAVAILABLE` (removed, private, geo-blocked) stops immediately
instead of burning six attempts on a video nobody can download.

This is not theoretical. Measured on a residential IP **without** a PO token
provider, downloading "Bohemian Rhapsody":

```
run 1  candidate 1 (Art Track)  android_vr 403, ios 403
       candidate 2              android_vr 403, ios 403
       candidate 3              android_vr OK -> 8.0 MB, 350.6 s mp3

run 2  all three candidates     403 on every strategy
```

The old pipeline had no answer at all for either run; the ladder converts some
of these into successes. But note what run 2 says: **without a PO token provider
the PO-token-free clients only cover part of the catalogue.** Auto-generated
"Art Tracks" (the `... - Topic` uploads YouTube Music search prefers) are among
the most aggressively gated of all.

Treat `pot-provider` as required for music, not optional. Rungs 1-2 are the
safety net for when it is down, not the intended steady state.

### 2.3 Pacing and the circuit breaker

`backend/youtube/framework/youtubeGate.py` is a process-wide singleton every
YouTube request passes through:

- **Pacing** — a minimum interval between requests plus up to 50% jitter, so the
  whole process behaves like one polite client instead of N racing ones.
- **Back-pressure** — each consecutive block doubles the interval, up to 8x.
- **Circuit breaker** — after `YOUTUBE_BLOCK_THRESHOLD` consecutive *fully
  blocked downloads*, all YouTube work stops for `YOUTUBE_COOLDOWN_SECONDS`.
  Downloads scheduled during the cooldown fail fast with `RATE_LIMITED` and are
  re-queued rather than occupying a worker slot on a request that is going to be
  refused.

A block is counted **once per download**, only when every candidate and every
strategy has been refused. Counting each rung instead would let one gated video
open the circuit on its own, which is normal operation rather than evidence that
YouTube is throttling us.

### 2.4 Retry policy

`downloadsManager.py` now picks a backoff ladder based on *why* the download
failed, and never retries before the shared cooldown expires:

| Failure | Delays |
| --- | --- |
| Ordinary | 30s, 2m, 10m, 30m |
| Rate limited / quota | 5m, 30m, 1h, 2h |

`QUOTA_EXHAUSTED` is now retryable — the daily quota does reset, it just takes
longer than ten minutes.

---

## 3. Configuration

Every variable below is **optional**. With none of them set the downloader still
works using the two PO-token-free clients.

| Variable | Default | What it does |
| --- | --- | --- |
| `YTDLP_POT_PROVIDER_URL` | compose sidecar | bgutil PO token provider base URL |
| `YTDLP_COOKIES_FILE` | unset | Path to a Netscape `cookies.txt` |
| `YTDLP_PROXIES` | unset | Comma-separated proxy URLs, rotated round-robin |
| `YTDLP_SOURCE_ADDRESS` | unset | Local address yt-dlp binds to |
| `YTDLP_RATE_LIMIT_BYTES` | `0` | Throughput cap in bytes/s, 0 disables |
| `YOUTUBE_MIN_REQUEST_INTERVAL_SECONDS` | `3` | Minimum spacing between requests |
| `YOUTUBE_BLOCK_THRESHOLD` | `5` | Consecutive blocks before the breaker opens |
| `YOUTUBE_COOLDOWN_SECONDS` | `900` | How long the breaker stays open |

### 3.1 PO token provider (required in practice)

`docker-compose.yml` already runs it as a sidecar on the internal network:

```bash
docker compose up -d pot-provider
```

Standalone:

```bash
docker run --name bgutil-provider -d --init -p 4416:4416 brainicism/bgutil-ytdlp-pot-provider
```

Then set `YTDLP_POT_PROVIDER_URL=http://<host>:4416`. The matching yt-dlp plugin
(`bgutil-ytdlp-pot-provider`) is already in `requirements.txt`.

> **Keep the two versions pinned together.** The plugin refuses to talk to a
> server on a different major version, and yt-dlp then reports nothing more than
> `Requested format is not available` — indistinguishable from YouTube refusing
> us. `docker-compose.yml` pins the image to the same version as
> `requirements.txt`; bump both in the same commit, never one alone.

**The backend checks this at startup** and says exactly what is wrong:

```
PO token provider ready at http://... (plugin 1.3.2, server 1.3.2)
PO token provider at http://... is unreachable (URLError: Connection refused)
YTDLP_POT_PROVIDER_URL is set but the 'bgutil-ytdlp-pot-provider' plugin is not installed
PO token provider major version mismatch: plugin is 1.3.2, server is 2.0.1
```

If none of those lines appear at boot, the backend is running older code.

### 3.2 Proxies

Residential proxies work; datacenter ranges are mostly pre-flagged by YouTube, so
another VPS is unlikely to help. If the host has an IPv6 `/64`, rotating
`YTDLP_SOURCE_ADDRESS` within it is a cheaper alternative.

### 3.3 Cookies

Export `cookies.txt` from a logged-in YouTube account and point
`YTDLP_COOKIES_FILE` at it. Use a **throwaway account**: YouTube can and does
flag accounts whose cookies are used from a server IP.

### 3.4 Concurrency

`DOWNLOAD_THREADS` and `PROVIDER_CONCURRENCY_LIMITS` in `downloadsManager.py`
still control how many downloads run at once. The gate spaces out request
*starts*; it does not limit parallel transfers. If blocks persist with the
provider running, lower `DOWNLOAD_THREADS` before reaching for proxies.

---

## 4. Diagnosing a block

```bash
grep -E "YouTube block recorded|cooldown active|Strategy '" logs/log_*.log | tail -50
```

| Log line | Meaning |
| --- | --- |
| `Strategy 'x' failed (BLOCKED)` | That client was refused; the ladder continues |
| `Falling back to candidate n/3` | Every strategy failed on that video |
| `YouTube block recorded (n/5)` | Streak building toward the cooldown |
| `Pausing all downloads for 900s` | Breaker open; downloads re-queue automatically |
| `... is unavailable, giving up` | Removed/private/geo-blocked; not a block |
| `[pot:bgutil:http] Error reaching GET .../ping` | The provider is down or unreachable |
| `client https formats require a GVS PO Token` | No token was obtained; this is the cause of `Requested format is not available` |

If `BLOCKED` dominates and the PO token provider is running, the server's IP is
the problem: add proxies or rotate `YTDLP_SOURCE_ADDRESS`.
