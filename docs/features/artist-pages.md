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

## Artist experience

Artist context and genres precede the collection. The collection uses compact
rows (two columns when space allows), with no repeated provider name. Discography
follows immediately, combining the local album strip and the paginated catalog.
Additional recordings load only when their disclosure is opened.

Catalog entries never link to MusicBrainz. A unique local title match (and matching
year when both are available) opens the internal album or uses existing song
play/download actions. Unresolved or ambiguous editions open `/search?q=...`,
where the existing media providers supply playable/downloadable results. This is
a navigation hint, not a persisted identity link or a guessed streaming URL.
Related metadata artists also use internal search. Artist choices appear only
when the name search needs disambiguation, using ordinary localized language.

Header counts describe provider-indexed records, including undownloaded music
and distinct editions; they are not download counts or a unique works census.
Concerts show at most three upcoming entries initially; past concerts are folded
into a bounded scrollable history. Absence means no upcoming entries are listed,
not confirmation that the artist has no tour. All labels use Vocabulary.xlsx.

For this UX revision no tests were run, at the user's request. Vocabulary was
regenerated with the real `python -m backend import-vocabulary` command against
a disposable local database before committing.

## Artist navigation

Search artist results link directly to the name-based artist page, without a
media context menu or source picker. Names under library songs, videos and albums
use the same route. Artist links stop click and touch propagation so they do not
play the parent media, alter the queue, or open its context menu. Album covers
and titles retain their own links; artist links are siblings, never nested links.
This applies to library grids and rows, including selection mode.

Name-based pages may have an empty local collection and still show metadata;
provider-ID routes continue to validate the requested artist. No media is imported
just by navigating. Search portraits are handed off through a bounded browser
session cache (50 entries) and rendered with an SSR-safe external-store snapshot.
The header uses artist artwork only, without substituting song or album covers.
Portrait and text occupy separate columns on wide screens and stack on narrow
screens so the title remains unobstructed. No new vocabulary labels were needed.
No tests were run for this navigation revision at the user's request.

### Encoded names and vocabulary deployment

The name route decodes its segment once before requesting the catalog or metadata.
Search and Library create URLs with NFC normalization, collapsed whitespace and
lowercase names. Provider matching keeps its existing case/whitespace handling.
Malformed escapes do not crash the page.

`python -m backend import-vocabulary` also generates committed web artist vocabulary
defaults from `Vocabulary.xlsx`. The web manager uses these for missing translations
in the active language, then English. This prevents raw `ARTIST_*` keys when a
server database has not yet imported the updated spreadsheet. Run the same import
command on the deployment (or `scripts/update.sh`) to update its database.

The real vocabulary import completed against temporary local PostgreSQL for this
fix. No tests, build, lint or type checks were run, as requested.

### Artist identity and in-place acquisition

Indexed Search and Library artists now retain their provider-backed `/artist/{publicId}`
URL. For external Search results without a local ID, an ordinary click uses the existing
provider `add-from-url` operation (without downloading or adding to Library) and navigates
to its artist ID. Name routes remain a fallback for unsupported sources and uploaded
artists, which currently have no Core artist identity. Modifier-clicks retain native
link behavior. Uploaded artist responses no longer borrow IDs or images from songs.

Provider catalog queries accept distinct case/spacing variants as a read-only view.
Identically named records with different source IDs still require explicit identity;
name matches never persist identity merges. Album discovery includes albums associated
through their tracks as well as direct album artist associations.

Unmatched MusicBrainz releases/recordings expand a source chooser inside the page.
Only opened items query the existing media-provider search endpoints, with two workers
and five results per provider. The user chooses an actual edition/provider result;
its download uses the existing download-from-URL flow and adds it to Library, without
changing playback or the queue. Failed sources can be retried in place. MusicBrainz
metadata alone is never treated as an audio source or silently matched to an edition.

The header uses a compact, softly masked portrait and wider text area. Spotify search
selects the largest supplied portrait. Actual local counts and metadata release counts
remain separate; explanatory catalog copy, the blanket partial-source banner and the
local-catalog footnote are removed. Empty or failed collection states remain explicit.
Three labels were added to Vocabulary.xlsx and imported with the real backend importer
against temporary PostgreSQL before committing. No tests/build/type/lint checks were run.
Runtime verification against the user's database and visual browser verification remain
outstanding; source-query fixes do not establish the state of that deployment.

MusicBrainz transient failures now return HTTP 503 (429 for explicit throttling),
with Retry-After, rather than a generic 500. Existing durable cooldown and cached
fallback remain intact; a first lookup has no snapshot to serve during an outage.
Artist candidates are ordered by MusicBrainz relevance score. The first exact-name
match, or first result when none are exact, is selected automatically, with the
chooser retained for corrections. Relevance is not a popularity measurement.
No labels changed and no tests were run for this follow-up.

MusicBrainz advisory gate acquisition now polls the transaction-scoped try-lock
for at most five seconds rather than waiting indefinitely. Busy requests return
503 or an existing cached snapshot, without making another upstream request.
Identical in-process lookups share one shielded task and one provider DB session.
Different workers still coordinate via PostgreSQL. The request middleware logs
method/path before dispatch at DEBUG level to distinguish requests arriving at
the backend from browser-side pending resources. These changes address an
unbounded wait found in code; the supplied Serwist log alone does not prove it
caused the reported freeze. No labels changed; no tests were run.

Read-only metadata endpoints end the authentication transaction before dispatching
to a provider. Providers can open their own durable cache transaction without
every waiting request holding an additional connection from the same pool.
The request session stays usable for providers and request logging; configured
expire_on_commit=False preserves the authenticated user attributes.

### Illustrated discography and responsive artist stage

MusicBrainz exposes a neutral `imageUrl` on catalog items, generated inside its
provider from the release-group ID using Cover Art Archive front-250 thumbnails.
The new DTO field was generated using the actual backend models command. Raw
cached MusicBrainz snapshots receive the new presentation without refreshing them.
Artwork loads lazily/directly in the browser, without additional MusicBrainz
requests or server-side image proxy work; missing art falls back to a decorative
title initial. Browser validation against live CAA remains outstanding.

The discography is one grid of all loaded release groups, rather than a local
album strip above a separate metadata list. It includes unique local matches and
local albums absent from the metadata; existing source/download actions remain.
The first page contains up to 100 items and larger catalogs have explicit further
pagination. Local albums remain available if metadata lookup fails.

The header blends portrait, accent light and title on one stage. Mobile uses a
portrait fading behind the title and two cover columns, with PWA safe-area gutters.
Desktop uses an overlapping wide composition and six columns at 1500px+. Ultrawide
uses seven columns at 2200px+, with a 1920px content cap. Tablet has three columns.
Reduced-motion overrides remain active and cover controls retain keyboard labels.

Only Search portraits populate the session portrait cache now; Library artwork
no longer overwrites them. The cache key is versioned to discard old album-art
hints. YouTube's synthesized playlist artists suppress borrowed track artwork in
the artist-page response; genuine provider artist images remain available.
No claim is made that every provider supplies a professional artist portrait.

No new labels, no vocabulary edits, no tests/build/type/lint checks for this
revision. Changed files were formatted and the diff reviewed; visual validation
on the three target display sizes remains pending.
