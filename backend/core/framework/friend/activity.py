from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.friend.friendAccess import FriendAccess

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
        placeholders = ",".join([str(fid) for fid in friend_ids])

        sql = text(f"""
        SELECT
            u.public_id AS user_public_id,
            u.username,
            i.url AS user_image_url,
            m.public_id AS media_public_id,
            m.name AS media_name,
            mi.url AS media_image_url,
            uml.date_added AS listened_at
        FROM core.user_media_listened uml
        JOIN core."user" u ON u.id = uml.user_id
        LEFT JOIN core.image i ON i.id = u.image_id
        JOIN core.media m ON m.id = uml.media_id
        LEFT JOIN core.image mi ON mi.id = m.image_id
        WHERE uml.user_id IN ({placeholders})
        ORDER BY uml.date_added DESC
        LIMIT :limit
        """)

        rows = (await session.execute(sql, {"limit": limit})).fetchall()

        activities = []
        for row in rows:
            activities.append(
                {
                    "userPublicId": row.user_public_id,
                    "username": row.username,
                    "userImageUrl": row.user_image_url,
                    "mediaPublicId": row.media_public_id,
                    "mediaName": row.media_name,
                    "mediaImageUrl": row.media_image_url,
                    "listenedAt": row.listened_at.isoformat() if hasattr(row.listened_at, "isoformat") else str(row.listened_at),
                }
            )
        return AResult(code=AResultCode.OK, message="OK", result=activities)

    @staticmethod
    async def get_user_activity_async(
        session: AsyncSession, user_id: int, limit: int = 10
    ) -> AResult[List[Dict[str, Any]]]:
        sql = text("""
        SELECT
            u.public_id AS user_public_id,
            u.username,
            i.url AS user_image_url,
            m.public_id AS media_public_id,
            m.name AS media_name,
            mi.url AS media_image_url,
            uml.date_added AS listened_at
        FROM core.user_media_listened uml
        JOIN core."user" u ON u.id = uml.user_id
        LEFT JOIN core.image i ON i.id = u.image_id
        JOIN core.media m ON m.id = uml.media_id
        LEFT JOIN core.image mi ON mi.id = m.image_id
        WHERE uml.user_id = :user_id
        ORDER BY uml.date_added DESC
        LIMIT :limit
        """)
        rows = (await session.execute(sql, {"user_id": user_id, "limit": limit})).fetchall()

        activities = []
        for row in rows:
            activities.append(
                {
                    "userPublicId": row.user_public_id,
                    "username": row.username,
                    "userImageUrl": row.user_image_url,
                    "mediaPublicId": row.media_public_id,
                    "mediaName": row.media_name,
                    "mediaImageUrl": row.media_image_url,
                    "listenedAt": row.listened_at.isoformat() if hasattr(row.listened_at, "isoformat") else str(row.listened_at),
                }
            )
        return AResult(code=AResultCode.OK, message="OK", result=activities)
