# Web notifications

The bell and Sonner toasts share `NotificationManager`. Existing `notifyInfo`,
`notifySuccess`, `notifyWarn` and `notifyError` calls remain compatible and appear
under activity. Use `notify(type, message, options)` for a feature event:

```ts
rockIt.notificationManager.notify(ENotificationType.SUCCESS, title, {
    category: "import", // activity | download | import | release
    key: `import:${operationId}:completed`, // optional stable event identity
    detail: importedFileName,
    toast: true,
});
```

A key prevents repeated websocket deliveries from creating repeated entries or
toasts, including after dismissal and reload. Use operation IDs, not file names.
Retry attempts can have separate keys. Progress ticks should not create entries.
Toasts disappear independently from history; opening the bell does not mark
anything read. Users can mark individual/all entries read. The row X marks its notification
read and dismisses its toast; it does not delete history. Read entries show a
check instead of another close action. The panel has no delete-history control. History retains the latest 100 entries and
the latest 1,000 deduplication keys.

## Releases

Add published releases to `frontend/apps/web/lib/notifications/releases.ts`,
newest first, with a unique version, publication date and vocabulary keys for the
title and details. Entries are source controlled with the web deployment. The
initial announcement identifies RockIt 2 (2.0.0). Add future
announcement copy to `Vocabulary.xlsx` for each supported language, then run
`python3 -m backend import-vocabulary` against the target database. This imports
translations and regenerates the shared vocabulary interface. Notifications use
the same server vocabulary as the rest of the application, with no frontend
translation dictionary. Releases
appear silently once per browser/user; they do not use the Android APK API.

## Delivery and storage

History and read/dismiss state are local to this browser, under a username-scoped
versioned localStorage key. Invalid storage is validated with Zod and discarded;
unavailable storage falls back to memory. Signing out clears the active history
and visible toasts; signing in restores that account's local history. This does
not provide cross-device synchronization or a server-side inbox. Download
results are received through the existing authenticated websocket while the app
is connected; missed events are not replayed by this feature.

Downloads use explicit COMPLETED/FAILED states, not progress percentages.
Imports report the actual upload result. ZIP preparation reports that the file
has been handed to the browser: browsers do not expose completion of saving to
disk. Existing backend and mobile contracts are unchanged.

Run web `npm test`, `tsc --noEmit` and ESLint for verification. Notification tests
cover deduplication, persisted read state and retained history, account isolation, corrupt
storage, bounded history and release announcements.

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

Notifications deleted using the previous UI cannot be recovered: their stored
contents are no longer available. The new close behavior applies to retained
and newly received entries. History still retains at most 100 notifications.
