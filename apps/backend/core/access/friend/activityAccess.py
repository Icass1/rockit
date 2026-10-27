from sqlalchemy import bindparam, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.access.statsAccess import get_media_info_cte
from core.responses.friend.friendActivityResponse import FriendActivityItem
from core.utils.safeAsyncCall import safe_async
from result import Result, ResultCode


class ActivityAccess:
    @staticmethod
    @safe_async
    async def get_friends_activity_async(
        session: AsyncSession, friend_ids: list[int], limit: int = 30
    ) -> Result[list[FriendActivityItem]]:
        if not friend_ids:
            return Result(code=ResultCode.OK, message="OK", result=[])
        sql = text(f"""
            WITH {get_media_info_cte()}
            SELECT u.public_id AS "userPublicId", u.username,
                   i.url AS "userImageUrl", mi.public_id AS "mediaPublicId",
                   mi.media_name AS "mediaName", mi.image_url AS "mediaImageUrl",
                   uml.date_added::text AS "listenedAt"
            FROM core.user_media_listened uml
            JOIN core."user" u ON u.id = uml.user_id
            LEFT JOIN core.image i ON i.id = u.image_id
            JOIN media_info mi ON mi.media_id = uml.media_id
            WHERE uml.user_id IN :friend_ids
            ORDER BY uml.date_added DESC, uml.id DESC LIMIT :limit
        """).bindparams(bindparam("friend_ids", expanding=True))
        rows = await session.execute(sql, {"friend_ids": friend_ids, "limit": limit})
        return Result(
            code=ResultCode.OK,
            message="OK",
            result=[FriendActivityItem.model_validate(dict(row)) for row in rows.mappings()],
        )

    @staticmethod
    async def get_user_activity_async(
        session: AsyncSession, user_id: int, limit: int = 10
    ) -> Result[list[FriendActivityItem]]:
        return await ActivityAccess.get_friends_activity_async(session, [user_id], limit)
