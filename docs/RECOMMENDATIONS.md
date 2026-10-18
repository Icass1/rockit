# Music recommendations

The web Home page's **Songs for you** section works with zero configuration and
without Internet access. Select a card to play it using the existing queue/player.
Recommendations never create downloads. Spotify, spotDL and YouTube downloading
continue through their existing workflows.

## Data and architecture

`POST /recommendations` is authenticated and follows controller → framework →
access. The body accepts `limit` (1–50, default 20), `currentPublicId` (optional),
and `externalUsername` (optional, max 64 characters). The response contains
`songs` (existing `BaseSongWithAlbumResponse` models), `provider` (`local` or
`listenbrainz`) and `externalStatus`. No internal database IDs are exposed.

The access layer reuses the registered providers' stored metadata indexes and
reads only this user's listens, likes, direct song library membership, and queue
state. It considers song/track rows from RockIt, Spotify, SpotifyScrapper and
YouTube Music. Batch hydration reuses existing song conversions; Spotify's
fetch-on-miss methods are deliberately bypassed. No metadata searches, HTTP calls,
new tables, migrations, jobs, services or dependencies are needed locally.

The candidate snapshot is bounded to 2,000 rows per user (likes, 90-day play
counts, direct library saves, newest catalog entries, then public ID). At most
64 snapshots are retained for 60 seconds. This bounds memory and avoids catalog
queries on every render. Newly added songs and listening signals can take up to
60 seconds to appear. The current server queue item is checked on every request.

## Ranking heuristics

This is a deterministic metadata ranking system, not a trained ML model.

- Artist affinity combines likes (4), capped logarithmic repeat listens (2),
  recency (2, decaying over 14 days), and direct song library saves (1).
- Artist and album affinities are normalized; album affinity contributes 0.35.
- Unsaved songs lead. Liked/saved songs receive half weight and can fill a sparse
  catalog: rediscovering playable music is useful in a self-hosted player.
- Blank titles, missing audio paths, the current recording, recordings played in
  the last 24 hours and duplicate normalized title/artist combinations are excluded.
  Unicode, case and whitespace are normalized; public IDs break ties.
- Greedy selection applies multiplicative penalties for repeated artists (0.2)
  and albums (0.35). The previous response is deprioritized for ten minutes, with
  repeats allowed when needed to fill a small catalog.
- With no history, a stable, diverse catalog selection is returned. With no
  eligible audio, the UI explains the empty state.

## Optional ListenBrainz

Enable server access explicitly:

```dotenv
LISTENBRAINZ_ENABLED=true
LISTENBRAINZ_TIMEOUT_SECONDS=3
LISTENBRAINZ_CACHE_SECONDS=21600
```

The defaults are disabled, 3 seconds, and 6 hours respectively. Timeouts are
validated to 0.1–5 seconds, and successful-result cache expiry to 60–86,400 seconds.
The server must be able to reach `https://api.listenbrainz.org` over HTTPS.

On Home, expand **ListenBrainz**, enter your ListenBrainz/MusicBrainz username,
and choose **Use ListenBrainz**. You need an existing public recommendation
playlist on that account. No token or API key is required. Preferences are saved
in this browser separately for each Rockit username. **Use local recommendations**
removes the opt-in. Server disablement takes precedence over browser preferences.

The provider reads the user's public recommendation playlist index, selects the
newest of the first 25 entries, then fetches that playlist's JSPF tracks. This
costs at most two requests, never one request per track. Only the explicitly
supplied username and selected public playlist UUID go upstream. Rockit does not
submit listening history, likes, library metadata, cookies, credentials or tokens.
Returned title/artist credits match locally stored songs; matching items receive
a bounded ranking boost alongside local affinity and diversity.

The app stores no MusicBrainz recording IDs. Using public JSPF title/creator
metadata avoids an ID-resolution service or per-track lookups. It intentionally
skips unmatched recommendations rather than generating playable/downloadable
URLs. The returned song identifiers, artwork, metadata and audio URLs remain
those of the existing local provider models.

The current official API contract was checked on 2026-10-18:

- [Public recommendation playlists](https://listenbrainz.readthedocs.io/en/latest/users/api/core.html#get--1-user-(playlist_user_name)-playlists-recommendations)
- [Fetch a playlist](https://listenbrainz.readthedocs.io/en/latest/users/api/playlist.html#get--1-playlist-(playlist_mbid))
- [JSPF metadata](https://musicbrainz.org/doc/jspf)
- [Rate limiting and required User-Agent](https://listenbrainz.readthedocs.io/en/latest/users/api/index.html#rate-limiting)

## Resilience and deployment

The web UI gets local recommendations first, then optionally requests external
improvements. Existing local cards remain playable while that request runs. The
provider has a total deadline including lock waits, HTTP and body reads, a 1 MiB
response bound, and no automatic retries. The browser request also has an
8-second deadline. All disabled/error/timeout/malformed/empty/unmatched paths
keep local results. Cancelled/unmounted browser requests cannot overwrite a newer
load. Network failure can show a validated browser snapshot filtered to songs
with audio already saved in the existing offline store.

The external cache holds at most 128 successful batches. Failed/empty requests
have a 60-second cooldown (up to 512 usernames), then may recover. There is no
polling. Logs are generic and exclude upstream URLs and exception details.

A non-blocking file lock and next-request timestamp in
`TEMP_PATH/listenbrainz/` coordinate backend workers. Requests start at least one
second apart. Contending workers use local results immediately. HTTP 429,
`Retry-After` (seconds or HTTP date), and exhausted `X-RateLimit-Remaining` with
`Reset-In`/`Reset` extend the shared cooldown. Successful caches are in memory;
restarts discard them but retain the rate timestamp if the temp volume survives.

**Multiple hosts/containers must share this lock directory on a filesystem that
supports file locks, or enable the external provider on only one replica.** The
rate gate cannot coordinate independent filesystems. Keep this directory writable
by the backend service account. A corrupt timestamp self-recovers conservatively.

## Validation and limits

Use the existing Python environment and frontend dependencies:

```sh
python -m pytest backend/tests -q
# Set ROCKIT_TEST_DATABASE_URL to a disposable-test PostgreSQL admin URL to run DB tests.
python -m pyright
cd frontend/apps/web
node --test tests/*.test.mjs
./node_modules/.bin/eslint --cache app components
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/next build
```

HTTP tests use `httpx.MockTransport`; tests never need ListenBrainz credentials,
Internet access or live API calls. Integration tests use the existing disposable
database fixture. Ranking, identity normalization, cold/empty catalogs, diversity,
per-user caching, authentication, provider failures, rate headers, cache recovery,
concurrency, local-first rendering, cancellation and offline playback eligibility
are covered.

Deliberately deferred: unknown-track discovery/download resolution, MusicBrainz
mapping, genre and playlist-membership scoring, a persistent recommendation
history, distributed cache infrastructure, and a mobile-specific recommendation
screen. The shared contract and backend endpoint can serve mobile clients later.
Large catalogs use the bounded candidate pool rather than exhaustive matching.
Different edits/versions and composite artist credits may not match exact names.
The latest external playlist can contain no usable tracks. Recommendations do not
verify audio files on disk beyond the application's stored audio-path flag.

The UI uses the vocabulary atom for labels. New `RECOMMENDATIONS_*` keys have
English fallbacks in the shared feature contract; deployments can translate these
through the existing vocabulary import workflow without regenerating DTO files.
