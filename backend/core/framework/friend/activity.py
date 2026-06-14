from typing import Any, Dict, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.friend.friendAccess import FriendAccess
from backend.core.access.friend.activityAccess import ActivityAccess

logger = getLogger(__name__)


class FriendActivity:
    @staticmethod
    async def get_friends_activity_async(
        session: AsyncSession, user_id: int, limit: int = 30
    ) -> AResult[List[Dict[str, Any]]]:
        a_friend_ids = await FriendAccess.get_friend_ids_async(
            session=session, user_id=user_id
        )
        if a_friend_ids.is_not_ok() or not a_friend_ids.result():
            return AResult(code=AResultCode.OK, message="OK", result=[])

        friend_ids = a_friend_ids.result()
        return await ActivityAccess.get_friends_activity_async(
            session=session, friend_ids=friend_ids, limit=limit
        )

    @staticmethod
    async def get_user_activity_async(
        session: AsyncSession, user_id: int, limit: int = 10
    ) -> AResult[List[Dict[str, Any]]]:
        return await ActivityAccess.get_user_activity_async(
            session=session, user_id=user_id, limit=limit
        )
