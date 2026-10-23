# Provider boundaries

`backend/core` coordinates operations through shared contracts. Concrete provider
imports, provider schema names, URL formats, and download limits belong to the
provider that implements them.

## Local metadata and files

Each provider implements its `MediaStorage` operations in `access/downloadStorage.py`.
Its `access/db/db.py` registers these during the existing database discovery step.
Providers supply narrow SQL projections for metadata (`id`, `name`, `image_id`,
`external_id`, `manageable`) and optional files (`id`, `path`, `name`). IDs are
shared core media IDs. The provider owns its table selection, columns, and joins;
core only combines the projections for pagination, search, file reuse, and ZIP
export. Registration keys are opaque identifiers, not schema instructions.

Providers that support deletion and redownload also supply `clear_files_async`.
It accepts the full batch of media IDs, clears only that provider's stored paths,
and returns the previous paths. It does not commit: core owns the transaction,
file archiving, rollback, and download group lifecycle. Calls are sequential on
the shared session, with a fixed number of queries per provider rather than per
media item. Uploaded files expose a read projection without a clear operation.

Local storage registration is independent of provider activation: disabling remote
API access still permits reading historical metadata and exporting existing files.
An empty registry produces empty SQL relations rather than an invalid UNION.

## Provider behavior

`BaseProvider` supplies default health checks, concurrency limits, and cooldowns.
Concrete providers override them where needed. The download manager consults the
owning provider, so one source's cooldown does not delay unrelated sources.

`BaseMediaProvider.can_manage_downloads()` controls group actions. Keep it aligned
with the provider's metadata `manageable` projection, which supplies the same capability
to SQL queries.

Recommendation playlist co-occurrence uses the optional
`get_recommendation_playlist_edges_cte_fragment` capability. Providers own the
membership projection in their access layer; Core combines the projections and
scores shared playlists without naming provider schemas. An empty registry
contributes no playlist signal and leaves the other recommendation signals intact.
Recommendation and metadata capabilities share the provider registry and remain
separate from playable media capabilities.
Collection URLs accept the neutral `external_id` key; providers may also accept
their native metadata keys for existing collection callers.

Playlist changes resolve the playlist's media provider before dispatching to
`add_media_to_playlist_async` or `set_media_expanded_async`. Providers without
editing support return `NOT_IMPLEMENTED`; permission checks remain provider-owned.

The access-layer `CollectionSource` extension supplies collection visibility,
membership filters, extra metadata, and expanded state. Default registers its
playlist permissions and user preferences through this interface, including when
its remote-facing provider is disabled. Core retains traversal and pagination.

The cross-schema image reference diagnostic is in `scripts/checkImagesReferences.sql`.
It is an operator tool, separate from core runtime code.

## Validation

`backend/tests/unit/test_provider_boundaries.py` checks that core has no concrete
provider imports or schema names, validates registered SQL projections, and exercises
provider dispatch, empty registries, and provider-defined concurrency.

Integration tests cover disabled sources, all downloadable track schemas, album
artwork, file reuse and ZIP export, preservation of uploads and unrelated files,
and rollback of provider path mutations. These contracts do not change HTTP or
WebSocket payloads and require no frontend changes.

## Artist and metadata audit (2026-10-23)

Reviewed the artist-page changes and scanned all 333 Python files under Core
against the nine discovered concrete provider packages. There are no concrete
provider imports, nor references to MusicBrainz, Spotify, YouTube or Cover Art
Archive in Core. No provider-specific code needed moving out of Core.

Artist pages aggregate `BaseMediaProvider.get_artist_catalog_async` results from
the registry and use shared collection summaries. Metadata endpoints select a
`BaseMetadataProvider` from the registry and dispatch through its contract. Core
retains authentication, HTTP error mapping, pagination and shared response models.
MusicBrainz owns external IDs, query parameters, JSON parsing, discography policy,
artwork URLs, HTTP, persistent snapshots and the shared request gate. Removing or
disabling a source leaves the generic dispatcher intact; missing providers return
NOT_FOUND and unsupported media catalogs contribute an empty result.

MusicBrainz source projections now use lightweight typed Pydantic models in its
own `framework/models/metadata.py`, and construct shared response models directly.
The raw JSON envelope remains intentionally open to preserve arbitrary source
fields in the persistent cache. Validation does not alter that raw snapshot;
invalid projected source data returns a controlled unavailable result rather
than leaking dictionary key/type exceptions. No source model is imported by Core.

Strict Pyright analysis covers the complete configured repository, including
backend tests. Resolve runtime and development dependencies in the interpreter
used by the checker before interpreting missing-import cascades as code defects;
see docs/backend-tests.md. No runtime tests were executed for this audit.
