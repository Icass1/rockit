# MusicBrainz metadata provider

MusicBrainz is a metadata provider (`BaseMetadataProvider`), not a playable media
provider. Core selects registered providers and forwards calls. Source URLs,
queries, MBID validation, JSON parsing, caching and request coordination all live
under `backend/musicBrainz`. Providers and the `musicbrainz` database schema are
picked up by existing discovery; normal database initialization creates the two
new tables. No frontend changes or local/external identity merges are included.

## Authenticated backend API

- `GET /metadata/MusicBrainz/artists/search?name=Twenty%20One%20Pilots`
  returns candidates with source IDs, scores, disambiguation and aliases when
  present. Pick a candidate; a similar name never silently links local identities.
- `GET /metadata/MusicBrainz/artist/{mbid}` returns artist details, aliases,
  membership and other artist relations, external URLs, genres and tags.
- `GET /metadata/MusicBrainz/discography/{artist-mbid}?offset=0&limit=100`
  returns release groups (albums, singles, EPs, etc.).
- `GET /metadata/MusicBrainz/recordings/{artist-mbid}?offset=0&limit=100`
  returns recording credits and ISRCs.
- `GET /metadata/MusicBrainz/release-group/{mbid}` returns an album/group's details.
- `GET /metadata/MusicBrainz/releases/{release-group-mbid}?offset=0&limit=100`
  returns editions; advance by the actual returned count, not the requested limit.
- `GET /metadata/MusicBrainz/release/{mbid}` returns edition details and tracklists.
- `GET /metadata/MusicBrainz/recording/{mbid}` returns a recording's details.
- `GET /metadata/MusicBrainz/event/{mbid}` returns a known event's details. This is
  not a complete upcoming concerts feed; MusicBrainz coverage is community driven.

Every response uses `MetadataResponse`: provider, entity, externalId, complete
provider JSON in data, cached, fetchedAt, stale. External IDs are MusicBrainz IDs,
never Rockit media public IDs. Source JSON preserves relationships (including
membership dates), aliases and credits without discarding fields. Album groups,
editions, recordings and tracks retain their distinct MusicBrainz identities.
Pagination/counts remain in the source JSON. Each call loads just one entity/page,
not an artist's entire catalog recursively.

## Persistence and request safety

Successful responses (including empty search results) are stored as JSONB in
`musicbrainz.metadata_cache`, keyed by canonical request path and parameters.
They survive restarts and are shared by users. There is no TTL, automatic polling
or background refresh. `refresh=true` explicitly refreshes the selected entity,
search or page; it does not invalidate or reload other saved pages. Existing data
is retained if the upstream request fails (`stale=true`).

A PostgreSQL transaction advisory lock serializes every outbound MusicBrainz
request across workers sharing this database. The lock spans cache rechecking,
the HTTP request and the persistent cooldown update. Concurrent cache misses for
the same query are rechecked after acquiring the lock, avoiding duplicate calls.
A minimum 1.1 second gap follows each completed HTTP attempt. Cache hits do not
wait on the gate. HTTP 429/503 persists Retry-After (seconds or HTTP date), with a
minimum 60 second cooldown. During a long cooldown, new misses fail without
contacting MusicBrainz; cached reads remain available. There are no immediate
retries. Caller cancellation leaves the independent fetch transaction running so
its cooldown and cache write can finish.

**IP scope:** coordination covers workers/replicas sharing the same PostgreSQL
database. Separate Rockit databases or unrelated clients behind the same public
IP must share an external request coordinator before sharing that IP's budget.

Requests include the required identifying User-Agent:
`Rockit/1.0 (https://github.com/Icass1/rockit)`. Deployments can override it with
`MUSICBRAINZ_USER_AGENT` to provide their own contact URL. No account, API key or
user OAuth is needed. The default is project identification, not music fingerprint
identification.

MusicBrainz does not supply comprehensive biographies, artist photography or
concert listings. Core database data is CC0; supplementary data such as tags has
separate licensing, and the hosted API has commercial-use terms. See the official
[API](https://musicbrainz.org/doc/MusicBrainz_API),
[rate limits](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting) and
[data licenses](https://musicbrainz.org/doc/About/Data_License).
