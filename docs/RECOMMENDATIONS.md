# Recommendations

Rockit recommends music from two independent sources:

1. **Local engine** (always on, offline, zero setup) — ranks songs this
   instance already knows using Rockit's own data.
2. **External suggestions** (optional, opt-in per user) — tracks from
   ListenBrainz or Last.fm, shown in a separate "Discover" row. They may not
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
| `GET/POST /recommendation/settings`     | External opt-in and ListenBrainz username   |

All three recommendation endpoints return `SongListResponse`:

```jsonc
{
  "songs": [/* BaseSongWithAlbumResponse: local, playable/queueable */],
  "discover": [/* BaseSearchResultsItem: external, play if publicId, else download */],
  "discoverProvider": "ListenBrainz",   // or "Last.fm", or null
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

* Ties break on `public_id`, so results are deterministic.
* **Diversity:** a greedy re-rank multiplies a candidate's score by 0.6 per
  song already picked from the same artist (0.8 per same album), and no artist
  may exceed 30% of the list while alternatives exist.
* **Exclusions:** the seed/current track; for "For you" also everything the
  user has played or liked.
* **Cold start:** if history is too sparse to fill the list, it is padded with
  the instance's most-played songs, then the newest. An empty library returns
  empty lists.
* **Cost:** at most 300 candidate rows per query; ranked lists for "For you"
  and "related" are cached in memory for 60 seconds (playlists are not cached
  because they change right after a suggestion is added).
* Genres only exist for providers that store them (currently Spotify artist
  genres). Missing artist/album/genre data is simply a missing signal.

## External providers

Code: `backend/core/framework/externalRecommendation/`. Each provider
implements `BaseExternalRecommendationProvider` (only "context → list of
(artist, track)"); caching, fallback, deadlines, dedup and library matching
live once in `ExternalRecommendations`, so providers are replaceable.

| Provider     | Used for                 | Needs                          | Sends                                  |
| ------------ | ------------------------ | ------------------------------ | -------------------------------------- |
| ListenBrainz | "For you"                | User's ListenBrainz username   | Only that username                     |
| Last.fm      | "For you", related, playlist | `LASTFM_API_KEY` on the server | Artist + title of one seed song   |

**Selection:** providers are tried in `RECOMMENDATION_EXTERNAL_PROVIDERS`
order (default `listenbrainz,lastfm`), skipping those that are not configured
or cannot serve the request. The first one with usable suggestions wins.

**ListenBrainz** (verified against the ListenBrainz server source):
`GET /1/cf/recommendation/user/{user}/recording?count=50` (no token; `204`
means not generated yet, `404` unknown user) followed by a single batched
`POST /1/metadata/recording/` to turn recording MBIDs into names. MBIDs are
kept on each suggestion; entries without a name or artist are dropped.

**Rate limits & resilience:**

* ListenBrainz: at most one request per second per process, as its API docs
  require, plus a `User-Agent` identifying Rockit. `Retry-After`,
  `X-RateLimit-Remaining` and `X-RateLimit-Reset-In` are honoured.
* HTTP 429 is retried **once**, only when the server asks for ≤ 2 s;
  otherwise the provider is skipped until the cooldown (capped at 10 min)
  expires. Timeouts, connection errors and 5xx are not retried.
* Every provider call has a hard deadline (2 × the per-request timeout).
* After a failure the provider is skipped for that user/seed for 5 minutes
  (memory only) to avoid hammering it and repeating log lines.
* Successful answers are cached in `core.cache_external_recommendation` for
  `RECOMMENDATION_EXTERNAL_CACHE_HOURS` (default 24 h); empty answers for 1 h.
  Failures are never cached.

## Configuration

Local recommendations: nothing to configure.

External suggestions (server, all optional):

```env
RECOMMENDATION_EXTERNAL_PROVIDERS=listenbrainz,lastfm   # or "none"
LASTFM_API_KEY=...                                      # enables Last.fm
RECOMMENDATION_EXTERNAL_TIMEOUT_SECONDS=5
RECOMMENDATION_EXTERNAL_CACHE_HOURS=24
```

Per user: **Settings → Recommendations** → enable "Use external services"
and optionally enter a public ListenBrainz username (no token needed).
Everything is off by default; without opt-in no external request is made.

## Limitations

* Rockit stores no MusicBrainz IDs, so external suggestions are matched to
  the local library by fuzzy artist + title (`pg_trgm`, conservative
  thresholds). Downloading one runs a single provider search on tap.
* ListenBrainz only has recommendations for users who submit listens to it;
  Rockit does not scrobble to ListenBrainz.
* Recently *recommended* (as opposed to played) songs are not tracked, so an
  unchanged history yields the same list until it changes.
* The settings UI exists on web; mobile reads the same per-user settings.
