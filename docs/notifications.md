# Event notifications

Rockit uses app-template's notification framework, schema, paginated inbox, read timestamps, destination resolution, and administrator-managed subscriptions. Notification messages store vocabulary keys and literal replacement values; the frontend translates and interpolates them once as text. Immediate success/error toasts remain local and do not create history.

Administrators select accounts and event subscriptions in Admin → Users. APIs are `GET /users/notification-events`, `GET /users/{public_id}/notification-subscriptions`, and `PATCH /users/{public_id}/notification-subscriptions`. Only administrators may manage subscriptions. No automatic subscriptions are created; zero subscribers is a successful no-op, matching app-template.

Registered events are APPLICATION_MESSAGE, DOWNLOAD_COMPLETED, DOWNLOAD_FAILED, IMPORT_COMPLETED, IMPORT_FAILED, FRIEND_REQUEST, MEDIA_SHARED, and ZIP_READY. Personal events require an explicit recipient and only deliver if that account subscribes. Download/import/social source keys prevent duplicate history when delivery is retried. Generic application messages may broadcast to subscribers. Emission uses a savepoint and never commits the caller's transaction.

The inbox API is `GET /notifications?limit=20&offset=0&unread_only=false`. `PATCH /notifications/{public_id}/read` and `GET /notifications/{public_id}/destination` enforce ownership. Existing release/activity/browser-migration endpoints are removed.

Startup runs the template's transactional migration runner. Existing server history is converted to the new representation with read state and public IDs preserved; the full pre-upgrade rows are retained in `core.notification_legacy_archive`. Local browser backups are left untouched. The old notification columns are removed after conversion.

Coverage lives in unit and direct controller tests; `apps/backend/tests/system_tests` remains empty.
