import uuid
from typing import List, Sequence

from sqlalchemy import Result, Select, select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.utils.safeAsyncCall import safe_async
from backend.core.access.db.ormModels.friend.sharedMedia import SharedMediaRow
from backend.core.access.db.ormModels.media import CoreMediaRow

logger = getLogger(__name__)


class ShareAccess:
    @staticmethod
    @safe_async
    async def create_share_async(
        session: AsyncSession,
        sender_user_id: int,
        recipient_user_id: int,
        media_id: int,
        message: str | None,
    ) -> AResult[SharedMediaRow]:
        row = SharedMediaRow(
            public_id=str(uuid.uuid4()),
            sender_user_id=sender_user_id,
            recipient_user_id=recipient_user_id,
            media_id=media_id,
            message=message,
        )
        session.add(row)
        await session.flush()
        await session.refresh(row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_inbox_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[SharedMediaRow]]:
        stmt: Select = (
            select(SharedMediaRow)
            .where(SharedMediaRow.recipient_user_id == user_id)
            .order_by(desc(SharedMediaRow.date_added))
        )
        result: Result = await session.execute(stmt)
        rows: Sequence[SharedMediaRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_sent_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[SharedMediaRow]]:
        stmt: Select = (
            select(SharedMediaRow)
            .where(SharedMediaRow.sender_user_id == user_id)
            .order_by(desc(SharedMediaRow.date_added))
        )
        result: Result = await session.execute(stmt)
        rows: Sequence[SharedMediaRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_share_by_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[SharedMediaRow]:
        stmt: Select = select(SharedMediaRow).where(
            SharedMediaRow.public_id == public_id
        )
        result: Result = await session.execute(stmt)
        row: SharedMediaRow | None = result.scalars().first()
        if row is None:
            return AResult(code=AResultCode.NOT_FOUND, message="Shared media not found")
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def mark_as_seen_async(
        session: AsyncSession, share_row: SharedMediaRow
    ) -> AResult[SharedMediaRow]:
        share_row.seen = True
        await session.flush()
        await session.refresh(share_row)
        return AResult(code=AResultCode.OK, message="OK", result=share_row)

    @staticmethod
    @safe_async
    async def delete_share_async(
        session: AsyncSession, share_row: SharedMediaRow
    ) -> AResult[None]:
        await session.delete(share_row)
        await session.flush()
        return AResult(code=AResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def get_media_by_public_id_async(
        session: AsyncSession, media_public_id: str
    ) -> AResult[CoreMediaRow]:
        stmt: Select = select(CoreMediaRow).where(
            CoreMediaRow.public_id == media_public_id
        )
        result: Result = await session.execute(stmt)
        row: CoreMediaRow | None = result.scalars().first()
        if row is None:
            return AResult(code=AResultCode.NOT_FOUND, message="Media not found")
        return AResult(code=AResultCode.OK, message="OK", result=row)
