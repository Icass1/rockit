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
  are distinguished. This feature does not fetch a complete external discography.
- Relationships are reserved in the response contract. They remain empty until
  backed by explicit identity evidence or manual links; collaborations never
  imply membership or shared artist identity.

New vocabulary is stored as literal English, Spanish and French values in
`Vocabulary.xlsx`. Run the normal `python3 -m backend import_vocabulary` workflow
to import the workbook into a deployment's database.

## External metadata follow-up

[MusicBrainz](https://musicbrainz.org/doc/MusicBrainz_API) is a candidate for
public artist, release-group and relationship metadata without end-user login.
Public read requests do not require an API key. A future dedicated provider
should use its artist IDs (MBIDs), explicit alias/relationship data, a descriptive
User-Agent, caching and request throttling (normally no more than one request per
second). Verify current usage/licensing requirements before deployment; it is a
metadata source, not an audio or download service. Cover Art Archive can supply
release artwork; artist portraits need another source with appropriate rights.

Keep this integration outside Core. Name-only matches must remain candidates
until resolved with stronger evidence or user confirmation. A member's solo
catalog must stay separate from the band's catalog, with an explicit relationship
between them.
