from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger
from backend.core.aResult import AResult, AResultCode
from backend.core.access.friend.vibeAccess import VibeAccess
from backend.core.models.friend.vibeModels import VibeResult

logger = getLogger(__name__)


class Vibe:
    @staticmethod
    async def get_vibe_score_async(
        session: AsyncSession, user_id: int, friend_user_id: int
    ) -> AResult[VibeResult]:
        a_stats = await VibeAccess.get_shared_artist_stats_async(
            session=session, user_id=user_id, friend_user_id=friend_user_id
        )
        if a_stats.is_not_ok():
            logger.error(
                f"Error getting shared artist stats. {a_stats.info()}", exc_info=True
            )
            return AResult(code=a_stats.code(), message=a_stats.message())

        my_count, friend_count, shared_count = a_stats.result()
        total = my_count + friend_count
        score = int((shared_count * 2 / total) * 100) if total > 0 else 0
        score = min(score, 100)

        if score >= 80:
            descriptor = "MUSICAL_SOULMATES"
        elif score >= 60:
            descriptor = "GREAT_TASTE_TWINS"
        elif score >= 40:
            descriptor = "KINDRED_MUSIC_SPIRITS"
        elif score >= 20:
            descriptor = "OCCASIONAL_OVERLAP"
        else:
            descriptor = "DIFFERENT_WAVELENGTHS"

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=VibeResult(
                score=score,
                descriptor=descriptor,
                sharedArtistsCount=shared_count,
            ),
        )
