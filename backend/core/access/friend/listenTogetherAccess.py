import uuid
import json
from typing import List, Sequence

from sqlalchemy import Result, Select, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.utils.safeAsyncCall import safe_async
from backend.core.access.db.ormModels.friend.listenTogether import (
    ListenTogetherSessionRow,
)
from backend.core.enums.friend.listenTogetherStatusEnum import (
    ListenTogetherStatusEnum,
)

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
        stmt: Select = select(ListenTogetherSessionRow).where(
            ListenTogetherSessionRow.public_id == public_id
        )
        result: Result = await session.execute(stmt)
        row: ListenTogetherSessionRow | None = result.scalars().first()
        if row is None:
            return AResult(
                code=AResultCode.NOT_FOUND, message="Listen together session not found"
            )
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_active_session_for_users_async(
        session: AsyncSession, user_id_1: int, user_id_2: int
    ) -> AResult[ListenTogetherSessionRow | None]:
        stmt: Select = select(ListenTogetherSessionRow).where(
            ListenTogetherSessionRow.status_key
            == ListenTogetherStatusEnum.ACTIVE.value,
            (
                (ListenTogetherSessionRow.host_user_id == user_id_1)
                & (ListenTogetherSessionRow.guest_user_id == user_id_2)
            )
            | (
                (ListenTogetherSessionRow.host_user_id == user_id_2)
                & (ListenTogetherSessionRow.guest_user_id == user_id_1)
            ),
        )
        result: Result = await session.execute(stmt)
        row: ListenTogetherSessionRow | None = result.scalars().first()
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_active_sessions_for_user_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[ListenTogetherSessionRow]]:
        stmt: Select = (
            select(ListenTogetherSessionRow)
            .where(
                ListenTogetherSessionRow.status_key
                == ListenTogetherStatusEnum.ACTIVE.value,
                (
                    ListenTogetherSessionRow.host_user_id == user_id
                )
                | (ListenTogetherSessionRow.guest_user_id == user_id),
            )
            .order_by(desc(ListenTogetherSessionRow.date_added))
        )
        result: Result = await session.execute(stmt)
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
        if current_media_id is not None:
            session_row.current_media_id = current_media_id
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
    ) -> AResult[None]:
        session_row.status_key = ListenTogetherStatusEnum.ENDED.value
        await session.flush()
        return AResult(code=AResultCode.OK, message="OK")
