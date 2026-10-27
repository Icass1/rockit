import uuid
from collections.abc import Sequence

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from core.access.db.ormModels.friend.friend import FriendRow
from core.access.db.ormModels.friend.friendRequest import FriendRequestRow
from core.access.db.ormModels.user import UserRow
from core.aResult import AResult, AResultCode
from core.enums.friend.friendStatusEnum import FriendStatusEnum
from core.utils.safeAsyncCall import safe_async
from logger import getLogger

logger = getLogger(__name__)


class FriendAccess:
    @staticmethod
    @safe_async
    async def get_friends_async(session: AsyncSession, user_id: int) -> AResult[list[FriendRow]]:
        reverse = aliased(FriendRow)
        stmt = select(FriendRow).where(
            FriendRow.user_id == user_id,
            FriendRow.status_key == FriendStatusEnum.ACCEPTED.value,
            select(reverse.id)
            .where(
                reverse.user_id == FriendRow.friend_user_id,
                reverse.friend_user_id == user_id,
                reverse.status_key == FriendStatusEnum.ACCEPTED.value,
            )
            .exists(),
        )
        result = await session.execute(stmt)
        rows: Sequence[FriendRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_friend_ids_async(session: AsyncSession, user_id: int) -> AResult[list[int]]:
        rows: AResult[list[FriendRow]] = await FriendAccess.get_friends_async(
            session=session, user_id=user_id
        )
        if rows.is_not_ok():
            return AResult(code=rows.code(), message=rows.message())
        friend_ids: list[int] = [r.friend_user_id for r in rows.result()]
        return AResult(code=AResultCode.OK, message="OK", result=friend_ids)

    @staticmethod
    @safe_async
    async def get_friend_relationship_async(
        session: AsyncSession, user_id: int, friend_user_id: int
    ) -> AResult[FriendRow | None]:
        stmt = select(FriendRow).where(
            FriendRow.user_id == user_id,
            FriendRow.friend_user_id == friend_user_id,
        )
        result = await session.execute(stmt)
        row: FriendRow | None = result.scalars().first()
        if row is None:
            return AResult(code=AResultCode.NOT_FOUND, message="Not found")
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
    async def delete_friend_async(session: AsyncSession, friend_row: FriendRow) -> AResultCode:
        await session.delete(friend_row)
        await session.flush()
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def search_users_async(
        session: AsyncSession, query: str, current_user_id: int, limit: int = 20
    ) -> AResult[list[UserRow]]:
        stmt = (
            select(UserRow)
            .where(
                UserRow.username.ilike(f"%{query}%"),
                UserRow.id != current_user_id,
                ~select(FriendRow.id)
                .where(
                    FriendRow.status_key == FriendStatusEnum.BLOCKED.value,
                    or_(
                        and_(
                            FriendRow.user_id == current_user_id,
                            FriendRow.friend_user_id == UserRow.id,
                        ),
                        and_(
                            FriendRow.friend_user_id == current_user_id,
                            FriendRow.user_id == UserRow.id,
                        ),
                    ),
                )
                .exists(),
            )
            .limit(limit)
        )
        result = await session.execute(stmt)
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
    ) -> AResult[list[FriendRequestRow]]:
        stmt = select(FriendRequestRow).where(
            FriendRequestRow.to_user_id == user_id,
            FriendRequestRow.status_key == FriendStatusEnum.PENDING.value,
        )
        result = await session.execute(stmt)
        rows: Sequence[FriendRequestRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_sent_requests_async(
        session: AsyncSession, user_id: int
    ) -> AResult[list[FriendRequestRow]]:
        stmt = select(FriendRequestRow).where(
            FriendRequestRow.from_user_id == user_id,
            FriendRequestRow.status_key == FriendStatusEnum.PENDING.value,
        )
        result = await session.execute(stmt)
        rows: Sequence[FriendRequestRow] = result.scalars().all()
        return AResult(code=AResultCode.OK, message="OK", result=list(rows))

    @staticmethod
    @safe_async
    async def get_friend_request_by_public_id_async(
        session: AsyncSession, public_id: str
    ) -> AResult[FriendRequestRow]:
        stmt = (
            select(FriendRequestRow)
            .where(FriendRequestRow.public_id == public_id)
            .execution_options(populate_existing=True)
        )
        result = await session.execute(stmt)
        row: FriendRequestRow | None = result.scalars().first()
        if row is None:
            logger.error("Friend request not found")
            return AResult(code=AResultCode.NOT_FOUND, message="Friend request not found")
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
        stmt = select(UserRow).where(UserRow.public_id == public_id)
        result = await session.execute(stmt)
        row: UserRow | None = result.scalars().first()
        if row is None:
            logger.error("User not found")
            return AResult(code=AResultCode.NOT_FOUND, message="User not found")
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def lock_users_async(session: AsyncSession, user_ids: list[int]) -> AResultCode:
        # Lock in a stable order: serialize request/accept/block without deadlocks.
        await session.execute(
            select(UserRow.id)
            .where(UserRow.id.in_(user_ids))
            .order_by(UserRow.id)
            .with_for_update()
        )
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def get_pending_between_async(
        session: AsyncSession, first: int, second: int
    ) -> AResult[FriendRequestRow | None]:
        result = await session.execute(
            select(FriendRequestRow).where(
                FriendRequestRow.from_user_id.in_([first, second]),
                FriendRequestRow.to_user_id.in_([first, second]),
                FriendRequestRow.status_key == FriendStatusEnum.PENDING.value,
            )
        )
        row = result.scalars().first()
        if row is None:
            return AResult(code=AResultCode.NOT_FOUND, message="Not found")
        return AResult(code=AResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def disconnect_async(
        session: AsyncSession, first: int, second: int, block: bool = False
    ) -> AResultCode:
        from sqlalchemy import delete, update

        from core.access.db.ormModels.friend.listenTogether import (
            ListenTogetherSessionRow,
        )
        from core.enums.friend.listenTogetherStatusEnum import (
            ListenTogetherStatusEnum,
        )

        await session.execute(
            delete(FriendRow).where(
                FriendRow.user_id.in_([first, second]),
                FriendRow.friend_user_id.in_([first, second]),
                FriendRow.status_key != FriendStatusEnum.BLOCKED.value,
            )
        )
        await session.execute(
            update(FriendRequestRow)
            .where(
                FriendRequestRow.from_user_id.in_([first, second]),
                FriendRequestRow.to_user_id.in_([first, second]),
                FriendRequestRow.status_key == FriendStatusEnum.PENDING.value,
            )
            .values(status_key=FriendStatusEnum.REJECTED.value)
        )
        await session.execute(
            update(ListenTogetherSessionRow)
            .where(
                ListenTogetherSessionRow.host_user_id.in_([first, second]),
                ListenTogetherSessionRow.guest_user_id.in_([first, second]),
            )
            .values(status_key=ListenTogetherStatusEnum.ENDED.value)
        )
        if block:
            existing = await session.execute(
                select(FriendRow).where(
                    FriendRow.user_id == first, FriendRow.friend_user_id == second
                )
            )
            if existing.scalars().first() is None:
                session.add(
                    FriendRow(
                        user_id=first,
                        friend_user_id=second,
                        status_key=FriendStatusEnum.BLOCKED.value,
                    )
                )
        await session.flush()
        return AResultCode(code=AResultCode.OK, message="OK")

    @staticmethod
    @safe_async
    async def get_users_async(session: AsyncSession, user_ids: list[int]) -> AResult[list[UserRow]]:
        result = await session.execute(select(UserRow).where(UserRow.id.in_(user_ids)))
        return AResult(code=AResultCode.OK, message="OK", result=list(result.scalars()))

    @staticmethod
    @safe_async
    async def get_blocked_async(session: AsyncSession, user_id: int) -> AResult[list[FriendRow]]:
        rows = await session.execute(
            select(FriendRow).where(
                FriendRow.user_id == user_id,
                FriendRow.status_key == FriendStatusEnum.BLOCKED.value,
            )
        )
        return AResult(code=AResultCode.OK, message="OK", result=list(rows.scalars()))

    @staticmethod
    @safe_async
    async def are_friends_async(session: AsyncSession, first: int, second: int) -> AResult[bool]:
        rows = list(
            await session.execute(
                select(FriendRow.user_id, FriendRow.status_key).where(
                    or_(
                        and_(
                            FriendRow.user_id == first,
                            FriendRow.friend_user_id == second,
                        ),
                        and_(
                            FriendRow.user_id == second,
                            FriendRow.friend_user_id == first,
                        ),
                    )
                )
            )
        )
        accepted = {owner for owner, status in rows if status == FriendStatusEnum.ACCEPTED.value}
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=accepted == {first, second}
            and all(status == FriendStatusEnum.ACCEPTED.value for _, status in rows),
        )
