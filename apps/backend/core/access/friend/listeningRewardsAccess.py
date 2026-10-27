from datetime import datetime
from uuid import uuid4
from sqlalchemy import func, select, update, tuple_, case
from sqlalchemy.orm import aliased
from core.access.db.ormModels.media import CoreMediaRow
from core.access.db.ormModels.friend.friend import FriendRow
from core.enums.friend.friendStatusEnum import FriendStatusEnum
from core.enums.mediaTypeEnum import MediaTypeEnum
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from result import Result, ResultCode
from core.access.db.ormModels.friend.listeningProgress import (
    ListeningProgressRow,
)
from core.access.db.ormModels.friend.listeningXpEvent import ListeningXpEventRow
from core.access.db.ormModels.friend.userLevel import UserLevelRow
from core.access.db.ormModels.friend.sharedMedia import SharedMediaRow
from core.access.db.ormModels.friend.levelConfig import LevelConfigRow
from core.access.db.ormModels.user_media_listened import UserMediaListenedRow
from core.framework.models.listeningRewards import (
    ListeningProgressUpdate,
    ListeningRewardSummary,
    ListeningXpAward,
)
from core.utils.safeAsyncCall import safe_async
from core.access.friend.userLevelAccess import UserLevelAccess
from logger import getLogger

logger = getLogger(__name__)


