import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.notification import NotificationRow
from core.access.db.ormModels.notificationSubscription import NotificationSubscriptionRow
from core.access.db.ormModels.user import UserRow
from core.responses.notificationResponses import NotificationDestination, NotificationReplacement
from result import Result, ResultCode


class NotificationAccess:
    @staticmethod
    async def get_subscriptions_async(session: AsyncSession, user_id: int) -> Result[list[str]]:
        """List a user's subscribed event keys."""
        keys = await session.scalars(
            select(NotificationSubscriptionRow.event_key)
            .where(NotificationSubscriptionRow.user_id == user_id)
            .order_by(NotificationSubscriptionRow.event_key)
        )
        return Result[list[str]].ok(list(keys))

    @staticmethod
    async def set_subscriptions_async(
        session: AsyncSession, user_id: int, event_keys: list[str]
    ) -> Result[list[str]]:
        """Replace subscriptions while serializing concurrent edits to the same user."""
        await session.execute(select(UserRow.id).where(UserRow.id == user_id).with_for_update())
        await session.execute(
            delete(NotificationSubscriptionRow).where(
                NotificationSubscriptionRow.user_id == user_id
            )
        )
        keys = sorted(set(event_keys))
        if keys:
            await session.execute(
                insert(NotificationSubscriptionRow),
                [{"user_id": user_id, "event_key": key} for key in keys],
            )
        return Result[list[str]].ok(keys)

    @staticmethod
    async def deliver_async(
        session: AsyncSession,
        event_key: str,
        vocabulary_key: str,
        replacements: list[NotificationReplacement],
        destination: NotificationDestination | None = None,
        recipient_user_id: int | None = None,
    ) -> Result[int]:
        """Persist one untranslated notification per current subscriber without committing."""
        subscribers = select(NotificationSubscriptionRow.user_id).where(
            NotificationSubscriptionRow.event_key == event_key
        )
        if recipient_user_id is not None:
            subscribers = subscribers.where(
                NotificationSubscriptionRow.user_id == recipient_user_id
            )
        user_ids = list(await session.scalars(subscribers))
        session.add_all(
            [
                NotificationRow(
                    user_id=user_id,
                    public_id=str(uuid.uuid4()),
                    event_key=event_key,
                    vocabulary_key=vocabulary_key,
                    replacements=[replacement.model_dump() for replacement in replacements],
                    destination=destination.model_dump() if destination is not None else None,
                )
                for user_id in user_ids
            ]
        )
        await session.flush()
        return Result[int].ok(len(user_ids))

    @staticmethod
    async def list_async(
        session: AsyncSession, user_id: int, limit: int, offset: int, unread_only: bool = False
    ) -> Result[tuple[list[NotificationRow], int, int]]:
        """Return only the current user's notifications and counts."""
        counts = (
            await session.execute(
                select(
                    func.count(NotificationRow.id),
                    func.count(NotificationRow.id).filter(NotificationRow.read_at.is_(None)),
                ).where(NotificationRow.user_id == user_id)
            )
        ).one()
        query = select(NotificationRow).where(NotificationRow.user_id == user_id)
        if unread_only:
            query = query.where(NotificationRow.read_at.is_(None))
        rows = list(
            await session.scalars(
                query.order_by(NotificationRow.date_added.desc(), NotificationRow.id.desc())
                .limit(limit)
                .offset(offset)
            )
        )
        total = counts[1] if unread_only else counts[0]
        return Result[tuple[list[NotificationRow], int, int]].ok((rows, counts[1], total))

    @staticmethod
    async def get_from_public_id_async(
        session: AsyncSession, user_id: int, public_id: str
    ) -> Result[NotificationRow]:
        """Find a notification only when it belongs to the authenticated user."""
        row = await session.scalar(
            select(NotificationRow).where(
                NotificationRow.user_id == user_id, NotificationRow.public_id == public_id
            )
        )
        if row is None:
            return Result[NotificationRow](ResultCode.NOT_FOUND, "Notification not found")
        return Result[NotificationRow].ok(row)

    @staticmethod
    async def mark_read_async(
        session: AsyncSession, user_id: int, public_id: str
    ) -> Result[NotificationRow]:
        """Mark an owned notification read without exposing other users' notifications."""
        row = await session.scalar(
            select(NotificationRow)
            .where(NotificationRow.user_id == user_id, NotificationRow.public_id == public_id)
            .with_for_update()
        )
        if row is None:
            return Result[NotificationRow](ResultCode.NOT_FOUND, "Notification not found")
        if row.read_at is None:
            row.read_at = datetime.now(UTC)
            await session.flush()
        return Result[NotificationRow].ok(row)
