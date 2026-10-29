# Search index and catalogue lookup hotfix

RadioBrowser contributed a varchar favicon URL as the seventh column of the shared
search index. Other providers contribute an integer Core image ID. PostgreSQL
resolves UNION types before applying song filters, so enabling the radio source
could break recommendation matching, admin search and Library search for songs.
RadioBrowser now supplies a typed null image ID from its access layer. Its normal
station responses still expose the external favicon. Core gains no provider rules.
The capability documentation and collection index annotation use the image-ID contract.

A directed check on disposable PostgreSQL 16 combined all seven actual provider
fragments against empty tables with ORM column types. The old radio projection
reproduced the integer/varchar UNION error; the corrected projection completed.
No production database, storage configuration, migration or objects were accessed.
CI regression coverage checks every provider's ordered projection aliases.

Song lookup now tries title/artists without the album if the more specific album
query produces no accepted recording. ISRC remains first when valid. There are at
most three queries, ten rows per query, with the existing pacing and HTTP timeouts.
All candidates retain the same catalogue, artist, version and duration gates.
A partial catalogue outage without an accepted result returns a retryable error
rather than permanent NOT_FOUND. Repeated IDs retain their best verified metadata.

When a query has no accepted recording, bounded warnings record the input metadata
and each identifiable candidate's ID, metadata and rejection reason. This distinguishes
missing artist credits, mismatched duration/version and non-catalogue results.

The reported Future Nostalgia ID was not reproduced with live catalogue responses:
the environment proxy rejected the YouTube Music request during CONNECT. No manually
inferred candidate is presented as selector output. Its exact production rejection
still needs the new diagnostic output or the original metadata/candidate responses.
The broader lookup addresses a generic search limitation, not a confirmed diagnosis
of that particular recording. Regression fixtures cover fallback, protected gates,
partial outages and logging; local test suites were not run.
