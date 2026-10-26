from datetime import datetime
from sqlalchemy import func, select, bindparam, column, Integer, String, true
from sqlalchemy.dialects.postgresql import insert, JSONB
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
    async def award_many_async(
        session: AsyncSession, awards: list[tuple[int, str]]
    ) -> AResult[dict[int, dict[str, datetime]]]:
        """Backfill qualifying collections in one statement with bounded bind count."""
        if not awards:
            return AResult(code=AResultCode.OK, message="OK", result={})
        payload = [{"user_id": user_id, "badge_key": key} for user_id, key in awards]
        source = (
            func.jsonb_to_recordset(bindparam("badge_awards", payload, type_=JSONB))
            .table_valued(column("user_id", Integer), column("badge_key", String))
            .render_derived(name="award_rows", with_types=True)
        )
        result = await session.execute(
            insert(ListeningBadgeRow)
            .from_select(
                ["user_id", "badge_key"],
                select(source.c.user_id, source.c.badge_key).where(true()),
            )
            .on_conflict_do_nothing(
                index_elements=[ListeningBadgeRow.user_id, ListeningBadgeRow.badge_key]
            )
            .returning(
                ListeningBadgeRow.user_id,
                ListeningBadgeRow.badge_key,
                ListeningBadgeRow.date_added,
            )
        )
        earned: dict[int, dict[str, datetime]] = {}
        for row in result:
            earned.setdefault(row.user_id, {})[row.badge_key] = row.date_added
        return AResult(code=AResultCode.OK, message="OK", result=earned)

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
