from typing import Tuple

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.utils.safeAsyncCall import safe_async

logger = getLogger(__name__)


class VibeAccess:
    @staticmethod
    @safe_async
    async def get_shared_artist_stats_async(
        session: AsyncSession, user_id: int, friend_user_id: int
    ) -> AResult[Tuple[int, int, int]]:
        sql_shared = text("""
        WITH my_artists AS (
            SELECT DISTINCT m.name AS artist_name
            FROM core.user_media_listened uml
            JOIN core.media m ON m.id = uml.media_id
            WHERE uml.user_id = :user_id
        ),
        friend_artists AS (
            SELECT DISTINCT m.name AS artist_name
            FROM core.user_media_listened uml
            JOIN core.media m ON m.id = uml.media_id
            WHERE uml.user_id = :friend_user_id
        )
        SELECT
            (SELECT COUNT(*) FROM my_artists) AS my_count,
            (SELECT COUNT(*) FROM friend_artists) AS friend_count,
            (SELECT COUNT(*) FROM my_artists
             WHERE artist_name IN (SELECT artist_name FROM friend_artists)) AS shared_count
        """)
        row = (
            await session.execute(
                sql_shared,
                {"user_id": user_id, "friend_user_id": friend_user_id},
            )
        ).fetchone()
        my_count = row.my_count or 0
        friend_count = row.friend_count or 0
        shared_count = row.shared_count or 0
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=(my_count, friend_count, shared_count),
        )
