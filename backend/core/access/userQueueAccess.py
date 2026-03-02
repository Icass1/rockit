from typing import List, Tuple
from logging import Logger
from sqlalchemy.future import select
from sqlalchemy import Result, Select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.user_queue import UserQueueRow
from backend.core.enums.queueTypeEnum import QueueTypeEnum
from backend.utils.logger import getLogger

logger: Logger = getLogger(__name__)


class UserQueueAccess:
    @staticmethod
    async def get_user_queue(
        session: AsyncSession, user_id: int, queue_type: QueueTypeEnum
    ) -> AResult[List[UserQueueRow]]:
        """Get all queue items for a user with a specific queue type."""
        try:
            stmt: Select[Tuple[UserQueueRow]] = (
                select(UserQueueRow)
                .where(UserQueueRow.user_id == user_id)
                .where(UserQueueRow.queue_type_key == queue_type.value)
                .order_by(UserQueueRow.queue_index)
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

            for queue_index, media_id in queue_items:
                user_queue = UserQueueRow(
                    user_id=user_id,
                    media_id=media_id,
                    queue_index=queue_index,
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
