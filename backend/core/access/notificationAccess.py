from datetime import datetime, timezone
from hashlib import sha256
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.sql.base import Executable
from sqlalchemy.ext.asyncio import AsyncConnection, AsyncSession

from backend.utils.backendUtils import create_id
from backend.core.aResult import AResult, AResultCode
from backend.core.utils.safeAsyncCall import safe_async
from backend.core.access.db.ormModels.notification import NotificationRow
from backend.core.requests.notificationRequest import LegacyNotificationRequest


class NotificationAccess:
    @staticmethod
    @safe_async
    async def create_async(
        session: AsyncSession,
        user_id: int,
        event_key: str,
        type: int,
        category: str,
        message: str = "",
        message_key: str | None = None,
        detail: str | None = None,
        detail_key: str | None = None,
    ) -> AResult[bool]:
        """Persist an event once per recipient, including concurrent deliveries."""
        statement = (
            insert(NotificationRow)
            .values(
                public_id=create_id(32),
                user_id=user_id,
                event_key=event_key,
                type=type,
                category=category,
                message=message,
                message_key=message_key,
                detail=detail,
                detail_key=detail_key,
                read=False,
            )
            .on_conflict_do_nothing(constraint="uq_notification_user_event")
            .returning(NotificationRow.id)
        )
        # A failed optional notification must not roll back the upload/download itself.
        async with session.begin_nested() as savepoint:
            result = await NotificationAccess._insert_async(
                connection=await session.connection(),
                statement=statement,
            )
            if result.is_not_ok():
                await savepoint.rollback()
            return result

    @staticmethod
    @safe_async
    async def _insert_async(
        connection: AsyncConnection, statement: Executable
    ) -> AResult[bool]:
        """Execute within the caller's savepoint; the caller handles rollback."""
        result = await connection.execute(statement=statement)
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=result.scalar_one_or_none() is not None,
        )

    @staticmethod
    @safe_async
    async def list_async(
        session: AsyncSession, user_id: int
    ) -> AResult[list[NotificationRow]]:
        """Return the latest 100 entries belonging to the authenticated user."""
        result = await session.execute(
            statement=select(NotificationRow)
            .where(
                NotificationRow.user_id == user_id,
            )
            .order_by(NotificationRow.date_added.desc(), NotificationRow.id.desc())
            .limit(100)
        )
        return AResult(
            code=AResultCode.OK, message="OK", result=list(result.scalars().all())
        )

    @staticmethod
    @safe_async
    async def mark_read_async(
        session: AsyncSession, user_id: int, public_ids: list[str]
    ) -> AResult[bool]:
        """Mark only the specified recipient-owned entries read; retain history."""
        await session.execute(
            statement=update(NotificationRow)
            .where(
                NotificationRow.user_id == user_id,
                NotificationRow.public_id.in_(public_ids),
            )
            .values(read=True)
        )
        return AResult(code=AResultCode.OK, message="OK", result=True)

    @staticmethod
    @safe_async
    async def migrate_legacy_async(
        session: AsyncSession, user_id: int, items: list[LegacyNotificationRequest]
    ) -> AResult[bool]:
        """Import browser history in one idempotent batch, preserving read receipts."""
        values: dict[str, dict[str, object]] = {}
        for item in sorted(items, key=lambda item: item.createdAt):
            event_key = (
                item.key
                or "legacy:"
                + sha256(
                    item.model_dump_json(exclude={"id", "read"}).encode()
                ).hexdigest()
            )
            value: dict[str, object] = dict(
                public_id=create_id(32),
                user_id=user_id,
                event_key=event_key,
                type=item.type,
                category=item.category,
                message=item.message,
                detail=item.detail,
                date_added=datetime.fromtimestamp(
                    item.createdAt / 1000, tz=timezone.utc
                ),
                read=item.read,
            )
            if event_key in values:
                value["read"] = bool(value["read"] or values[event_key]["read"])
            values[event_key] = value
        if values:
            statement = insert(NotificationRow).values(list(values.values()))
            statement = statement.on_conflict_do_update(
                constraint="uq_notification_user_event",
                set_={"read": NotificationRow.read | statement.excluded.read},
            )
            await session.execute(statement=statement)
        return AResult(code=AResultCode.OK, message="OK", result=True)
