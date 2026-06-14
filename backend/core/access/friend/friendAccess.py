import uuid
from typing import List, Sequence

from sqlalchemy import Result, Select, select, or_, and_, String
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.utils.safeAsyncCall import safe_async
from backend.core.access.db.ormModels.user import UserRow
from backend.core.access.db.ormModels.friend.friend import FriendRow
from backend.core.access.db.ormModels.friend.friendRequest import FriendRequestRow
from backend.core.enums.friend.friendStatusEnum import FriendStatusEnum

logger = getLogger(__name__)


class FriendAccess:
    @staticmethod
    @safe_async
    async def get_friends_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[FriendRow]]:
        stmt: Select = select(FriendRow).where(
            FriendRow.user_id == user_id,
            FriendRow.status_key == FriendStatusEnum.ACCEPTED.value,
        )
        result: Result = await session.execute(stmt)
        rows: Sequence[FriendRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_friend_ids_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[int]]:
        rows: AResult[List[FriendRow]] = await FriendAccess.get_friends_async(
            session=session, user_id=user_id
        )
        if rows.is_not_ok():
            return AResult(code=rows.code(), message=rows.message())
        friend_ids: List[int] = [r.friend_user_id for r in rows.result()]
        return AResult(code=AResultCode.OK, message="OK", result=friend_ids)

    @staticmethod
    @safe_async
    async def get_friend_relationship_async(
        session: AsyncSession, user_id: int, friend_user_id: int
    ) -> AResult[FriendRow | None]:
        stmt: Select = select(FriendRow).where(
            or_(
                and_(
                    FriendRow.user_id == user_id,
                    FriendRow.friend_user_id == friend_user_id,
                ),
                and_(
                    FriendRow.user_id == friend_user_id,
                    FriendRow.friend_user_id == user_id,
                ),
            )
        )
        result: Result = await session.execute(stmt)
        row: FriendRow | None = result.scalars().first()
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def add_friend_async(
        session: AsyncSession,
        user_id: int,
        friend_user_id: int,
        status: FriendStatusEnum = FriendStatusEnum.ACCEPTED,
    ) -> AResult[FriendRow]:
        row = FriendRow(
            user_id=user_id,
            friend_user_id=friend_user_id,
            status_key=status.value,
        )
        session.add(row)
        await session.flush()
        await session.refresh(row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def update_friend_status_async(
        session: AsyncSession, friend_row: FriendRow, status: FriendStatusEnum
    ) -> AResult[FriendRow]:
        friend_row.status_key = status.value
        await session.flush()
        await session.refresh(friend_row)
        return AResult(code=AResultCode.OK, message="OK", result=friend_row)

    @staticmethod
    @safe_async
    async def delete_friend_async(
        session: AsyncSession, friend_row: FriendRow
    ) -> AResult[None]:
        await session.delete(friend_row)
        await session.flush()
        return AResult(code=AResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def search_users_async(
        session: AsyncSession, query: str, current_user_id: int, limit: int = 20
    ) -> AResult[List[UserRow]]:
        stmt: Select = (
            select(UserRow)
            .where(
                UserRow.username.ilike(f"%{query}%"),
                UserRow.id != current_user_id,
            )
            .limit(limit)
        )
        result: Result = await session.execute(stmt)
        rows: Sequence[UserRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def create_friend_request_async(
        session: AsyncSession, from_user_id: int, to_user_id: int, message: str | None
    ) -> AResult[FriendRequestRow]:
        row = FriendRequestRow(
            public_id=str(uuid.uuid4()),
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            message=message,
        )
        session.add(row)
        await session.flush()
        await session.refresh(row)
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def get_pending_requests_for_user_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[FriendRequestRow]]:
        stmt: Select = select(FriendRequestRow).where(
            FriendRequestRow.to_user_id == user_id,
            FriendRequestRow.status_key == FriendStatusEnum.PENDING.value,
        )
        result: Result = await session.execute(stmt)
        rows: Sequence[FriendRequestRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_sent_requests_async(
        session: AsyncSession, user_id: int
    ) -> AResult[List[FriendRequestRow]]:
        stmt: Select = select(FriendRequestRow).where(
            FriendRequestRow.from_user_id == user_id,
            FriendRequestRow.status_key == FriendStatusEnum.PENDING.value,
        )
        result: Result = await session.execute(stmt)
        rows: Sequence[FriendRequestRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_friend_request_by_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[FriendRequestRow]:
        stmt: Select = select(FriendRequestRow).where(
            FriendRequestRow.public_id == public_id
        )
        result: Result = await session.execute(stmt)
        row: FriendRequestRow | None = result.scalars().first()
        if row is None:
            logger.error("Friend request not found")
            return AResult(
                code=AResultCode.NOT_FOUND, message="Friend request not found"
            )
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def update_friend_request_status_async(
        session: AsyncSession, request_row: FriendRequestRow, status_key: int
    ) -> AResult[FriendRequestRow]:
        request_row.status_key = status_key
        await session.flush()
        await session.refresh(request_row)
        return AResult(code=AResultCode.OK, message="OK", result=request_row)

    @staticmethod
    @safe_async
    async def get_user_by_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[UserRow]:
        stmt: Select = select(UserRow).where(UserRow.public_id == public_id)
        result: Result = await session.execute(stmt)
        row: UserRow | None = result.scalars().first()
        if row is None:
            logger.error("User not found")
            return AResult(code=AResultCode.NOT_FOUND, message="User not found")
        return AResult(code=AResultCode.OK, message="OK", result=row)
