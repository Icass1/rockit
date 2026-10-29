# Downloads experience

## Browsing large histories

The web Downloads screen uses `/downloader/browse` instead of loading `/downloader/downloads`. The original endpoint remains available for existing clients.

- The server returns 12 group headers per page and at most six preview tracks per group. An expanded group uses `/downloader/groups/{publicId}/items` in pages of 48; moving between pages replaces the old page. Only one group is expanded at once.
- Counters and the 14-day activity chart cover the entire visible history, not only loaded tracks. Status and album/playlist filters run in SQL. Search matches collection names or the actual matching songs; searching a song shows those songs inside the matching group.
- Browse metadata comes from narrow, local database queries. Opening downloads does not hydrate full albums/playlists, call remote providers or load complete progress histories. Active tiles read only their latest progress record; completed tiles need no progress lookup.
- New indexes cover user/group pagination and the latest progress lookup. WebSocket updates are batched at 100 ms, keep unaffected objects stable and preserve events received during an HTTP request. React memoizes group and track cards. Per-card intersection observers and entrance delays are removed from this screen.
- Unknown/terminal progress events reconcile at most once per 1.5 seconds while the screen is mounted. No background history fetch runs when the screen is unmounted. Focusing the page reconciles server state without replacing the page with a skeleton. Changing filters rejects stale responses.

## Albums, playlists and actions

A download group retains its original `sourcePublicId`. Headers show the original album/playlist title, cover and provider, a link to the source inside Rockit and an external provider link where supported. Each header includes whole-source Add to library and whole-group Delete/Redownload actions.

Group file actions are a single HTTP request and do not depend on which track pages are loaded. They require the whole group to be terminal and reject tracks that are still downloading in another group. Provider file paths are updated in batches; files are archived using the existing `.bakN` convention. Database failure restores archived files. Redownload queues lightweight tasks and resolves each provider only when a worker has capacity. Uploaded originals and unsupported providers do not offer these file actions. Deleting a download group does not delete the original Spotify playlist/album or its library entry.

The web UI removes a deleted group or track immediately and restores it on failure. Group deletion has a confirmation dialog; pending actions block repeated clicks. Retry/redownload switches to a queued state immediately and errors are reported. Track context menus have their name, cover and subtitle before any playback fetch. Completed tracks offer Add to library and Add to playlist as well.

## Reimporting a source that was already downloaded

Sending the original playlist/album URL again creates a source-aware group and reuses the existing files. The server reads stored paths in one provider-independent batch and checks actual, nonempty files inside the media directory in a worker thread. Existing files get completed records in the new group immediately; only missing files are queued. A fully available playlist is completed immediately with no provider downloads. Missing, empty or invalid paths are never treated as complete just because an older history entry succeeded.

Records are created in a batch and committed before workers can pick them up. Workers check availability again before contacting the provider, in case a file became available while waiting. Repeated songs within a source are deduplicated. Existing files and old history entries are preserved; the new group carries the original album/playlist identity. Explicit Redownload continues to clear/archive files and request fresh downloads.

## Automatic library preference

The “Automatically add downloads to my library” checkbox is available in Downloads and Settings. It is an account preference stored on the server, disabled by default, and applies to URL downloads and downloads of existing media, including requests from other clients. Explicit add-to-library requests still work when the preference is off. Album/playlist roots are saved as library entries with their songs inside the original container. Library insertion is idempotent.

## Deployment and historical groups

Apply `scripts/migrate_download_experience.sql` to the target PostgreSQL database **before starting the updated backend**. The additive, repeatable migration adds the account preference, source ID and visibility flag, browse/progress indexes and new vocabulary entries. Fresh schemas receive fields/indexes from the ORM; `Vocabulary.xlsx` contains the added translations.

Historical groups have no source ID because the old implementation did not store it. Their existing download groups and tracks remain browsable, searchable and manageable. Individual songs can still be saved to the library. Downloading the source again creates a group with the original source metadata and whole-source library action; no source is guessed from a title.

## Validation and performance reproduction

- Web: `npm test`, TypeScript and targeted ESLint in `apps/web`.
- Backend: `python -m pytest apps/backend/tests/unit -q`, plus Pyright on changed application modules.
- Browser checks with fixture API data: 12 groups/72 initial cards; 114 cards with one expanded group; track pagination remains at 114; immediate group deletion; no page errors or horizontal overflow on a 390px viewport.
- PostgreSQL benchmark, run from the repository root with a migrated development database containing at least one user and image:

  `DOWNLOAD_BENCHMARK_DATABASE_URL=postgresql+asyncpg://... PYTHONPATH=. python apps/backend/tests/performance/download_browse_benchmark.py`

The benchmark seeds 10,000 tracks in 200 groups and 200,000 progress rows, verifies pagination, search, counters and ownership, and rolls back the fixtures. It compares the old full-history operation with the new bounded first page. Timing is a local synthetic measurement, not a production latency guarantee; the comparison intentionally contrasts complete history with the first page. Payload and rendered-card limits are independent of history size.

One final local run on that fixture (full-history query first, so cache state may favor subsequent queries):

| Operation | Time | SQL queries | JSON payload | Returned tracks |
| --- | ---: | ---: | ---: | ---: |
| Previous full history | 8,267 ms | 23 | 3,308,665 bytes | 10,000 |
| New first page, including global counters/chart | 94 ms | 4 | 32,588 bytes | 72 |
| Search + failed albums | 606 ms | 4 | 31,100 bytes | 68 |
| Expanded group page | 15 ms | 3 | 17,776 bytes | 48 |

The benchmark also verifies batched path clearing, group retry resets, ownership checks and reimporting mixed/fully available sources without re-downloading existing files. These values exclude real Spotify/YouTube network calls and browser/network latency.
