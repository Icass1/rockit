# Large collection browsing

Album and playlist HTTP responses load **100 direct children by default**, with a
maximum of 200. Embedded albums and playlists contain metadata and empty
`songs`/`medias`; opening them uses the separate collection endpoint. Persisted
expanded state is returned, and clients load those lists only when displayed.
Web and mobile append subsequent pages when the bottom of the list becomes visible,
with a loading indicator and loaded/total count. Search and collection updates reset
the accumulated results; failed page loads retain earlier rows and offer retry.

- `GET /default/playlist/{public_id}?offset=0&limit=100&query=`
- `GET /media/playlist/{public_id}?offset=0&limit=100&query=`
- `GET /media/album/{public_id}?offset=0&limit=100&query=`
- `GET /media/collection/{public_id}/items?offset=0&limit=100&query=`

The playlist and album routes preserve the existing response shape and add `offset`, `limit`,
`total`, and `hasMore`. The collection endpoint returns metadata in `collection`,
wrapped children in `items`, and the same pagination fields. `total` is the number
of visible matching entries, not a count of flattened playable tracks. Out-of-range
pages are empty. Invalid offsets, limits, and queries longer than 200 characters
return HTTP 422. Identifiers in responses are public IDs.

A nonempty `query` performs a case-insensitive literal substring match against
media names, public IDs, and related album, artist, or channel names from the
existing provider-owned admin search index throughout accessible descendants, including
closed albums and playlists. Matching multiple artists does not duplicate entries. SQL wildcards in the query are escaped. Search does not change playback
scope. Repeated membership entries remain separate results; descendants of a
shared nested collection are searched once. Search results use a stable order by
parent ID, position, and media ID. Direct browsing preserves collection order.
Imported Spotify/YouTube membership tables do not store a source ordinal; these
collections use media ID as a stable fallback order. Albums use disc and track
number, with media ID as a tie breaker.

`POST /media/collection/{public_id}/queue` accepts
`{"startPublicId": null}` or a public media ID. The server traverses the complete
accessible graph, preserves repeated tracks, skips ancestor cycles, builds sorted
and random positions, and replaces the queue and selected item atomically. Closed
lists, current pages, and search filters do not affect that queue. An empty
collection or invalid starting item returns HTTP 400 and preserves the old queue.
Songs and videos are queueable; radio stations retain their separate playback flow.
The random queue starts with the selected item.

`GET /media/collection/{public_id}/playable` resolves the complete collection without
changing the user's queue. Add-to-queue and offline download actions use this API.
Both queue endpoints return the full queue metadata; queue transport itself is not
paginated. Browsing queries hydrate only their requested page, and queue hydration
uses batches of at most 200 unique media per provider.

Private nested playlists require ownership or contributor access for the requesting
user. Disabled playlist entries and disabled provider memberships are excluded from
browsing, recursive search, and queue traversal. Access failures are never bypassed
using the parent playlist owner's identity.

Web and mobile keep one page per open list, use previous/next controls and debounced
search, discard stale responses, and reload the first page after playlist edits.

Startup creates the collection album-order indexes on both new and existing tables.
No response DTO should be edited manually: regenerate with `python -m backend models`
from the repository root after changing the backend contract. The HTTP generator
uses `queryParams` internally so the `query` API parameter does not shadow it.

Collection pages and resolved queues are cached for offline use. Mobile cache keys
include the full page/search URL; changing the session clears this collection cache.
Web authentication transitions also clear it. Offline playback can reuse a complete
queue previously resolved online; it never constructs the full queue from a partial
visible page.

## Virtualized collection views

Web and mobile flatten the expanded collection tree into one virtualized list,
including each nested search control and pagination footer. Web measures visible
rows with ResizeObserver and uses binary search over their cached heights; mobile
uses a single FlatList with variable-height rows. Neither platform mounts a
recursive scroll view for each expanded collection.

Expansion and fetched pages live in the shared CollectionTree manager rather than
in recycled row components. Keys include the full occurrence path and membership
position, so repeated albums/playlists expand independently. Ancestor cycles stay
closed. Persisted expansions fetch their first page only when their controls enter
the render window. Search clears old branches, and collapse retains loaded pages.
Playback continues to resolve the complete root collection on the server.

Web preserves the visible row when measurements or expanded children change the
layout and keeps a focused control mounted. Mobile uses native content-position
anchoring and footer viewability to request subsequent pages.

Run the shared tree and geometry regression tests with:

```bash
pnpm --dir frontend/packages/shared test
```

The PR quality job runs these tests and the shared TypeScript check.
