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
