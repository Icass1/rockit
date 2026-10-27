import uuid
from collections.abc import Sequence
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, desc, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.friend.listenTogether import (
    ListenTogetherSessionRow,
)
from core.aResult import AResult, AResultCode
from core.enums.friend.listenTogetherStatusEnum import (
    ListenTogetherStatusEnum,
)
from core.utils.safeAsyncCall import safe_async
from logger import getLogger

logger = getLogger(__name__)


class ListenTogetherAccess:
    @staticmethod
    @safe_async
    async def create_session_async(
        session: AsyncSession,
        host_user_id: int,
        guest_user_id: int,
    ) -> AResult[ListenTogetherSessionRow]:
        row = ListenTogetherSessionRow(
            public_id=str(uuid.uuid4()),
            host_user_id=host_user_id,
            guest_user_id=guest_user_id,
            status_key=ListenTogetherStatusEnum.INVITED.value,
        )
        session.add(row)
        await session.flush()
        await session.refresh(row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_session_by_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[ListenTogetherSessionRow]:
        expired = await ListenTogetherAccess.expire_async(session)
        if expired.is_not_ok():
            logger.error(f"Error expiring sessions. {expired.info()}")
            return AResult(code=expired.code(), message=expired.message())
        stmt = (
            select(ListenTogetherSessionRow)
            .where(ListenTogetherSessionRow.public_id == public_id)
            .with_for_update(of=ListenTogetherSessionRow)
            .execution_options(populate_existing=True)
        )
        result = await session.execute(stmt)
        row: ListenTogetherSessionRow | None = result.scalars().first()
        if row is None:
            return AResult(code=AResultCode.NOT_FOUND, message="Listen together session not found")
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_active_session_for_users_async(
        session: AsyncSession, user_id_1: int, user_id_2: int
    ) -> AResult[ListenTogetherSessionRow | None]:
        stmt = select(ListenTogetherSessionRow).where(
            ListenTogetherSessionRow.status_key.in_(
                [
                    ListenTogetherStatusEnum.ACTIVE.value,
                    ListenTogetherStatusEnum.INVITED.value,
                ]
            ),
            (
                (ListenTogetherSessionRow.host_user_id == user_id_1)
                & (ListenTogetherSessionRow.guest_user_id == user_id_2)
            )
            | (
                (ListenTogetherSessionRow.host_user_id == user_id_2)
                & (ListenTogetherSessionRow.guest_user_id == user_id_1)
            ),
        )
        result = await session.execute(stmt)
        row: ListenTogetherSessionRow | None = result.scalars().first()
        if row is None:
            return AResult(code=AResultCode.NOT_FOUND, message="Not found")
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_active_sessions_for_user_async(
        session: AsyncSession, user_id: int
    ) -> AResult[list[ListenTogetherSessionRow]]:
        expired = await ListenTogetherAccess.expire_async(session)
        if expired.is_not_ok():
            logger.error(f"Error expiring sessions. {expired.info()}")
            return AResult(code=expired.code(), message=expired.message())
        stmt = (
            select(ListenTogetherSessionRow)
            .where(
                ListenTogetherSessionRow.status_key.in_(
                    [
                        ListenTogetherStatusEnum.ACTIVE.value,
                        ListenTogetherStatusEnum.INVITED.value,
                    ]
                ),
                (ListenTogetherSessionRow.host_user_id == user_id)
                | (ListenTogetherSessionRow.guest_user_id == user_id),
            )
            .order_by(desc(ListenTogetherSessionRow.date_added))
        )
        result = await session.execute(stmt)
        rows: Sequence[ListenTogetherSessionRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def update_session_sync_async(
        session: AsyncSession,
        session_row: ListenTogetherSessionRow,
        current_media_id: int | None = None,
        current_time_ms: int | None = None,
        is_playing: bool | None = None,
        queue_json: str | None = None,
    ) -> AResult[ListenTogetherSessionRow]:
        session_row.current_media_id = current_media_id
        session_row.date_updated = datetime.now(UTC)
        if current_time_ms is not None:
            session_row.current_time_ms = current_time_ms
        if is_playing is not None:
            session_row.is_playing = is_playing
        if queue_json is not None:
            session_row.queue_json = queue_json
        await session.flush()
        await session.refresh(session_row)
        return AResult(code=AResultCode.OK, message="OK", result=session_row)

    @staticmethod
    @safe_async
    async def end_session_async(
        session: AsyncSession, session_row: ListenTogetherSessionRow
    ) -> AResultCode:
        session_row.status_key = ListenTogetherStatusEnum.ENDED.value
        await session.flush()
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def join_session_async(
        session: AsyncSession, session_row: ListenTogetherSessionRow
    ) -> AResult[ListenTogetherSessionRow]:
        session_row.date_updated = datetime.now(UTC)
        session_row.status = ListenTogetherStatusEnum.ACTIVE
        await session.flush()
        return AResult(code=AResultCode.OK, message="OK", result=session_row)

    @staticmethod
    @safe_async
    async def expire_async(session: AsyncSession) -> AResultCode:
        now = datetime.now(UTC)
        await session.execute(
            update(ListenTogetherSessionRow)
            .where(
                or_(
                    and_(
                        ListenTogetherSessionRow.status_key
                        == ListenTogetherStatusEnum.ACTIVE.value,
                        ListenTogetherSessionRow.date_updated < now - timedelta(minutes=2),
                    ),
                    and_(
                        ListenTogetherSessionRow.status_key
                        == ListenTogetherStatusEnum.INVITED.value,
                        ListenTogetherSessionRow.date_updated < now - timedelta(days=1),
                    ),
                )
            )
            .values(status_key=ListenTogetherStatusEnum.ENDED.value)
        )
        return AResultCode(code=AResultCode.OK, message="OK")
