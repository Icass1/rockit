from datetime import datetime
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.aResult import AResult, AResultCode
from backend.core.access.db.ormModels.friend.listeningBadge import ListeningBadgeRow
from backend.core.utils.safeAsyncCall import safe_async


class ListeningBadgesAccess:
    @staticmethod
    @safe_async
    async def award_async(
        session: AsyncSession, user_id: int, badge_keys: list[str]
    ) -> AResult[bool]:
        """Unlock each collectible at most once per user, without awarding extra XP."""
        if not badge_keys:
            return AResult(code=AResultCode.OK, message="OK", result=False)
        result = await session.execute(
            insert(ListeningBadgeRow)
            .values([{"user_id": user_id, "badge_key": key} for key in badge_keys])
            .on_conflict_do_nothing(
                index_elements=[ListeningBadgeRow.user_id, ListeningBadgeRow.badge_key]
            )
            .returning(ListeningBadgeRow.badge_key)
        )
        return AResult(
            code=AResultCode.OK, message="OK", result=bool(result.scalars().all())
        )

    @staticmethod
    @safe_async
    async def get_for_users_async(
        session: AsyncSession, user_ids: list[int]
    ) -> AResult[dict[int, dict[str, datetime]]]:
        """Load the whole comparison's earned collection in one batch."""
        if not user_ids:
            return AResult(code=AResultCode.OK, message="OK", result={})
        rows = (
            await session.scalars(
                select(ListeningBadgeRow).where(ListeningBadgeRow.user_id.in_(user_ids))
            )
        ).all()
        result: dict[int, dict[str, datetime]] = {}
        for row in rows:
            result.setdefault(row.user_id, {})[row.badge_key] = row.date_added
        return AResult(code=AResultCode.OK, message="OK", result=result)
