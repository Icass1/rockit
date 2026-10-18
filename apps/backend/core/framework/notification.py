from backend.core.access.db.ormModels.user import UserRow
from dataclasses import dataclass
from typing import cast

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.access.db.ormModels.notification import NotificationRow
from backend.core.access.notificationAccess import NotificationAccess
from backend.core.access.userAccess import UserAccess
from backend.core.responses.notificationResponses import (
    NotificationDestination,
    NotificationDestinationResponse,
    NotificationEventKey,
    NotificationEventResponse,
    NotificationReplacement,
    NotificationSubscriptionsResponse,
)
from backend.utils.logger import getLogger

logger = getLogger(__name__)
from backend.core.aResult import AResult as Result, AResultCode as ResultCode


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
    key="DOWNLOAD_COMPLETED",
    label_key="NOTIFICATION_EVENT_DOWNLOAD_COMPLETED",
    message_key="NOTIFICATION_DOWNLOAD_COMPLETED",
    replacement_keys=("TITLE",),
)
DOWNLOAD_FAILED_NOTIFICATION = NotificationEvent(
    key="DOWNLOAD_FAILED",
    label_key="NOTIFICATION_EVENT_DOWNLOAD_FAILED",
    message_key="NOTIFICATION_DOWNLOAD_FAILED",
    replacement_keys=("TITLE",),
)
BUILD_PUBLISHED_NOTIFICATION = NotificationEvent(
    key="BUILD_PUBLISHED",
    label_key="NOTIFICATION_EVENT_BUILD_PUBLISHED",
    message_key="NOTIFICATION_BUILD_PUBLISHED",
    replacement_keys=("VERSION",),
)
NOTIFICATION_EVENTS = [
    APPLICATION_MESSAGE_NOTIFICATION,
    DOWNLOAD_COMPLETED_NOTIFICATION,
    DOWNLOAD_FAILED_NOTIFICATION,
    BUILD_PUBLISHED_NOTIFICATION,
]


class Notification:
    @staticmethod
    def list_events() -> list[NotificationEventResponse]:
        """Expose registered events for the admin subscription editor."""
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
    ) -> Result[int]:
        """Dispatch a registered event to subscribers in the caller's transaction.

        Framework callers pass placeholder names without braces, e.g. MESSAGE.
        Neither language selection nor interpolation happens until frontend rendering.
        """
        if event not in NOTIFICATION_EVENTS:
            return Result[int](ResultCode.BAD_REQUEST, "Unknown notification event")
        keys = [replacement.key for replacement in replacements]
        if len(keys) != len(set(keys)) or set(keys) != set(event.replacement_keys):
            return Result[int](
                ResultCode.BAD_REQUEST,
                "Notification replacements do not match the event",
            )
        try:
            async with session.begin_nested() as transaction:
                result: Result[int] = await NotificationAccess.deliver_async(
                    session, event.key, event.message_key, replacements, destination
                )
                if result.is_not_ok():
                    await transaction.rollback()
                    return Result[int].from_result(result)
                return result
        except Exception:
            logger.exception("Error delivering notification event %s", event.key)
            return Result[int](
                ResultCode.GENERAL_ERROR, "Error delivering notification event"
            )

    @staticmethod
    async def get_subscriptions_async(
        session: AsyncSession, user_public_id: str
    ) -> Result[NotificationSubscriptionsResponse]:
        """Get subscriptions for an existing admin-selected user."""
        user_result = await UserAccess.get_user_from_public_id_async(
            session, user_public_id
        )
        if user_result.is_not_ok():
            return Result[NotificationSubscriptionsResponse].from_result(user_result)
        result: Result[list[str]] = await NotificationAccess.get_subscriptions_async(
            session, user_result.result().id
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
        session: AsyncSession,
        user_public_id: str,
        event_keys: list[NotificationEventKey],
    ) -> Result[NotificationSubscriptionsResponse]:
        """Validate and replace subscriptions for an admin-selected user."""
        if not set(event_keys).issubset({event.key for event in NOTIFICATION_EVENTS}):
            return Result[NotificationSubscriptionsResponse](
                ResultCode.BAD_REQUEST, "Unknown notification event"
            )
        user_result = await UserAccess.get_user_from_public_id_async(
            session, user_public_id
        )
        if user_result.is_not_ok():
            return Result[NotificationSubscriptionsResponse].from_result(user_result)
        result: Result[list[str]] = await NotificationAccess.set_subscriptions_async(
            session, user_result.result().id, list(event_keys)
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
        session: AsyncSession,
        user_id: int,
        limit: int,
        offset: int,
        unread_only: bool = False,
    ) -> Result[tuple[list[NotificationRow], int, int]]:
        """List a user's paginated notification history."""
        return await NotificationAccess.list_async(
            session, user_id, limit, offset, unread_only
        )

    @staticmethod
    async def get_destination_async(
        session: AsyncSession, user_id: int, public_id: str
    ) -> Result[NotificationDestinationResponse]:
        """Resolve an owned notification to a page or a freshly signed current document URL."""
        found = await NotificationAccess.get_from_public_id_async(
            session, user_id, public_id
        )
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
        return await NotificationAccess.mark_read_async(session, user_id, public_id)

    @staticmethod
    async def users_async(session: AsyncSession) -> Result[list[UserRow]]:
        return await NotificationAccess.users_async(session=session)