class ListeningRewardsAccess:
    @staticmethod
    @safe_async
    async def get_locked_async(
        session: AsyncSession,
        user_id: int,
        playback_id: str,
        position_ms: int,
        now: datetime,
    ) -> Result[ListeningProgressRow]:
        """Create the cursor once and serialize concurrent reward writes by user."""
        created = await session.execute(
            insert(ListeningProgressRow)
            .values(
                user_id=user_id,
                session_id=str(uuid4()),
                session_ms=0,
                total_ms=0,
                playback_id=playback_id,
                position_ms=position_ms,
                observed_at=now,
                active_at=now,
            )
            .on_conflict_do_nothing(index_elements=[ListeningProgressRow.user_id])
            .returning(ListeningProgressRow.user_id)
        )
        if created.scalar_one_or_none() is not None:
            initialized = await UserLevelAccess.get_user_levels_async(
                session=session, user_ids=[user_id]
            )
            if initialized.is_not_ok():
                logger.error("Cannot preserve existing XP: %s", initialized.info())
                return Result(code=initialized.code(), message=initialized.message())
            # Freeze legacy credit before this user's first timed session starts.
            plays = await session.scalar(
                select(func.count())
                .select_from(UserMediaListenedRow)
                .where(UserMediaListenedRow.user_id == user_id)
            )
            legacy_xp = int(plays or 0) * 10
            await session.execute(
                update(UserLevelRow)
                .where(UserLevelRow.user_id == user_id)
                .values(xp=func.greatest(UserLevelRow.xp, legacy_xp))
            )
            level = (
                select(func.max(LevelConfigRow.level))
                .where(LevelConfigRow.xp_required <= UserLevelRow.xp)
                .correlate(UserLevelRow)
                .scalar_subquery()
            )
            await session.execute(
                update(UserLevelRow)
                .where(UserLevelRow.user_id == user_id)
                .values(level=func.coalesce(level, 1))
            )
        row = await session.scalar(
            select(ListeningProgressRow)
            .where(ListeningProgressRow.user_id == user_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if row is None:
            return Result(
                code=ResultCode.NOT_FOUND, message="Listening progress unavailable"
            )
        return Result(code=ResultCode.OK, message="OK", result=row)

    @staticmethod
    @safe_async
    async def save_async(
        session: AsyncSession,
        user_id: int,
        progress: ListeningProgressUpdate,
        awards: list[ListeningXpAward],
    ) -> Result[bool]:
        """Persist cursor, unique XP events and wallet changes in one transaction."""
        await session.execute(
            update(ListeningProgressRow)
            .where(ListeningProgressRow.user_id == user_id)
            .values(
                session_id=progress.session_id,
                session_ms=progress.session_ms,
                total_ms=progress.total_ms,
                playback_id=progress.playback_id,
                position_ms=progress.position_ms,
                observed_at=progress.observed_at,
                active_at=progress.active_at,
            )
        )
        added_xp = 0
        if awards:
            result = await session.execute(
                insert(ListeningXpEventRow)
                .values(
                    [
                        {"user_id": user_id, "event_key": a.event_key, "xp": a.xp}
                        for a in awards
                    ]
                )
                .on_conflict_do_nothing(
                    index_elements=[
                        ListeningXpEventRow.user_id,
                        ListeningXpEventRow.event_key,
                    ]
                )
                .returning(ListeningXpEventRow.xp)
            )
            added_xp = sum(result.scalars().all())
            if added_xp:
                await session.execute(
                    update(UserLevelRow)
                    .where(UserLevelRow.user_id == user_id)
                    .values(xp=UserLevelRow.xp + added_xp)
                )
        level = (
            select(func.max(LevelConfigRow.level))
            .where(LevelConfigRow.xp_required <= UserLevelRow.xp)
            .correlate(UserLevelRow)
            .scalar_subquery()
        )
        if awards:
            await session.execute(
                update(UserLevelRow)
                .where(UserLevelRow.user_id == user_id)
                .values(level=func.coalesce(level, 1))
            )
        return Result(code=ResultCode.OK, message="OK", result=added_xp > 0)

    @staticmethod
    @safe_async
    async def get_summaries_async(
        session: AsyncSession, user_ids: list[int], active_after: datetime
    ) -> Result[dict[int, ListeningRewardSummary]]:
        """Fetch verified duration and real play counts in four batch queries."""
        if not user_ids:
            return Result(code=ResultCode.OK, message="OK", result={})
        cursors = (
            await session.scalars(
                select(ListeningProgressRow).where(
                    ListeningProgressRow.user_id.in_(user_ids)
                )
            )
        ).all()
        counts = await session.execute(
            select(
                UserMediaListenedRow.user_id,
                func.count(),
                func.count(func.distinct(UserMediaListenedRow.media_id)),
                func.sum(
                    case(
                        (CoreMediaRow.media_type_key == MediaTypeEnum.VIDEO.value, 1),
                        else_=0,
                    )
                ),
            )
            .join(CoreMediaRow, CoreMediaRow.id == UserMediaListenedRow.media_id)
            .where(UserMediaListenedRow.user_id.in_(user_ids))
            .group_by(UserMediaListenedRow.user_id)
        )
        plays = {
            user_id: (int(count), int(unique), int(videos))
            for user_id, count, unique, videos in counts
        }
        shares = await session.execute(
            select(
                SharedMediaRow.sender_user_id,
                func.count(
                    func.distinct(
                        tuple_(
                            SharedMediaRow.recipient_user_id, SharedMediaRow.media_id
                        )
                    )
                ),
            )
            .where(SharedMediaRow.sender_user_id.in_(user_ids))
            .group_by(SharedMediaRow.sender_user_id)
        )
        recommendations = {user_id: int(count) for user_id, count in shares}
        reverse = aliased(FriendRow)
        friend_counts = await session.execute(
            select(
                FriendRow.user_id, func.count(func.distinct(FriendRow.friend_user_id))
            )
            .where(
                FriendRow.user_id.in_(user_ids),
                FriendRow.status_key == FriendStatusEnum.ACCEPTED.value,
                select(reverse.id)
                .where(
                    reverse.user_id == FriendRow.friend_user_id,
                    reverse.friend_user_id == FriendRow.user_id,
                    reverse.status_key == FriendStatusEnum.ACCEPTED.value,
                )
                .exists(),
            )
            .group_by(FriendRow.user_id)
        )
        friends = {user_id: int(count) for user_id, count in friend_counts}
        by_user = {row.user_id: row for row in cursors}
        result: dict[int, ListeningRewardSummary] = {}
        for user_id in user_ids:
            row = by_user.get(user_id)
            result[user_id] = ListeningRewardSummary(
                total_ms=row.total_ms if row else 0,
                session_ms=(
                    row.session_ms if row and row.active_at >= active_after else 0
                ),
                recorded_listens=plays.get(user_id, (0, 0))[0],
                unique_recordings=plays.get(user_id, (0, 0))[1],
                recommendations=recommendations.get(user_id, 0),
                friends=friends.get(user_id, 0),
                videos=plays.get(user_id, (0, 0, 0))[2],
            )
        return Result(code=ResultCode.OK, message="OK", result=result)
