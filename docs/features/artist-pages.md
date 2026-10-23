# Artist pages

Artist pages compose the locally indexed catalog from registered providers. The
provider owns its artist matching and SQL; Core only requests references and
hydrates bounded song pages. Album metadata uses the existing collection summary
pipeline, without hydrating album tracks. Endpoints require authentication.

- `/media/artist/{public_id}/page`: provider identity anchors the artist.
- `/media/artists/profile?name=...`: uploaded artists without a Core artist ID.
- `offset` and `limit` (1–200, default 100) paginate songs and albums independently
  through the same cursor. The UI loads the next page of each together.
- Provider-specific IDs remain distinct. Whitespace and case variants can share a
  view, but punctuation and accents remain significant. Ambiguous matches within
  a provider are omitted and reported through `partial`. Matching names across
  providers are catalog candidates, not verified shared identities; homonyms
  remain a limitation until an identity service or manual linking exists.
- Search, download filtering and playback operate on the loaded songs. The UI
  explicitly says so. Downloaded files and cached, undownloaded catalog entries
  are distinguished. The collection remains separate from the external MusicBrainz catalog.
- Relationships are reserved in the response contract. They remain empty until
  backed by explicit identity evidence or manual links; collaborations never
  imply membership or shared artist identity.

New vocabulary is stored as literal English, Spanish and French values in
`Vocabulary.xlsx`. Run the normal `python3 -m backend import-vocabulary` workflow
to import the workbook into a deployment's database.

## External metadata

The backend now provides [MusicBrainz metadata](musicbrainz.md) through a dedicated
metadata provider with persistent PostgreSQL caching and a shared request gate.
The artist UI queries this provider alongside its local collection. The local
catalog endpoint and playable media identities remain separate.

MusicBrainz identities and relation data are available through authenticated
`/metadata/MusicBrainz/...` endpoints. Name search returns candidates; permanent linking
of these external identities to local artists remains a separate step. A member's
solo catalog stays separate from the band's catalog. MusicBrainz is a metadata
source, not an audio/download service or a comprehensive concert listings feed.

The collection initially shows five songs with expand/collapse controls. External
discography and recordings have independent source pagination and compact initial
previews. Local album artwork sits in a horizontal strip rather than extending
the page by many rows. Loading, failed queries, stale data and missing event
coverage are visible and localized. No MusicBrainz activation, account or API key
is needed after the normal database initialization and vocabulary import.
