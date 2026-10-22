# Provider boundaries

`backend/core` coordinates operations through shared contracts. Concrete provider
imports, provider schema names, URL formats, and download limits belong to the
provider that implements them.

## Local metadata and files

Each provider declares its `MediaStorage` entries in `access/downloadStorage.py`.
Its `access/db/db.py` registers these during the existing database discovery step.
Entries identify the display name, image, external ID, stored file path, and whether
files support deletion and redownload. Track images can come from an album join.
Core combines these declarations into batch queries for download history, search,
file reuse, and ZIP export. It does not infer provider-specific column names.

Local storage registration is independent of provider activation: disabling remote
API access still permits reading historical metadata and exporting existing files.
An empty registry produces empty SQL relations rather than an invalid UNION.

## Provider behavior

`BaseProvider` supplies default health checks, concurrency limits, and cooldowns.
Concrete providers override them where needed. The download manager consults the
owning provider, so one source's cooldown does not delay unrelated sources.

`BaseMediaProvider.can_manage_downloads()` controls group actions. Keep it aligned
with `MediaStorage.manageable`, which supplies the same capability to SQL queries.
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
provider imports or schema names, validates registered SQL columns, and exercises
provider dispatch, empty registries, and provider-defined concurrency.
