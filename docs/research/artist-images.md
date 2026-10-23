# Artist portrait sources

Reviewed 2026-10-23 against provider documentation. No new portrait provider is
connected by this revision. Existing Spotify/YouTube provider image selection is
improved independently; existing stored low-resolution images are not bulk-refreshed.

| Source | Identity and artwork | Access | Fit |
| --- | --- | --- | --- |
| Fanart.tv | Artist thumbs keyed by MusicBrainz ID; 1000×1000 quality-controlled group/artist photographs, explicitly excluding album covers | Project API key; obtaining it requires login | Best fit for deliberately curated portraits; needs project credentials |
| TheAudioDB | Artist artwork; some identity lookup/search features are premium | Public free key 123, 30 requests/minute; free tier is for development and restricts app-store publication | Not a universal unrestricted substitute for this project |
| Wikidata / Wikimedia Commons | P18 identifies a main image for a known entity; can be joined using verified MusicBrainz Wikidata links | Public linked entity data; image-specific reuse requirements must be respected | Keyless fallback worth evaluating; not guaranteed to be a professional promotional portrait |

Sources:
- https://api.fanart.tv/
- https://fanart.tv/get-an-api-key/
- https://wiki.fanart.tv/ImageTypes/Music/artistthumb/
- https://www.theaudiodb.com/free_music_api
- https://www.theaudiodb.com/docs_terms_of_use.php
- https://www.theaudiodb.com/pricing
- https://www.wikidata.org/wiki/Wikidata:Data_access/en
- https://enterprise.wikimedia.com/project-data/wikidata-api/ (P18 description)

YouTube artist information now uses YTMusic.get_artist rather than extracting a
channel video listing; portrait selection uses the largest dimensions supplied
by the source. This does not manufacture a higher-resolution file or assert that
all artists have one. Documentation: https://ytmusicapi.readthedocs.io/en/latest/reference/browsing.html
