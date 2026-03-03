from typing import List, Tuple
from logging import Logger
from sqlalchemy.future import select
from sqlalchemy import Result, Select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.user_queue import UserQueueRow
from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)


class UserQueueAccess:
    @staticmethod
    async def get_all_user_queues(
        session: AsyncSession, user_id: int
    ) -> AResult[List[UserQueueRow]]:
        """Get all queue items for a user regardless of queue type."""
        try:
            stmt: Select[Tuple[UserQueueRow]] = (
                select(UserQueueRow)
                .options(selectinload(UserQueueRow.media))
                .where(UserQueueRow.user_id == user_id)
                .order_by(UserQueueRow.id)
            )
            result: Result[Tuple[UserQueueRow]] = await session.execute(statement=stmt)
            queue_items: List[UserQueueRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=queue_items)

        except Exception as e:
            logger.error(f"Error in get_all_user_queues: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get user queues: {e}",
            )

    @staticmethod
    async def get_user_queue(
        session: AsyncSession, user_id: int, queue_type: QueueTypeEnum
    ) -> AResult[List[UserQueueRow]]:
        """Get all queue items for a user with a specific queue type."""
        try:
            stmt: Select[Tuple[UserQueueRow]] = (
                select(UserQueueRow)
                .options(selectinload(UserQueueRow.media))
                .where(UserQueueRow.user_id == user_id)
                .where(UserQueueRow.queue_type_key == queue_type.value)
                .order_by(UserQueueRow.id)
            )
            result: Result[Tuple[UserQueueRow]] = await session.execute(statement=stmt)
            queue_items: List[UserQueueRow] = list(result.scalars().all())

            return AResult(code=AResultCode.OK, message="OK", result=queue_items)

        except Exception as e:
            logger.error(f"Error in get_user_queue: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get user queue: {e}",
            )

    @staticmethod
    async def save_user_queue(
        session: AsyncSession,
        user_id: int,
        queue_items: List[Tuple[int, int]],
        queue_type: QueueTypeEnum,
    ) -> AResult[bool]:
        """Save the user's queue. Replaces existing queue for the given type."""
        try:
            delete_stmt = delete(UserQueueRow).where(
                UserQueueRow.user_id == user_id,
                UserQueueRow.queue_type_key == queue_type.value,
            )
            await session.execute(delete_stmt)

            for queue_media_id, media_id in queue_items:
                user_queue = UserQueueRow(
                    user_id=user_id,
                    media_id=media_id,
                    queue_media_id=queue_media_id,
                    queue_type_key=queue_type.value,
                )
                session.add(instance=user_queue)

            await session.commit()

            return AResult(code=AResultCode.OK, message="OK", result=True)

        except Exception as e:
            logger.error(f"Error in save_user_queue: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to save user queue: {e}",
            )

    @staticmethod
    async def clear_user_queue(
        session: AsyncSession, user_id: int, queue_type: QueueTypeEnum
    ) -> AResult[bool]:
        """Clear all queue items for a user with a specific queue type."""
        try:
            delete_stmt = delete(UserQueueRow).where(
                UserQueueRow.user_id == user_id,
                UserQueueRow.queue_type_key == queue_type.value,
            )
            await session.execute(delete_stmt)
            await session.commit()

            return AResult(code=AResultCode.OK, message="OK", result=True)

        except Exception as e:
            logger.error(f"Error in clear_user_queue: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to clear user queue: {e}",
            )

    @staticmethod
    async def get_queue_item_by_queue_media_id(
        session: AsyncSession, user_id: int, queue_media_id: int
    ) -> AResult[UserQueueRow]:
        """Get a queue item by its queue_media_id for a user."""
        try:
            stmt: Select[Tuple[UserQueueRow]] = (
                select(UserQueueRow)
                .options(selectinload(UserQueueRow.media))
                .where(UserQueueRow.user_id == user_id)
                .where(UserQueueRow.queue_media_id == queue_media_id)
            )
            result: Result[Tuple[UserQueueRow]] = await session.execute(statement=stmt)
            queue_item: UserQueueRow | None = result.scalar_one_or_none()

            if queue_item is None:
                return AResult(
                    code=AResultCode.NOT_FOUND,
                    message="Queue item not found",
                )

            return AResult(code=AResultCode.OK, message="OK", result=queue_item)

        except Exception as e:
            logger.error(
                f"Error in get_queue_item_by_queue_media_id: {e}", exc_info=True
            )
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Failed to get queue item: {e}",
            )
