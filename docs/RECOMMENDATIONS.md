# Recommendations

Rockit recommends music from two independent sources:

1. **Local engine** (always on, offline, zero setup) — ranks songs this
   instance already knows using Rockit's own data.
2. **Last.fm suggestions** (enabled for everyone when the server has a key) — tracks from
   Last.fm, shown in a separate "Discover" row. They may not
   be on this instance yet; tapping one searches the existing providers once
   and starts a normal download.

External suggestions never replace local ones. If a provider is disabled,
misconfigured, slow, rate limited or returns nothing usable, the response
simply carries no `discover` items and `discoverStatus` tells the client why.

## Endpoints

| Endpoint                                | Seed                                        |
| --------------------------------------- | ------------------------------------------- |
| `GET /recommendation/for-you`           | The user's recent plays and likes           |
| `GET /recommendation/playlist/{id}`     | Every song/video in the playlist            |
| `GET /media/song/{id}/related`          | One song or video                           |
| `POST /recommendation/prepare`          | The next two playback suggestions only      |

All three recommendation endpoints return `SongListResponse`:

```jsonc
{
  "songs": [/* BaseSongWithAlbumResponse: local, playable/queueable */],
  "discover": [/* BaseSearchResultsItem: external, play if publicId, else download */],
  "discoverProvider": "Last.fm",       // or null
  "discoverStatus": "ok"                // "disabled" | "ok" | "empty" | "unavailable"
}
```

## Local engine

Code: `backend/core/access/recommendationAccess.py` (one bounded SQL query
that collects signals) and `backend/core/framework/recommendationRanking.py`
(pure Python scoring + diversity, unit tested).

This is transparent heuristic scoring, not machine learning:

| Signal                                   | Weight | Transform        |
| ---------------------------------------- | ------ | ---------------- |
| Shares a playlist with a seed            | 3.0    | `log1p(count)`   |
| Played within 20 min of a seed (session) | 2.0    | `log1p(count)`   |
| Shares an artist with a seed             | 1.5    | `min(count, 2)`  |
| Same album as a seed                     | 0.75   | yes/no           |
| Shares a genre with a seed               | 1.0    | `log1p(count)`   |
| Plays across the instance (popularity)   | 0.25   | `log1p(count)`   |

* Ties break on `public_id`. A stable hash of the user, song and six-hour
  period gives a bounded exploration bonus; equal inputs within that period
  stay stable. Recently repeated songs are penalized using the user's own
  play count over the last 14 days: `score / (1 + 0.6 * log1p(plays))`.
  This is broader than simply repeating the user's two-week top list.
* **Diversity:** a greedy re-rank multiplies a candidate's score by 0.6 per
  song already picked from the same artist (0.8 per same album), and no artist
  may exceed 30% of the list while alternatives exist.
* **Exclusions:** the seed/current track; "For you" excludes the five most
  recently played songs. Older familiar music remains eligible as fallback,
  so a small library does not disappear once it has been listened to.
* **Cold start:** if history is too sparse to fill the list, it is padded with
  a rotating pool from the instance, ranked with popularity and diversity. An empty library returns
  empty lists.
* **Cost:** at most 300 candidate rows per query; ranked lists for "For you"
  and "related" are cached in memory for 60 seconds (playlists are not cached
  because they change right after a suggestion is added).
* Genres only exist for providers that store them (currently Spotify artist
  genres). Missing artist/album/genre data is simply a missing signal.

## Last.fm

Code: `backend/core/framework/externalRecommendation/`. Last.fm is the only
production external provider. The provider interface keeps HTTP retrieval
separate from caching, deadlines, deduplication and local matching.

Every user uses the same server-side `LASTFM_API_KEY`. Last.fm receives only the
artist and title of one seed track through `track.getsimilar`; no Last.fm user,
shared secret, authentication token or per-user settings are needed. Home uses
a recent/liked track; playlist and related requests use a track from that context.
The local engine supplies personal ranking and remains available independently.

**Rate limits & resilience:**

* The shared Last.fm provider spaces requests at least 250 ms apart per process.
* HTTP 429 is retried once, only when the requested wait is at most 2 s.
  Timeouts, connection errors and 5xx are not retried.
* Each provider call has a hard deadline (2 × the per-request timeout).
* Failed seeds have a five-minute in-memory backoff.
* Successful answers are cached in `core.cache_external_recommendation` for
  `RECOMMENDATION_EXTERNAL_CACHE_HOURS` (default 24 h); empty answers for one hour.
  Failures are not persisted as successful cache entries.
* Without a key, with no usable seed, or on failure, Rockit serves its local
  recommendations. No user action or settings screen is required.

## Configuration

Local recommendations: nothing to configure.

Server configuration (one key for every user):

```env
LASTFM_API_KEY=...                                      # enables Last.fm
RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS=5
RECOMMENDATION_EXTERNAL_CACHE_HOURS=24
```

Restart the backend after setting `LASTFM_API_KEY`. Last.fm discovery is enabled
for every user automatically; there is no per-user opt-in or credentials form.

## Limitations

* Rockit stores no MusicBrainz IDs, so external suggestions are matched to
  the local library by fuzzy artist + title (`pg_trgm`, conservative
  thresholds). Downloading one runs a single provider search on tap.
* Recently *recommended* (as opposed to played) songs are not persisted.
  Rotation changes every six hours; recent actual plays affect the next ranking.


## Home and Up next

Web and mobile Home reuse the same personal feed in the hero carousel,
Quick Selection (interleaved with familiar music) and recommendation cards.
External discoveries remain recognizable as downloads. A local-only request
(`external=false`) renders first; the external response is additive and cannot
hold up Home or playback when Last.fm is slow.

The player shows recommendations after the original queue in desktop, compact
PWA and native mobile layouts. Repeat ONE and ALL retain their normal behavior;
repeat OFF continues with one ready recommendation at a time. When nothing is
playable, playback stops instead of looping without permission. Radio stations
do not seed music autoplay. Pending downloads can be skipped in favor of a
ready local fallback. Already queued songs are excluded.

## Playback preparation

GET requests never download anything. Only active playback on its owning device,
with repeat OFF and within the last two positions of the queue, may call
`POST /recommendation/prepare`. The real queue occupies the same two-song
lookahead window: with one queued song remaining, prepare one recommendation;
with none remaining, prepare two. At most two candidate IDs/artist-title pairs
are handled, and external resolution uses the server-configured Last.fm suggestions.

The endpoint uses the core provider registry and ordinary Downloader pipeline;
there is no separate download worker. PostgreSQL transaction advisory locking
serializes automatic admission across users and workers. The server-wide budget
counts queued, fetching, running and retrying automatic downloads, and defaults
to **two outstanding downloads total**, not two per user. Existing pending media
are reused; failed media have a ten-minute automatic cooldown. Provider search
failures have a bounded five-minute backoff. Explicit manual downloads continue
through their existing concurrency controls.

```env
RECOMMENDATION_PREFETCH_MAX_PENDING=2  # 0 disables automatic preparation
```

Preparation rechecks download state every 15 seconds during eligible playback.
It stops requesting preparation on pause, repeat, a different device taking
playback ownership, or leaving the end of the queue. Downloads already admitted
remain ordinary downloads and can finish; they are not cancelled on pause.

External suggestions are matched conservatively by both artist and title before
importing provider metadata. Rendering a card never searches media providers.
