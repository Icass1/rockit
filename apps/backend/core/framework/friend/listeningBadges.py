from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from result import Result, ResultCode
from core.access.friend.listeningBadgesAccess import ListeningBadgesAccess
from core.framework.friend.listeningBadgeCatalog import LISTENING_BADGES
from core.framework.friend.notifications import notify_after_commit
from core.framework.models.listeningRewards import (
    ListeningBadgeDefinition,
    ListeningRewardSummary,
)
from logger import getLogger

logger = getLogger(__name__)


def badge_current(
    badge: ListeningBadgeDefinition, summary: ListeningRewardSummary, streak: int
) -> int:
    """Use recorded core data; never derive achievements from XP or provider names."""
    return {
        "session": summary.session_ms // 60000,
        "total": summary.total_ms // 60000,
        "plays": summary.recorded_listens,
        "discovery": summary.unique_recordings,
        "streak": streak,
        "sharing": summary.recommendations,
        "friends": summary.friends,
        "videos": summary.videos,
        "mixed": min(summary.unique_recordings, summary.recommendations),
    }[badge.scope]


class ListeningBadges:
    @staticmethod
    async def refresh_user_async(session: AsyncSession, user_id: int) -> Result[bool]:
        """Evaluate recorded-listen, discovery, streak and sharing milestones on writes."""
        from core.access.friend.listeningRewardsAccess import (
            ListeningRewardsAccess,
        )
        from core.access.statsAccess import get_streaks_for_users_async
        from core.framework.friend.listeningPolicy import SESSION_BREAK_SECONDS

        summaries = await ListeningRewardsAccess.get_summaries_async(
            session=session,
            user_ids=[user_id],
            active_after=datetime.now(timezone.utc)
            - timedelta(seconds=SESSION_BREAK_SECONDS),
        )
        streaks = await get_streaks_for_users_async(session, [user_id])
        for result in (summaries, streaks):
            if result.is_not_ok():
                logger.error("Cannot refresh emblems: %s", result.info())
                return Result(code=result.code(), message=result.message())
        refreshed = await ListeningBadges.synchronize_async(
            session=session,
            user_ids=[user_id],
            summaries=summaries.result(),
            streaks=streaks.result(),
        )
        if refreshed.is_not_ok():
            logger.error("Cannot refresh emblem collection: %s", refreshed.info())
            return Result(code=refreshed.code(), message=refreshed.message())
        return Result(code=ResultCode.OK, message="OK", result=True)

    @staticmethod
    async def synchronize_async(
        session: AsyncSession,
        user_ids: list[int],
        summaries: dict[int, ListeningRewardSummary],
        streaks: dict[int, int],
    ) -> Result[dict[int, dict[str, datetime]]]:
        """Unlock new families and historical lower tiers without rewriting earned dates."""
        loaded = await ListeningBadgesAccess.get_for_users_async(
            session=session, user_ids=user_ids
        )
        if loaded.is_not_ok():
            logger.error("Cannot load emblem collections: %s", loaded.info())
            return Result(code=loaded.code(), message=loaded.message())
        earned = loaded.result()
        awards: list[tuple[int, str]] = []
        for user_id in user_ids:
            owned = earned.get(user_id, {})
            # Previously earned session tiers prove the lower tiers were reached too.
            proven_session = max(
                (
                    badge.target
                    for badge in LISTENING_BADGES
                    if badge.scope == "session" and badge.key in owned
                ),
                default=0,
            )
            for badge in LISTENING_BADGES:
                current = badge_current(
                    badge=badge,
                    summary=summaries[user_id],
                    streak=streaks.get(user_id, 0),
                )
                eligible = (
                    max(current, proven_session)
                    if badge.scope == "session"
                    else current
                )
                if badge.key not in owned and eligible >= badge.target:
                    awards.append((user_id, badge.key))
        granted = await ListeningBadgesAccess.award_many_async(
            session=session, awards=awards
        )
        if granted.is_not_ok():
            logger.error("Cannot unlock emblem collection: %s", granted.info())
            return Result(code=granted.code(), message=granted.message())
        for user_id, new_badges in granted.result().items():
            earned.setdefault(user_id, {}).update(new_badges)
        if granted.result():
            notify_after_commit(session=session, user_ids=list(granted.result()))
        return Result(code=ResultCode.OK, message="OK", result=earned)
