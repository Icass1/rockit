# Event notifications

Notifications use app-template's transactional delivery, subscription administration,
owned history/read/destination routes, and vocabulary replacement model. Rockit registers
`APPLICATION_MESSAGE`, `DOWNLOAD_COMPLETED`, `DOWNLOAD_FAILED`, and `BUILD_PUBLISHED`.
Subscriptions opt users into future events; unsubscribing preserves existing history.
Download/build events are emitted from their completed application operations.

Administrators use the web Admin → Users panel, or `GET /users/notification-events`,
`GET /users/notification-users`, and `GET`/`PATCH
/users/{public_id}/notification-subscriptions`. PATCH accepts `{"eventKeys": [...]}`.
Only admin sessions may read or change other users' subscriptions.

`GET /notifications` is paginated and returns unread/total counts. PATCH
`/notifications/{public_id}/read` and GET `/notifications/{public_id}/destination`
resolve only the authenticated user's records. Destinations are relative application
paths, rejecting external URLs, protocol-relative URLs, backslashes, and control characters.

Web and mobile render persistent history, pagination, read state, translated messages,
and destinations. The web bell polls while the document is visible; the mobile inbox polls
while the app is active. Replacement values render as text and interpolate only once.
These notifications complement live playback/download WebSockets; they are not OS push.

Emit within the active operation's database session. Delivery uses a savepoint and never
commits the outer transaction. An outer rollback removes its notifications. Add events,
translations in `Vocabulary.xlsx`, and regenerated contracts together. No subscribers is
a successful no-op; unknown events and missing/duplicate replacement keys are rejected.
