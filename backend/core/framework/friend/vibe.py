from typing import Any, Dict, List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.friend.friendAccess import FriendAccess

logger = getLogger(__name__)


class Vibe:
    @staticmethod
    async def get_vibe_score_async(
        session: AsyncSession, user_id: int, friend_user_id: int
    ) -> AResult[Dict[str, Any]]:
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
        total = my_count + friend_count
        score = int((shared_count * 2 / total) * 100) if total > 0 else 0
        score = min(score, 100)

        if score >= 80:
            descriptor = "Musical soulmates"
        elif score >= 60:
            descriptor = "Great taste twins"
        elif score >= 40:
            descriptor = "Kindred music spirits"
        elif score >= 20:
            descriptor = "Occasional overlap"
        else:
            descriptor = "Different wavelengths"

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={
                "score": score,
                "descriptor": descriptor,
                "sharedArtistsCount": shared_count,
            },
        )
