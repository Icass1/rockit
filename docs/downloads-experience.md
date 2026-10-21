# Downloads experience

Downloads now update in a shared web manager. Delete removes a finished card immediately and restores it on failure; retry/redownload switches to a queued state immediately. Pending actions block repeated clicks and show progress, and errors are reported instead of treating every HTTP response as success. WebSocket messages match the download UUID, not the media UUID. Unknown downloads trigger a debounced refresh; focusing the page reconciles server state without replacing the page with a skeleton.

The “Download and add to library” checkbox is available in Downloads and Settings. It is an account preference, stored on the server, disabled by default, and applies to both URL downloads and downloads of existing media (including requests from other clients). Explicit “add to library” requests still work when the preference is off. The original playlist/album is saved as a library entry; its songs remain part of the container.

A group started from one source retains `sourcePublicId`, so its “Add to library” button saves that playlist/album rather than creating a collection of unrelated songs. Completed cards also offer Add to library, Add to playlist, and Redownload. Adding to a playlist copies the song into the selected playlist. Deleting a finished card deletes the server media file and hides that download record; deleting active work is disabled. History rows remain for worker references.

## Deployment

Apply `scripts/migrate_download_experience.sql` to the target PostgreSQL database **before starting the updated backend**. It is additive and safe to repeat. It adds the account preference, the group's source public ID and the per-download history visibility flag. Fresh databases receive these fields from the ORM schema.

Historical groups have no source ID because the old implementation did not store it. Individual songs can still be added to the library; downloading a playlist again creates a group with its original source and the group action. No source is inferred from a title.

## Validation

- Web: `npm test` and `../../node_modules/.bin/tsc --noEmit` in `frontend/apps/web`.
- Backend regressions: `python -m pytest backend/tests/unit/test_download_experience.py backend/tests/unit/test_collections.py -q`.
- Apply the migration to a development database and verify account preference persistence, idempotent library insertion, distinct download records for the same song in different groups, scoped ownership checks and history hiding.
