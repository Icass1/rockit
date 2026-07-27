from datetime import datetime, timedelta, timezone
from typing import List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.user_home_impressions import (
    UserHomeImpressionsRow,
)
from backend.utils.logger import getLogger

logger = getLogger(__name__)


class HomeImpressionsAccess:
    @staticmethod
    async def get_impressed_media_ids_async(
        session: AsyncSession,
        user_id: int,
        section: str,
        cooldown_hours: int,
    ) -> AResult[List[int]]:
        """Get media_ids that are still in cooldown for a given section."""

        cutoff: datetime = datetime.now(timezone.utc) - timedelta(hours=cooldown_hours)

        sql = text("""
            SELECT media_id
            FROM   core.user_home_impressions
            WHERE  user_id    = :user_id
              AND  section    = :section
              AND  shown_at  >= :cutoff
            """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "section": section,
                    "cutoff": cutoff,
                },
            )
        ).fetchall()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[int(r.media_id) for r in rows],
        )

    @staticmethod
    async def record_impressions_async(
        session: AsyncSession,
        user_id: int,
        section: str,
        media_ids: List[int],
    ) -> None:
        """Insert new impressions. Fire-and-forget, does not block."""

        if not media_ids:
            return

        try:
            for media_id in media_ids:
                impression = UserHomeImpressionsRow(
                    user_id=user_id,
                    media_id=media_id,
                    section=section,
                )
                session.add(instance=impression)
            await session.flush()
        except Exception as e:
            logger.error(f"Error recording impressions: {e}")

    @staticmethod
    async def cleanup_old_impressions_async(
        session: AsyncSession,
    ) -> AResult[int]:
        """Delete impressions older than 7 days."""

        cutoff: datetime = datetime.now(timezone.utc) - timedelta(days=7)

        sql = text("""
            DELETE FROM core.user_home_impressions
            WHERE  shown_at < :cutoff
            """)
        await session.execute(sql, {"cutoff": cutoff})

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=0,
        )
