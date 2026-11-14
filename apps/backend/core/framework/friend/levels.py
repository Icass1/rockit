from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from core.access.db.ormModels.friend.levelConfig import LevelConfigRow
from core.access.db.ormModels.friend.userLevel import UserLevelRow
from core.access.friend.listeningBadgesAccess import ListeningBadgesAccess
from core.access.friend.listeningRewardsAccess import ListeningRewardsAccess
from core.access.friend.userLevelAccess import UserLevelAccess
from core.framework.friend.listeningBadges import ListeningBadges, badge_metrics, badge_response
from core.framework.friend.listeningPolicy import (
    LISTENING_BADGES,
    SESSION_BREAK_SECONDS,
    SESSION_MILESTONES,
)
from core.framework.media.image import Image
from core.responses.friend.userLevelResponse import (
    ListeningMilestoneResponse,
    UserLevelResponse,
)
from logger import getLogger
from result import Result, ResultCode

logger = getLogger(__name__)


class Levels:
    @staticmethod
    async def get_user_level_async(session: AsyncSession, user_id: int) -> Result[UserLevelRow]:
        a_result = await UserLevelAccess.get_or_create_user_level_async(
            session=session, user_id=user_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting user level. {a_result.info()}", exc_info=True)
            return Result(code=a_result.code(), message=a_result.message())
        return Result(code=ResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def add_xp_async(
        session: AsyncSession, user_id: int, xp_amount: int
    ) -> Result[UserLevelRow]:
        a_result = await UserLevelAccess.add_xp_async(
            session=session, user_id=user_id, xp_amount=xp_amount
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding XP. {a_result.info()}", exc_info=True)
            return Result(code=a_result.code(), message=a_result.message())
        return Result(code=ResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_leaderboard_async(
        session: AsyncSession, limit: int = 50
    ) -> Result[list[UserLevelRow]]:
        a_result = await UserLevelAccess.get_leaderboard_async(session=session, limit=limit)
        if a_result.is_not_ok():
            logger.error(f"Error getting leaderboard. {a_result.info()}", exc_info=True)
            return Result(code=a_result.code(), message=a_result.message())
        return Result(code=ResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_level_configs_async(
        session: AsyncSession,
    ) -> Result[list[LevelConfigRow]]:
        a_result = await UserLevelAccess.get_level_configs_async(session=session)
        if a_result.is_not_ok():
            logger.error(f"Error getting level configs. {a_result.info()}", exc_info=True)
            return Result(code=a_result.code(), message=a_result.message())
        return Result(code=ResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_profiles_async(
        session: AsyncSession, user_ids: list[int], include_locked_badges: bool = True
    ) -> Result[list["UserLevelResponse"]]:
        from core.access.friend.friendAccess import FriendAccess
        from core.access.statsAccess import get_streaks_for_users_async

        users = await FriendAccess.get_users_async(session, user_ids)
        levels = await UserLevelAccess.get_user_levels_async(session, user_ids)
        configs = await UserLevelAccess.get_level_configs_async(session)
        streaks = await get_streaks_for_users_async(session, user_ids)
        rewards = await ListeningRewardsAccess.get_summaries_async(
            session=session,
            user_ids=user_ids,
            active_after=datetime.now(UTC) - timedelta(seconds=SESSION_BREAK_SECONDS),
        )
        for result in (users, levels, configs, streaks, rewards):
            if result.is_not_ok():
                logger.error(f"Error getting social profiles. {result.info()}")
                return Result(code=result.code(), message=result.message())
        badges = await ListeningBadges.synchronize_async(
            session=session,
            user_ids=user_ids,
            summaries=rewards.result(),
            streaks=streaks.result(),
        )
        if badges.is_not_ok():
            logger.error("Error projecting emblem profiles: %s", badges.info())
            return Result(code=badges.code(), message=badges.message())
        population = await ListeningBadgesAccess.get_population_async(session=session)
        if population.is_not_ok():
            logger.error("Error loading emblem rarity: %s", population.info())
            return Result(code=population.code(), message=population.message())
        total_users, holders = population.result()
        by_user = {row.user_id: row for row in levels.result()}
        responses: list[UserLevelResponse] = []
        for user in users.result():
            metrics = badge_metrics(
                summary=rewards.result()[user.id], streak=streaks.result().get(user.id, 0)
            )
            owned = badges.result().get(user.id, {})
            row = by_user[user.id]
            title = next((c.title for c in configs.result() if c.level == row.level), "")
            next_xp = next((c.xp_required for c in configs.result() if c.level > row.level), row.xp)
            a_result_image_url: Result[str] = await Image.get_internal_image_url_async(
                image=user.image
            )
            if a_result_image_url.is_not_ok():
                logger.error(f"Error getting user image URL. {a_result_image_url.info()}")
                return Result[list[UserLevelResponse]].from_result(a_result_image_url)
            image_url: str = a_result_image_url.result()

            responses.append(
                UserLevelResponse(
                    userId=user.public_id,
                    username=user.username,
                    imageUrl=image_url,
                    level=row.level,
                    xp=row.xp,
                    xpToNext=max(0, next_xp - row.xp),
                    title=title,
                    streak=streaks.result().get(user.id, 0),
                    listeningBadgeCount=sum(badge.key in owned for badge in LISTENING_BADGES),
                    listeningBadgeTotal=len(LISTENING_BADGES),
                    listeningBadges=[
                        badge_response(
                            badge=badge,
                            metrics=metrics,
                            earned_at=owned.get(badge.key),
                            holder_percentage=100 * holders.get(badge.key, 0) / total_users
                            if total_users
                            else 0,
                        )
                        for badge in LISTENING_BADGES
                        if include_locked_badges or badge.key in owned
                    ],
                    songsListened=rewards.result()[user.id].recorded_listens,
                    totalListeningSeconds=rewards.result()[user.id].total_ms // 1000,
                    sessionListeningSeconds=rewards.result()[user.id].session_ms // 1000,
                    listeningMilestones=[
                        ListeningMilestoneResponse(
                            minutes=step.minutes,
                            xp=step.xp,
                            reached=rewards.result()[user.id].session_ms >= step.minutes * 60000,
                        )
                        for step in SESSION_MILESTONES
                    ],
                    levelStartXp=next(
                        (c.xp_required for c in configs.result() if c.level == row.level),
                        0,
                    ),
                )
            )
        return Result(code=ResultCode.OK, message="OK", result=responses)
