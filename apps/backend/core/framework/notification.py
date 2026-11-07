from dataclasses import dataclass
from typing import cast

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.notification import NotificationRow
from core.access.notificationAccess import NotificationAccess
from core.responses.notificationResponses import (
    NotificationDestination,
    NotificationDestinationResponse,
    NotificationEventKey,
    NotificationEventResponse,
    NotificationReplacement,
    NotificationSubscriptionsResponse,
)
from logger import logger
from result import Result, ResultCode


@dataclass(frozen=True)
class NotificationEvent:
    key: NotificationEventKey
    label_key: str
    message_key: str
    replacement_keys: tuple[str, ...]


APPLICATION_MESSAGE_NOTIFICATION = NotificationEvent(
    key="APPLICATION_MESSAGE",
    label_key="NOTIFICATION_EVENT_APPLICATION_MESSAGE",
    message_key="NOTIFICATION_APPLICATION_MESSAGE",
    replacement_keys=("MESSAGE",),
)

DOWNLOAD_COMPLETED_NOTIFICATION = NotificationEvent(
    "DOWNLOAD_COMPLETED",
    "NOTIFICATION_EVENT_DOWNLOAD_COMPLETED",
    "NOTIFICATION_DOWNLOAD_COMPLETED",
    ("TITLE",),
)
DOWNLOAD_FAILED_NOTIFICATION = NotificationEvent(
    "DOWNLOAD_FAILED",
    "NOTIFICATION_EVENT_DOWNLOAD_FAILED",
    "NOTIFICATION_DOWNLOAD_FAILED",
    ("TITLE",),
)
IMPORT_COMPLETED_NOTIFICATION = NotificationEvent(
    "IMPORT_COMPLETED",
    "NOTIFICATION_EVENT_IMPORT_COMPLETED",
    "NOTIFICATION_IMPORT_COMPLETED",
    ("TITLE",),
)
IMPORT_FAILED_NOTIFICATION = NotificationEvent(
    "IMPORT_FAILED", "NOTIFICATION_EVENT_IMPORT_FAILED", "NOTIFICATION_IMPORT_FAILED", ("TITLE",)
)
FRIEND_REQUEST_NOTIFICATION = NotificationEvent(
    "FRIEND_REQUEST", "NOTIFICATION_EVENT_FRIEND_REQUEST", "NOTIFICATION_FRIEND_REQUEST", ()
)
MEDIA_SHARED_NOTIFICATION = NotificationEvent(
    "MEDIA_SHARED", "NOTIFICATION_EVENT_MEDIA_SHARED", "NOTIFICATION_MEDIA_SHARED", ("MESSAGE",)
)
ZIP_READY_NOTIFICATION = NotificationEvent(
    "ZIP_READY", "NOTIFICATION_EVENT_ZIP_READY", "NOTIFICATION_ZIP_READY", ("TITLE",)
)
NOTIFICATION_EVENTS = [
    APPLICATION_MESSAGE_NOTIFICATION,
    DOWNLOAD_COMPLETED_NOTIFICATION,
    DOWNLOAD_FAILED_NOTIFICATION,
    IMPORT_COMPLETED_NOTIFICATION,
    IMPORT_FAILED_NOTIFICATION,
    FRIEND_REQUEST_NOTIFICATION,
    MEDIA_SHARED_NOTIFICATION,
    ZIP_READY_NOTIFICATION,
]
PERSONAL_NOTIFICATION_EVENTS = frozenset(
    event.key for event in NOTIFICATION_EVENTS if event is not APPLICATION_MESSAGE_NOTIFICATION
)


