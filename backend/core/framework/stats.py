from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.statsAccess import StatsAccess

from backend.core.responses.homeStatsResponse import HomeStatsResponse
from backend.core.responses.userStatsResponse import UserStatsResponse
from backend.core.responses.statsSummaryResponse import StatsSummaryResponse
from backend.core.responses.statsRankedItemResponse import StatsRankedItemResponse
from backend.core.responses.statsHeatmapCellResponse import StatsHeatmapCellResponse
from backend.core.responses.statsMinutesEntryResponse import StatsMinutesEntryResponse

logger = getLogger(__name__)


def _parse_range(
    range_value: str,
    custom_start: datetime | None = None,
    custom_end: datetime | None = None,
) -> tuple[datetime, datetime]:
    now = datetime.now(timezone.utc)
    end_of_today = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(
        days=1
    )

    if range_value == "7d":
        start_date = end_of_today - timedelta(days=7)
        end_date = end_of_today
    elif range_value == "30d":
        start_date = end_of_today - timedelta(days=30)
        end_date = end_of_today
    elif range_value == "1y":
        start_date = end_of_today - timedelta(days=365)
        end_date = end_of_today
    elif range_value == "custom" and custom_start and custom_end:
        start_date = custom_start
        end_date = custom_end
    elif range_value == "all":
        start_date = now
        end_date = end_of_today
    else:
        start_date = end_of_today - timedelta(days=7)
        end_date = end_of_today

    return start_date, end_date


def _get_group_by(
    range_value: str,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> str:
    if range_value == "7d":
        return "day"
    elif range_value == "30d":
        return "week"
    elif range_value == "1y":
        return "month"
    elif range_value == "all":
        return "month"
    elif range_value == "custom" and start_date and end_date:
        days = (end_date - start_date).days
        if days <= 1:
            return "hour"
        elif days <= 31:
            return "day"
        elif days <= 90:
            return "week"
        else:
            return "month"
    return "week"


class Stats:
    @staticmethod
    async def get_home_stats_async(
        session: AsyncSession,
        user_id: int,
    ) -> AResult[HomeStatsResponse]:
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=HomeStatsResponse(
                songsByTimePlayed=[],
                randomSongsLastMonth=[],
                nostalgicMix=[],
                hiddenGems=[],
                communityTop=[],
                monthlyTop=[],
                moodSongs=[],
            ),
        )

    @staticmethod
    async def get_user_stats_async(
        session: AsyncSession,
        user_id: int,
        range_value: str,
        custom_start: datetime | None = None,
        custom_end: datetime | None = None,
    ) -> AResult[UserStatsResponse]:
        start_date, end_date = _parse_range(range_value, custom_start, custom_end)
        group_by: str = _get_group_by(range_value, start_date, end_date)

        if range_value == "all":
            a_first = await StatsAccess.get_first_listen_date_async(
                session=session, user_id=user_id
            )
            if a_first.is_ok():
                first_date = a_first.result()
                if first_date is not None:
                    start_date = first_date

        try:
            summary_result: AResult[dict[str, Any]] = (
                await StatsAccess.get_summary_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                )
            )
            if summary_result.is_not_ok():
                logger.error(f"Error getting stats summary: {summary_result.info()}")
                return AResult(
                    code=summary_result.code(), message=summary_result.message()
                )

            s = summary_result.result()

            minutes_result: AResult[list[StatsMinutesEntryResponse]] = (
                await StatsAccess.get_minutes_by_period_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                    group_by=group_by,
                )
            )
            top_songs_result: AResult[list[StatsRankedItemResponse]] = (
                await StatsAccess.get_top_songs_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                    limit=25,
                )
            )
            top_videos_result: AResult[list[StatsRankedItemResponse]] = (
                await StatsAccess.get_top_videos_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                    limit=25,
                )
            )
            top_artists_result: AResult[list[StatsRankedItemResponse]] = (
                await StatsAccess.get_top_artists_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                    limit=25,
                )
            )
            top_albums_result: AResult[list[StatsRankedItemResponse]] = (
                await StatsAccess.get_top_albums_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                    limit=25,
                )
            )
            heatmap_result: AResult[list[StatsHeatmapCellResponse]] = (
                await StatsAccess.get_heatmap_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                )
            )
            streak_result: AResult[int] = await StatsAccess.get_current_streak_async(
                session, user_id
            )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=UserStatsResponse(
                    summary=StatsSummaryResponse(
                        mediasListened=s["medias_listened"],
                        songsListened=s["songs_listened"],
                        videosListened=s["videos_listened"],
                        minutesListened=round(s["total_minutes"], 1),
                        avgMinutesPerSong=round(s["avg_minutes"], 2),
                        currentStreak=streak_result.result() or 0,
                    ),
                    minutes=minutes_result.result() or [],
                    topSongs=top_songs_result.result() or [],
                    topVideos=top_videos_result.result() or [],
                    topAlbums=top_albums_result.result() or [],
                    topArtists=top_artists_result.result() or [],
                    heatmap=heatmap_result.result() or [],
                ),
            )
        except Exception as e:
            logger.error(f"Error getting user stats: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Error getting user stats: {str(e)}",
            )

    @staticmethod
    async def get_streak_async(
        session: AsyncSession,
        user_id: int,
    ) -> AResult[int]:
        """Get current user streak count."""

        a_result: AResult[int] = await StatsAccess.get_current_streak_async(
            session=session, user_id=user_id
        )
        if a_result.is_not_ok():
            logger.error(f"Error getting streak. {a_result.info()}")
            return AResult(code=a_result.code(), message=a_result.message())

        return AResult(code=AResultCode.OK, message="OK", result=a_result.result())
