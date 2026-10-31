from logging import Logger

from sqlalchemy import Result as DBResult
from sqlalchemy import Select, delete, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from core.access.db.ormModels.user import UserRow
from core.access.db.ormModels.user_queue import UserQueueRow
from core.enums.queueTypeEnum import QueueTypeEnum
from core.framework.models.queue import QueueItem
from core.utils.safeAsyncCall import safe_async
from logger import getLogger
from result import Result, ResultCode

logger: Logger = getLogger(__name__)


class UserQueueAccess:
    @staticmethod
    async def get_user_queue_page_async(
        session: AsyncSession,
        user_id: int,
        queue_type: QueueTypeEnum,
        current_queue_id: int | None,
        offset: int | None,
        limit: int,
    ) -> Result[tuple[list[UserQueueRow], int, int]]:
        """Load one ordered page of queue items and the current queue size."""
        try:
            order_column = (
                UserQueueRow.random_index
                if queue_type == QueueTypeEnum.RANDOM
                else UserQueueRow.sorted_index
            )
            count_stmt = select(func.count()).where(UserQueueRow.user_id == user_id)
            total = int(await session.scalar(count_stmt) or 0)

            page_offset = offset
            if page_offset is None:
                page_offset = 0
                if current_queue_id is not None:
                    current_position_stmt = select(order_column).where(
                        UserQueueRow.user_id == user_id,
                        UserQueueRow.queue_id == current_queue_id,
                    )
                    current_position = await session.scalar(current_position_stmt)
                    if current_position is not None:
                        page_offset = max(0, int(current_position) - limit // 4)

            stmt: Select[tuple[UserQueueRow]] = (
                select(UserQueueRow)
                .options(selectinload(UserQueueRow.media))
                .where(UserQueueRow.user_id == user_id)
                .order_by(order_column)
                .offset(page_offset)
                .limit(limit)
            )
            result: DBResult[tuple[UserQueueRow]] = await session.execute(statement=stmt)
            queue_items: list[UserQueueRow] = list(result.scalars().all())

            return Result(
                code=ResultCode.OK,
                message="OK",
                result=(queue_items, total, page_offset),
            )

        except Exception as e:
            logger.error(f"Error in get_user_queue_page_async: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get user queue page: {e}",
            )

    @staticmethod
    @safe_async
    async def save_user_queue_async(
        session: AsyncSession,
        user_id: int,
        queue_items: list[QueueItem],
        reset_current_queue_id: bool = False,
        expected_current_queue_id: int | None = None,
    ) -> Result[bool]:
        """Save the user's queue. Replaces existing queue for the given type.

        If ``reset_current_queue_id`` is set, the stored current queue id is
        cleared when it still equals ``expected_current_queue_id``. The
        conditional WHERE keeps the reset atomic with the replace and avoids
        clobbering a concurrent ``current_media`` update.
        """
        delete_stmt = delete(UserQueueRow).where(UserQueueRow.user_id == user_id)
        await session.execute(delete_stmt)

        for item in queue_items:
            user_queue = UserQueueRow(
                user_id=user_id,
                media_id=item.media_id,
                list_media_id=item.list_id,
                queue_id=item.queue_id,
                sorted_index=item.sorted_index,
                random_index=item.random_index,
            )
            session.add(instance=user_queue)

        if reset_current_queue_id:
            reset_stmt = (
                update(UserRow)
                .where(UserRow.id == user_id)
                .where(UserRow.current_queue_id == expected_current_queue_id)
                .values(current_queue_id=None)
            )
            await session.execute(reset_stmt)

        await session.commit()

        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    async def clear_user_queue(session: AsyncSession, user_id: int) -> Result[bool]:
        """Clear all queue items for a user."""
        try:
            delete_stmt = delete(UserQueueRow).where(
                UserQueueRow.user_id == user_id,
            )
            await session.execute(delete_stmt)
            await session.commit()

            return Result(code=ResultCode.OK, message="OK", result=True)

        except Exception as e:
            logger.error(f"Error in clear_user_queue: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to clear user queue: {e}",
            )

    @staticmethod
    async def get_queue_item_by_queue_id(
        session: AsyncSession,
        user_id: int,
        queue_id: int,
    ) -> Result[UserQueueRow]:
        """Get a queue item by its queue_id for a user."""
        try:
            stmt: Select[tuple[UserQueueRow]] = (
                select(UserQueueRow)
                .options(selectinload(UserQueueRow.media))
                .where(UserQueueRow.user_id == user_id)
                .where(UserQueueRow.queue_id == queue_id)
            )
            result: DBResult[tuple[UserQueueRow]] = await session.execute(statement=stmt)
            queue_item: UserQueueRow | None = result.scalar_one_or_none()

            if queue_item is None:
                return Result(
                    code=ResultCode.NOT_FOUND,
                    message="Queue item not found",
                )

            return Result(code=ResultCode.OK, message="OK", result=queue_item)

        except Exception as e:
            logger.error(f"Error in get_queue_item_by_queue_id: {e}", exc_info=True)
            return Result(
                code=ResultCode.GENERAL_ERROR,
                message=f"Failed to get queue item: {e}",
            )
