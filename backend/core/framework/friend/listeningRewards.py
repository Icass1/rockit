from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy.ext.asyncio import AsyncSession
from backend.core.aResult import AResult
from backend.core.access.friend.listeningRewardsAccess import ListeningRewardsAccess
from backend.core.access.friend.listeningBadgesAccess import ListeningBadgesAccess
from backend.core.framework.friend.listeningPolicy import LISTENING_BADGES
from backend.core.framework.friend.listeningPolicy import (
    MAX_OBSERVATION_GAP_MS,
    POSITION_TOLERANCE_MS,
    SESSION_BREAK_SECONDS,
    SESSION_MILESTONES,
)
from backend.core.framework.models.listeningRewards import (
    ListeningProgressUpdate,
    ListeningXpAward,
)
from backend.utils.logger import getLogger
from backend.core.framework.friend.notifications import notify_after_commit
from backend.core.framework.friend.friend import Friend

logger = getLogger(__name__)


class ListeningRewards:
    @staticmethod
    async def observe_async(
        session: AsyncSession,
        user_id: int,
        playback_id: str,
        position_ms: int,
        baseline: bool = False,
    ) -> AResult[bool]:
        """Credit advancing audio positions bounded by server elapsed time, never seeks."""
        now = datetime.now(timezone.utc)
        loaded = await ListeningRewardsAccess.get_locked_async(
            session=session,
            user_id=user_id,
            playback_id=playback_id,
            position_ms=position_ms,
            now=now,
        )
        if loaded.is_not_ok():
            logger.error("Cannot load listening rewards: %s", loaded.info())
            return AResult(code=loaded.code(), message=loaded.message())
        row = loaded.result()
        new_session = (now - row.active_at).total_seconds() > SESSION_BREAK_SECONDS
        session_id = str(uuid4()) if new_session else row.session_id
        previous_ms = 0 if new_session else row.session_ms
        elapsed_ms = max(0, int((now - row.observed_at).total_seconds() * 1000))
        delta_ms = position_ms - row.position_ms
        credited_ms = 0
        if (
            not baseline
            and not new_session
            and row.playback_id == playback_id
            and 0 < elapsed_ms <= MAX_OBSERVATION_GAP_MS
            and 0 < delta_ms <= elapsed_ms + POSITION_TOLERANCE_MS
        ):
            credited_ms = min(delta_ms, elapsed_ms)
        session_ms = previous_ms + credited_ms
        awards = [
            ListeningXpAward(event_key=f"{session_id}:{step.minutes}", xp=step.xp)
            for step in SESSION_MILESTONES
            if previous_ms < step.minutes * 60000 <= session_ms
        ]
        previous_total = row.total_ms
        progress = ListeningProgressUpdate(
            session_id=session_id,
            session_ms=session_ms,
            total_ms=row.total_ms + credited_ms,
            playback_id=playback_id,
            position_ms=position_ms,
            observed_at=now,
            active_at=now if credited_ms or new_session else row.active_at,
        )
        saved = await ListeningRewardsAccess.save_async(
            session=session, user_id=user_id, progress=progress, awards=awards
        )
        if saved.is_not_ok():
            logger.error("Cannot persist listening rewards: %s", saved.info())
        unlocked_any = False
        if saved.is_ok() and credited_ms > 0:
            badge_keys = [
                badge.key
                for badge in LISTENING_BADGES
                if (previous_ms if badge.scope == "session" else previous_total)
                < badge.target_minutes * 60000
                <= (session_ms if badge.scope == "session" else progress.total_ms)
            ]
            unlocked = await ListeningBadgesAccess.award_async(
                session=session, user_id=user_id, badge_keys=badge_keys
            )
            if unlocked.is_not_ok():
                logger.error("Cannot persist listening emblems: %s", unlocked.info())
                return AResult(code=unlocked.code(), message=unlocked.message())
            unlocked_any = unlocked.result()
        if saved.is_ok() and (
            saved.result()
            or unlocked_any
            or progress.session_ms // 30000 != previous_ms // 30000
        ):
            recipients = [user_id]
            if saved.result() or unlocked_any:
                friends = await Friend.get_friend_ids_async(
                    session=session, user_id=user_id
                )
                if friends.is_ok():
                    recipients.extend(friends.result())
                else:
                    logger.error("Cannot resolve reward recipients: %s", friends.info())
            notify_after_commit(session=session, user_ids=recipients)
        return saved
