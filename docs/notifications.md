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
anything read. Users can mark individual/all entries read, remove individual
entries, or clear only read entries. History retains the latest 100 entries and
the latest 1,000 deduplication keys.

## Releases

Add published releases to `frontend/apps/web/lib/notifications/releases.ts`,
newest first, with a unique version, publication date and vocabulary keys for the
title and details. Entries are source controlled with the web deployment. The
initial announcement uses the existing web package version, 0.1.0. Add future
announcement copy to the notification vocabulary defaults (English and Spanish),
or the server vocabulary. Server vocabulary values override defaults. Releases
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
cover deduplication, persisted read/dismiss state, account isolation, corrupt
storage, bounded history and release announcements.
