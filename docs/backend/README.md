# Backend

The API lives in `apps/backend` and uses FastAPI, async SQLAlchemy and PostgreSQL.
Persistent media and artwork use S3-compatible storage. Start with the
[root setup](../../README.md#local-development) for environment configuration.

## Architecture

Requests follow **controller → framework → access**. Controllers validate HTTP
input and enforce authentication; framework services coordinate business rules;
access modules own database queries. Check each `Result` before reading its value.
Provider-specific lookup, metadata interpretation and download behavior belong in
the provider integration. Core coordinates generic capabilities through the
registry. See [provider boundaries](provider-boundaries.md) and the current
[backend engineering instructions](../../apps/backend/AGENTS.md).

## Technical references

| Area | Reference |
| --- | --- |
| Playback and cross-client state | [Synchronization](playback-synchronization.md) |
| Source recording selection | [Catalog matching](recording-selection.md) |
| Lyrics and reviewed timing | [Lyrics matching](lyrics-matching.md) |
| Explicit, clean and unknown metadata | [Content ratings and backfill](content-ratings.md) |
| Discovery and source fallback | [Recommendations](recommendations.md) |
| Download operations | [YouTube downloads](youtube-downloads.md) |
| Audio boundary metadata | [Silence analysis](audio-silence-analysis.md) |
| Large collections and search | [Pagination](collection-pagination.md), [search performance](search-performance.md) |
| Collection export | [ZIP export](zip-export.md) |
| Listening goals and collectibles | [Emblem collection](emblem-collection.md) |
| Verification and persistence coverage | [Backend tests](tests.md) |

## Development and API changes

Run `pnpm dev:backend` from the repository root after configuring the database,
object storage and session settings. Example environment values are placeholders.

Update backend request/response models before regenerating the shared client:

```sh
uv run --project apps/backend python -m apps.backend models
```

Generated DTOs are not edited manually. Check affected web and mobile consumers
when changing contracts. Follow [the test guide](tests.md) for focused checks and
optional PostgreSQL persistence tests; controlled controller fixtures do not prove
middleware or real database behavior.

Use [container operations](../operations/container-deployment.md) for deployment. Backfills and
other maintenance operations have their own documented scope; a merged feature
or a successful unit test does not establish that production data was migrated.