class Notification:
    @staticmethod
    def list_events() -> list[NotificationEventResponse]:
        """Expose registered events for per-user notification settings."""
        return [
            NotificationEventResponse(key=event.key, vocabularyKey=event.label_key)
            for event in NOTIFICATION_EVENTS
        ]

    @staticmethod
    async def emit_async(
        session: AsyncSession,
        event: NotificationEvent,
        replacements: list[NotificationReplacement],
        destination: NotificationDestination | None = None,
        *,
        recipient_user_id: int | None = None,
    ) -> Result[int]:
        """Dispatch a registered event to subscribers in the caller's transaction.

        Framework callers pass placeholder names without braces, e.g. MESSAGE.
        Neither language selection nor interpolation happens until frontend rendering.
        """
        if event not in NOTIFICATION_EVENTS:
            return Result[int](ResultCode.BAD_REQUEST, "Unknown notification event")
        if event.key in PERSONAL_NOTIFICATION_EVENTS and recipient_user_id is None:
            return Result[int](ResultCode.BAD_REQUEST, "Personal notification requires a recipient")
        keys = [replacement.key for replacement in replacements]
        if len(keys) != len(set(keys)) or set(keys) != set(event.replacement_keys):
            return Result[int](
                ResultCode.BAD_REQUEST, "Notification replacements do not match the event"
            )
        try:
            async with session.begin_nested() as transaction:
                result: Result[int] = await NotificationAccess.deliver_async(
                    session,
                    event.key,
                    event.message_key,
                    replacements,
                    destination,
                    recipient_user_id,
                )
                if result.is_not_ok():
                    await transaction.rollback()
                    return Result[int].from_result(result)
                return result
        except Exception:
            logger.exception("Error delivering notification event %s", event.key)
            return Result[int](ResultCode.GENERAL_ERROR, "Error delivering notification event")

    @staticmethod
    async def get_subscriptions_async(
        session: AsyncSession, user_id: int
    ) -> Result[NotificationSubscriptionsResponse]:
        """Get the authenticated user's event subscriptions."""
        result: Result[list[str]] = await NotificationAccess.get_subscriptions_async(
            session, user_id
        )
        if result.is_not_ok():
            return Result[NotificationSubscriptionsResponse].from_result(result)
        return Result[NotificationSubscriptionsResponse].ok(
            NotificationSubscriptionsResponse(
                eventKeys=cast(list[NotificationEventKey], result.result())
            )
        )

    @staticmethod
    async def set_subscriptions_async(
        session: AsyncSession, user_id: int, event_keys: list[NotificationEventKey]
    ) -> Result[NotificationSubscriptionsResponse]:
        """Validate and replace the authenticated user's event subscriptions."""
        if not set(event_keys).issubset({event.key for event in NOTIFICATION_EVENTS}):
            return Result[NotificationSubscriptionsResponse](
                ResultCode.BAD_REQUEST, "Unknown notification event"
            )
        result: Result[list[str]] = await NotificationAccess.set_subscriptions_async(
            session, user_id, list(event_keys)
        )
        if result.is_not_ok():
            return Result[NotificationSubscriptionsResponse].from_result(result)
        return Result[NotificationSubscriptionsResponse].ok(
            NotificationSubscriptionsResponse(
                eventKeys=cast(list[NotificationEventKey], result.result())
            )
        )

    @staticmethod
    async def list_async(
        session: AsyncSession, user_id: int, limit: int, offset: int, unread_only: bool = False
    ) -> Result[tuple[list[NotificationRow], int, int]]:
        """List a user's paginated notification history."""
        return await NotificationAccess.list_async(session, user_id, limit, offset, unread_only)

    @staticmethod
    async def get_destination_async(
        session: AsyncSession, user_id: int, public_id: str
    ) -> Result[NotificationDestinationResponse]:
        """Resolve an owned notification to a page or a freshly signed current document URL."""
        found = await NotificationAccess.get_from_public_id_async(session, user_id, public_id)
        if found.is_not_ok():
            return Result[NotificationDestinationResponse].from_result(found)
        stored = found.result().destination
        if stored is None:
            return Result[NotificationDestinationResponse](
                ResultCode.NOT_FOUND, "Notification has no destination"
            )
        destination = NotificationDestination.model_validate(stored)
        return Result[NotificationDestinationResponse].ok(
            NotificationDestinationResponse(url=destination.path, newTab=False)
        )

    @staticmethod
    async def mark_read_async(
        session: AsyncSession, user_id: int, public_id: str
    ) -> Result[NotificationRow]:
        """Mark a notification read for its authenticated owner."""
        result = await NotificationAccess.mark_read_async(session, user_id, public_id)
        if result.is_ok():
            from core.framework.friend.notifications import notify_notifications_after_commit

            notify_notifications_after_commit(session=session, user_id=user_id)
        return result

    @staticmethod
    async def download_async(
        session: AsyncSession,
        user_id: int,
        success: bool,
        title: str,
    ) -> Result[int]:
        """Dispatch a download result only to its subscribed owner."""
        event = DOWNLOAD_COMPLETED_NOTIFICATION if success else DOWNLOAD_FAILED_NOTIFICATION
        return await Notification.emit_async(
            session,
            event,
            [NotificationReplacement(key="TITLE", value=title[:2000])],
            NotificationDestination(path="/downloads"),
            recipient_user_id=user_id,
        )

    @staticmethod
    async def import_async(
        session: AsyncSession, user_id: int, success: bool, title: str
    ) -> Result[int]:
        """Dispatch an import result only to its subscribed owner."""
        event = IMPORT_COMPLETED_NOTIFICATION if success else IMPORT_FAILED_NOTIFICATION
        return await Notification.emit_async(
            session,
            event,
            [NotificationReplacement(key="TITLE", value=title[:2000])],
            NotificationDestination(path="/library"),
            recipient_user_id=user_id,
        )

    @staticmethod
    async def social_async(
        session: AsyncSession, user_id: int, event_key: str, message: str, detail: str | None = None
    ) -> Result[int]:
        """Deliver friend and share events without broadcasting personal activity."""
        event = (
            FRIEND_REQUEST_NOTIFICATION
            if event_key.startswith("friend_request:")
            else MEDIA_SHARED_NOTIFICATION
        )
        replacements = (
            []
            if event is FRIEND_REQUEST_NOTIFICATION
            else [NotificationReplacement(key="MESSAGE", value=detail or "")]
        )
        return await Notification.emit_async(
            session,
            event,
            replacements,
            NotificationDestination(path="/friends"),
            recipient_user_id=user_id,
        )
