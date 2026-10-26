from typing import List
from datetime import datetime, timedelta, timezone
from backend.core.access.friend.listeningRewardsAccess import ListeningRewardsAccess
from backend.core.framework.friend.listeningBadges import ListeningBadges, badge_current
from backend.core.framework.friend.listeningPolicy import LISTENING_BADGES
from backend.core.responses.friend.userLevelResponse import ListeningBadgeResponse
from backend.core.framework.friend.listeningPolicy import (
    SESSION_BREAK_SECONDS,
    SESSION_MILESTONES,
)
from backend.core.responses.friend.userLevelResponse import ListeningMilestoneResponse
from backend.core.responses.friend.userLevelResponse import UserLevelResponse

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.friend.userLevelAccess import UserLevelAccess
from backend.core.access.db.ormModels.friend.userLevel import UserLevelRow
from backend.core.access.db.ormModels.friend.levelConfig import LevelConfigRow

logger = getLogger(__name__)


class Levels:
    @staticmethod
    async def get_user_level_async(
        session: AsyncSession, user_id: int
    ) -> AResult[UserLevelRow]:
        a_result = await UserLevelAccess.get_or_create_user_level_async(
            session=session, user_id=user_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting user level. {a_result.info()}", exc_info=True)
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def add_xp_async(
        session: AsyncSession, user_id: int, xp_amount: int
    ) -> AResult[UserLevelRow]:
        a_result = await UserLevelAccess.add_xp_async(
            session=session, user_id=user_id, xp_amount=xp_amount
        )
        if a_result.is_not_ok():
            logger.error(f"Error adding XP. {a_result.info()}", exc_info=True)
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_leaderboard_async(
        session: AsyncSession, limit: int = 50
    ) -> AResult[List[UserLevelRow]]:
        a_result = await UserLevelAccess.get_leaderboard_async(
            session=session, limit=limit
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting leaderboard. {a_result.info()}", exc_info=True)
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_level_configs_async(
        session: AsyncSession,
    ) -> AResult[List[LevelConfigRow]]:
        a_result = await UserLevelAccess.get_level_configs_async(session=session)
        if a_result.is_not_ok():
            logger.error(
                f"Error getting level configs. {a_result.info()}", exc_info=True
            )
            return AResult(code=a_result.code(), message=a_result.message())
        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())

    @staticmethod
    async def get_profiles_async(
        session: AsyncSession, user_ids: list[int]
    ) -> AResult[list["UserLevelResponse"]]:
        from backend.core.access.friend.friendAccess import FriendAccess
        from backend.core.access.statsAccess import get_streaks_for_users_async

        users = await FriendAccess.get_users_async(session, user_ids)
        levels = await UserLevelAccess.get_user_levels_async(session, user_ids)
        configs = await UserLevelAccess.get_level_configs_async(session)
        streaks = await get_streaks_for_users_async(session, user_ids)
        rewards = await ListeningRewardsAccess.get_summaries_async(
            session=session,
            user_ids=user_ids,
            active_after=datetime.now(timezone.utc)
            - timedelta(seconds=SESSION_BREAK_SECONDS),
        )
        for result in (users, levels, configs, streaks, rewards):
            if result.is_not_ok():
                logger.error(f"Error getting social profiles. {result.info()}")
                return AResult(code=result.code(), message=result.message())
        badges = await ListeningBadges.synchronize_async(
            session=session,
            user_ids=user_ids,
            summaries=rewards.result(),
            streaks=streaks.result(),
        )
        if badges.is_not_ok():
            logger.error("Error projecting emblem profiles: %s", badges.info())
            return AResult(code=badges.code(), message=badges.message())
        by_user = {row.user_id: row for row in levels.result()}
        responses: list[UserLevelResponse] = []
        for user in users.result():
            row = by_user[user.id]
            title = next(
                (c.title for c in configs.result() if c.level == row.level), ""
            )
            next_xp = next(
                (c.xp_required for c in configs.result() if c.level > row.level), row.xp
            )
            responses.append(
                UserLevelResponse(
                    userId=user.public_id,
                    username=user.username,
                    imageUrl=user.image.url if user.image else None,
                    level=row.level,
                    xp=row.xp,
                    xpToNext=max(0, next_xp - row.xp),
                    title=title,
                    streak=streaks.result().get(user.id, 0),
                    listeningBadges=[
                        ListeningBadgeResponse(
                            key=badge.key,
                            titleKey=badge.title_key,
                            descriptionKey=badge.description_key,
                            scope=badge.scope,
                            targetMinutes=(
                                badge.target
                                if badge.scope in {"session", "total"}
                                else 0
                            ),
                            target=badge.target,
                            current=badge_current(
                                badge=badge,
                                summary=rewards.result()[user.id],
                                streak=streaks.result().get(user.id, 0),
                            ),
                            visualVariant=badge.visual_variant,
                            tier=badge.tier,
                            earnedAt=badges.result().get(user.id, {}).get(badge.key),
                        )
                        for badge in LISTENING_BADGES
                    ],
                    songsListened=rewards.result()[user.id].recorded_listens,
                    totalListeningSeconds=rewards.result()[user.id].total_ms // 1000,
                    sessionListeningSeconds=rewards.result()[user.id].session_ms
                    // 1000,
                    listeningMilestones=[
                        ListeningMilestoneResponse(
                            minutes=step.minutes,
                            xp=step.xp,
                            reached=rewards.result()[user.id].session_ms
                            >= step.minutes * 60000,
                        )
                        for step in SESSION_MILESTONES
                    ],
                    levelStartXp=next(
                        (
                            c.xp_required
                            for c in configs.result()
                            if c.level == row.level
                        ),
                        0,
                    ),
                )
            )
        return AResult(code=AResultCode.OK, message="OK", result=responses)
