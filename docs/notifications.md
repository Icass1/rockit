# Notifications

The backend owns the inbox, event identity and read receipts. `core.notification`
contains one row per recipient/event, with a unique `(user_id, event_key)` constraint.
Notifications survive browser changes and disconnected clients. Listing and marking
read always use the authenticated user's internal ID; the API exposes public IDs only.
The bell keeps All, Unread and Read filters. Its X marks read without deleting history.
Opening the bell does not mark anything read.

## Delivery and producers

- Download workers persist COMPLETED/FAILED notifications after automatic retries
  finish, before broadcasting terminal websocket progress. Keys include the download
  ID, status and retry count. Progress ticks do not create notifications.
- Upload endpoints record the provider's final result for songs, albums and videos,
  including chunked uploads. Validation and transport errors before a provider result
  remain local form errors.
- ZIP creation records archive availability. The browser toast reports handoff to the
  browser, not completion of saving to disk.
- Published release announcements live in `backend/core/framework/notifications.py`.
  The server lazily creates the current announcement once per user; reads never reset
  on a subsequent request. Existing announcements stay in the database.
- Other UI activity can use the authenticated personal-activity endpoint. It cannot
  publish releases or download results for other users.

`NotificationManager` is a presentation/synchronization adapter. It loads history on
login, focus, reconnecting to the network and every 30 seconds while logged in.
Terminal download websocket events and upload responses refresh immediately. Other
devices pick up read receipts on the next refresh. Initial history and releases are
silent; newly received unread activity can show a toast. Failed read requests do not
change local read state. Signing out clears the visible history and toasts, and stale
requests cannot restore another account's data.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/notifications` | Latest 100 notifications, newest event date first |
| POST | `/notifications/read` | Mark a supplied list of public IDs read |
| POST | `/notifications/activity` | Record personal UI feedback |
| POST | `/notifications/legacy` | Import up to 100 retained browser notifications |

History is retained in PostgreSQL; the current panel displays the latest 100.
Mark-all-read applies to the displayed unread entries. Server copy is resolved from
the existing database vocabulary for the user's language. Add translations to
`Vocabulary.xlsx` and run `python3 -m backend import-vocabulary` as usual; there is
no frontend release catalog or fallback dictionary.

## Upgrade and verification

The existing backend schema initialization creates the new table and index on startup.
Deploy the backend before the frontend. On first login, the client imports that
account's old `rockit.notifications.v1:*` history through the bounded migration API.
The import is idempotent and combines read receipts without resetting read entries.
The browser retains its old data as a backup and records a migration marker only
once the server acknowledges the import. Failed imports retry on a subsequent
refresh. Old entries already deleted by previous versions cannot be recovered.

Run web `npm test`, `tsc --noEmit`, backend `pyright` and `black --check .`.
PostgreSQL integration tests cover recipient isolation, deduplication, read receipts,
translations, disconnected producers and legacy migration. They use disposable
per-test databases via the existing `ROCKIT_TEST_DATABASE_URL` fixture:

```sh
pytest backend/tests/integration/test_notifications.py
```

## Header panels

The center has All, Unread and Read filters. Release announcements remain ordinary
notifications in these views. Both the bell and account dropdown show a pink
active state and a small pointer joining the panel to its trigger. Escape closes
the panel and returns focus. The account panel shows the actual web build version.

## Automatic RockIt 2 versions

`node frontend/scripts/version.cjs` calculates `2.minor.patch` from Git. The major
is fixed at 2. The bootstrap baseline is recorded in `frontend/version.json`:
old history does not turn the first RockIt 2 build into a large patch number.
Each non-merge commit since the latest stable tag adds one patch. Merge commits
do not add a patch; merging a feature into develop retains the count of its
actual commits. Squash merging retains one commit and therefore counts once.
Versions follow committed history; uncommitted edits do not change the number.

A merged PR from develop into main is
detected by the Docker publishing workflow. It increments minor, resets patch,
and creates `v2.N.0` on that promotion commit. Retrying that workflow reuses its
existing tag. Subsequent develop commits count from that release's contents even
if its merge commit has not been merged back to develop. Use merge commits for
develop-to-stable promotions to preserve shared commit ancestry; squash/rebase
promotions would count the retained development commits again.

Publishing runs only on main. Develop does not publish images. Both images receive
the same version and a version-plus-SHA image tag; the rolling tag is
latest-stable. Full Git history and tags are required. The
web dev/build config calculates its version automatically and displays it in the
account menu. Docker receives it as ROCKIT_VERSION because .git is excluded from
the image context. For local Docker builds use:

```sh
ROCKIT_VERSION=$(node frontend/scripts/version.cjs) docker compose build
```

Without that override, manual Docker builds use the bootstrap 2.0.0. CI always
passes the calculated value. Mobile APK/store versioning remains separate.
No pre-commit file mutation or bot version commits are needed. Version tags do
not automatically create notification copy: published announcements remain curated
in the release catalog, so every development commit does not generate a new alert.
