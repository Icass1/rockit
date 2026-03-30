from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse
from backend.core.responses.statsHeatmapCellResponse import StatsHeatmapCellResponse
from backend.core.responses.statsMinutesEntryResponse import StatsMinutesEntryResponse
from backend.core.responses.statsRankedItemResponse import StatsRankedItemResponse
from backend.utils.logger import getLogger

logger = getLogger(__name__)


class StatsAccess:
    @staticmethod
    async def get_songs_listened_async(
        session: AsyncSession,
        user_id: int,
        start_date: str,
        end_date: str,
    ) -> AResult[int]:
        """Get the count of songs listened by a user in a date range."""

        # TODO: Replace with real DB query
        # SELECT COUNT(*) FROM core.user_media_clicked
        # WHERE user_id = :user_id AND date_added BETWEEN :start_date AND :end_date
        return AResult(code=AResultCode.OK, message="OK", result=0)

    @staticmethod
    async def get_minutes_listened_async(
        session: AsyncSession,
        user_id: int,
        start_date: str,
        end_date: str,
    ) -> AResult[float]:
        """Get total minutes listened by a user in a date range."""

        # TODO: Replace with real DB query
        return AResult(code=AResultCode.OK, message="OK", result=0.0)

    @staticmethod
    async def get_minutes_by_period_async(
        session: AsyncSession,
        user_id: int,
        start_date: str,
        end_date: str,
        group_by: str,
    ) -> AResult[list[StatsMinutesEntryResponse]]:
        """Get minutes listened grouped by period (day/week/month)."""

        # TODO: Replace with real DB query
        return AResult(code=AResultCode.OK, message="OK", result=[])

    @staticmethod
    async def get_top_songs_async(
        session: AsyncSession,
        user_id: int,
        start_date: str,
        end_date: str,
        limit: int = 10,
    ) -> AResult[list[StatsRankedItemResponse]]:
        """Get top songs by play count."""

        # TODO: Replace with real DB query
        return AResult(code=AResultCode.OK, message="OK", result=[])

    @staticmethod
    async def get_top_albums_async(
        session: AsyncSession,
        user_id: int,
        start_date: str,
        end_date: str,
        limit: int = 8,
    ) -> AResult[list[StatsRankedItemResponse]]:
        """Get top albums by play count."""

        # TODO: Replace with real DB query
        return AResult(code=AResultCode.OK, message="OK", result=[])

    @staticmethod
    async def get_top_artists_async(
        session: AsyncSession,
        user_id: int,
        start_date: str,
        end_date: str,
        limit: int = 6,
    ) -> AResult[list[StatsRankedItemResponse]]:
        """Get top artists by play count."""

        # TODO: Replace with real DB query
        return AResult(code=AResultCode.OK, message="OK", result=[])

    @staticmethod
    async def get_heatmap_async(
        session: AsyncSession,
        user_id: int,
        start_date: str,
        end_date: str,
    ) -> AResult[list[StatsHeatmapCellResponse]]:
        """Get listening activity heatmap (hour x day)."""

        # TODO: Replace with real DB query
        return AResult(code=AResultCode.OK, message="OK", result=[])

    @staticmethod
    async def get_current_streak_async(
        session: AsyncSession,
        user_id: int,
    ) -> AResult[int]:
        """Get the current listening streak in days."""

        # TODO: Replace with real DB query
        return AResult(code=AResultCode.OK, message="OK", result=0)

    @staticmethod
    async def get_top_genre_async(
        session: AsyncSession,
        user_id: int,
        start_date: str,
        end_date: str,
    ) -> AResult[str]:
        """Get the most listened genre."""

        # TODO: Replace with real DB query
        return AResult(code=AResultCode.OK, message="OK", result="")

    @staticmethod
    async def get_home_songs_async(
        session: AsyncSession,
        user_id: int,
    ) -> AResult[list[BaseSongWithAlbumResponse]]:
        """Get songs for home screen sections."""

        # TODO: Replace with real DB query
        return AResult(code=AResultCode.OK, message="OK", result=[])
