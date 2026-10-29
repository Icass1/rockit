from sqlalchemy.ext.asyncio import AsyncSession

from core.access.friend.activityAccess import ActivityAccess
from core.access.friend.friendAccess import FriendAccess
from core.responses.friend.friendActivityResponse import FriendActivityItem
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class FriendActivity:
    @staticmethod
    async def get_friends_activity_async(
        session: AsyncSession, user_id: int, limit: int = 30
    ) -> Result[list[FriendActivityItem]]:
        a_friend_ids = await FriendAccess.get_friend_ids_async(session=session, user_id=user_id)
        if a_friend_ids.is_not_ok():
            logger.error(f"Error loading friends for activity. {a_friend_ids.info()}")
            return Result(code=a_friend_ids.code(), message=a_friend_ids.message())
        if not a_friend_ids.result():
            return Result(code=ResultCode.OK, message="OK", result=[])

        friend_ids = a_friend_ids.result()
        return await ActivityAccess.get_friends_activity_async(
            session=session, friend_ids=friend_ids, limit=limit
        )

    @staticmethod
    async def get_user_activity_async(
        session: AsyncSession, user_id: int, limit: int = 10
    ) -> Result[list[FriendActivityItem]]:
        return await ActivityAccess.get_user_activity_async(
            session=session, user_id=user_id, limit=limit
        )
