from calendar import monthrange
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.friend.listeningBadgesAccess import ListeningBadgesAccess
from core.framework.friend.listeningBadgeCatalog import LISTENING_BADGES
from core.framework.friend.listeningBadgeExpansion import EXPANDED_BADGE_FAMILIES
from core.framework.friend.notifications import notify_after_commit
from core.framework.models.listeningRewards import (
    ListeningBadgeDefinition,
    ListeningRewardSummary,
)
from core.responses.friend.userLevelResponse import ListeningBadgeResponse
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


def badge_metrics(
    summary: ListeningRewardSummary, streak: int, now: datetime | None = None
) -> dict[str, int]:
    """Recorded counters and UTC account anniversaries, projected once per user."""
    now = now or datetime.now(UTC)
    joined = summary.joined_at
    days = years = 0
    if joined and summary.recorded_listens > 0:
        joined = joined.replace(tzinfo=UTC) if joined.tzinfo is None else joined.astimezone(UTC)
        days = max(0, (now - joined).days)
        anniversary = joined.replace(
            year=now.year, day=min(joined.day, monthrange(now.year, joined.month)[1])
        )
        years = max(0, now.year - joined.year - int(now < anniversary))
    return {
        **{
            family.scope: max(0, summary.additional_metrics.get(family.scope, 0))
            for family in EXPANDED_BADGE_FAMILIES
        },
        "session": summary.session_ms // 60000,
        "total": summary.total_ms // 60000,
        "plays": summary.recorded_listens,
        "discovery": summary.unique_recordings,
        "streak": streak,
        "sharing": summary.recommendations,
        "friends": summary.friends,
        "videos": summary.videos,
        "mixed": min(summary.unique_recordings, summary.recommendations),
        "active_days": summary.active_days,
        "night": summary.night_listens,
        "early": summary.early_listens,
        "weekend": summary.weekend_listens,
        "tenure": days,
        "anniversary": years,
    }


def badge_current(
    badge: ListeningBadgeDefinition, summary: ListeningRewardSummary, streak: int
) -> int:
    """Never derive achievements from XP, elapsed playback or provider names."""
    return badge_metrics(summary=summary, streak=streak)[badge.metric or badge.scope]


def badge_response(
    badge: ListeningBadgeDefinition,
    metrics: dict[str, int],
    earned_at: datetime | None = None,
) -> ListeningBadgeResponse:
    """Reveal a secret's objective only after its persisted unlock."""
    hidden = badge.secret and earned_at is None
    return ListeningBadgeResponse(
        key=badge.key,
        scope=badge.scope,
        tier=badge.tier,
        league=badge.league,
        secret=badge.secret,
        titleKey="FRIENDS_BADGE_SECRET_HIDDEN" if hidden else badge.title_key,
        descriptionKey="FRIENDS_BADGE_SECRET_HINT" if hidden else badge.description_key,
        targetMinutes=badge.target if badge.scope in {"session", "total"} else 0,
        target=0 if hidden else badge.target,
        current=0 if hidden else metrics[badge.metric or badge.scope],
        visualVariant=badge.visual_variant,
        earnedAt=earned_at,
    )


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
            active_after=datetime.now(UTC) - timedelta(seconds=SESSION_BREAK_SECONDS),
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
        loaded = await ListeningBadgesAccess.get_for_users_async(session=session, user_ids=user_ids)
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
            metrics = badge_metrics(summary=summaries[user_id], streak=streaks.get(user_id, 0))
            for badge in LISTENING_BADGES:
                current = metrics[badge.metric or badge.scope]
                eligible = max(current, proven_session) if badge.scope == "session" else current
                if badge.key not in owned and eligible >= badge.target:
                    awards.append((user_id, badge.key))
        granted = await ListeningBadgesAccess.award_many_async(session=session, awards=awards)
        if granted.is_not_ok():
            logger.error("Cannot unlock emblem collection: %s", granted.info())
            return Result(code=granted.code(), message=granted.message())
        for user_id, new_badges in granted.result().items():
            earned.setdefault(user_id, {}).update(new_badges)
        if granted.result():
            notify_after_commit(session=session, user_ids=list(granted.result()))
        return Result(code=ResultCode.OK, message="OK", result=earned)
