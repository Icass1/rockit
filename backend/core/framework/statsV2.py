from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.statsV2Access import StatsV2Access, StatsV2SummaryData

from backend.core.responses.statsV2SummaryResponse import StatsV2SummaryResponse
from backend.core.responses.userStatsV2Response import UserStatsV2Response
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


def _get_group_by(range_value: str) -> str:
    if range_value == "7d":
        return "day"
    elif range_value == "30d":
        return "week"
    elif range_value == "1y":
        return "month"
    elif range_value == "all":
        return "month"
    return "week"


class StatsV2:
    @staticmethod
    async def get_user_stats_async(
        session: AsyncSession,
        user_id: int,
        range_value: str,
        custom_start: datetime | None = None,
        custom_end: datetime | None = None,
    ) -> AResult[UserStatsV2Response]:
        start_date, end_date = _parse_range(range_value, custom_start, custom_end)
        group_by: str = _get_group_by(range_value)

        if range_value == "all":
            a_first = await StatsV2Access.get_first_listen_date_async(
                session=session, user_id=user_id
            )
            if a_first.is_ok():
                first_date = a_first.result()
                if first_date is not None:
                    start_date = first_date

        try:
            summary_result: AResult[StatsV2SummaryData] = (
                await StatsV2Access.get_summary_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                )
            )
            if summary_result.is_not_ok():
                logger.error(f"Error getting v2 stats summary: {summary_result.info()}")
                return AResult(
                    code=summary_result.code(), message=summary_result.message()
                )

            s: StatsV2SummaryData = summary_result.result()

            minutes_result: AResult[list[StatsMinutesEntryResponse]] = (
                await StatsV2Access.get_minutes_by_period_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                    group_by=group_by,
                )
            )
            top_songs_result: AResult[list[StatsRankedItemResponse]] = (
                await StatsV2Access.get_top_songs_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                    limit=25,
                )
            )
            top_videos_result: AResult[list[StatsRankedItemResponse]] = (
                await StatsV2Access.get_top_videos_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                    limit=25,
                )
            )
            top_artists_result: AResult[list[StatsRankedItemResponse]] = (
                await StatsV2Access.get_top_artists_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                    limit=25,
                )
            )
            top_albums_result: AResult[list[StatsRankedItemResponse]] = (
                await StatsV2Access.get_top_albums_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                    limit=25,
                )
            )
            heatmap_result: AResult[list[StatsHeatmapCellResponse]] = (
                await StatsV2Access.get_heatmap_async(
                    session=session,
                    user_id=user_id,
                    start_date=start_date,
                    end_date=end_date,
                )
            )
            streak_result: AResult[int] = await StatsV2Access.get_current_streak_async(
                session, user_id
            )

            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=UserStatsV2Response(
                    summary=StatsV2SummaryResponse(
                        uniqueMediasListened=s.unique_medias_listened,
                        uniqueSongsListened=s.unique_songs_listened,
                        uniqueVideosListened=s.unique_videos_listened,
                        totalListenSessions=s.total_sessions,
                        totalPlayTimeMs=s.total_play_time_ms,
                        totalPlayTimeMinutes=round(s.total_play_time_minutes, 1),
                        avgPlayTimePerMediaMs=round(s.avg_play_time_per_media_ms, 2),
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
            logger.error(f"Error getting v2 user stats: {e}", exc_info=True)
            return AResult(
                code=AResultCode.GENERAL_ERROR,
                message=f"Error getting v2 user stats: {str(e)}",
            )
