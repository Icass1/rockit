from datetime import datetime, timedelta, timezone
from typing import Any, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.statsAccess import StatsAccess
from backend.core.access.userLikedMediaAccess import UserLikedMediaAccess

from backend.core.enums.mediaTypeEnum import MediaTypeEnum

from backend.core.framework import providers
from backend.core.framework.media.media import Media
from backend.core.framework.models.media import MediaModel
from backend.core.framework.provider.baseMediaProvider import BaseMediaProvider

from backend.core.responses.homeStatsResponse import HomeStatsResponse
from backend.core.responses.userStatsResponse import UserStatsResponse
from backend.core.responses.statsSummaryResponse import StatsSummaryResponse
from backend.core.responses.statsRankedItemResponse import StatsRankedItemResponse
from backend.core.responses.statsHeatmapCellResponse import StatsHeatmapCellResponse
from backend.core.responses.statsMinutesEntryResponse import StatsMinutesEntryResponse
from backend.core.responses.baseSongWithAlbumResponse import BaseSongWithAlbumResponse

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


async def _resolve_songs_from_ids_async(
    session: AsyncSession,
    public_ids: List[str],
) -> dict[str, BaseSongWithAlbumResponse]:
    """Resolve a list of public_ids to a dict of public_id → BaseSongWithAlbumResponse."""
    if not public_ids:
        return {}

    a_medias: AResult[List[MediaModel]] = await Media.get_medias_from_public_ids_async(
        session=session,
        public_ids=list(dict.fromkeys(public_ids)),
        media_type_keys=[MediaTypeEnum.SONG],
    )
    if a_medias.is_not_ok():
        logger.error(f"Error resolving medias for home stats: {a_medias.info()}")
        return {}
    if not a_medias.result():
        return {}

    medias: List[MediaModel] = a_medias.result()
    pid_to_provider: dict[str, int] = {m.public_id: m.provider_id for m in medias}

    by_provider: dict[int, List[str]] = {}
    for pid in public_ids:
        pid_int = pid_to_provider.get(pid)
        if pid_int is not None:
            by_provider.setdefault(pid_int, []).append(pid)

    result_map: dict[str, BaseSongWithAlbumResponse] = {}
    for provider_id, pids in by_provider.items():
        provider: BaseMediaProvider | None = providers.find_media_provider(provider_id)
        if provider is None:
            logger.warning(f"No media provider found for provider_id {provider_id}")
            continue
        a_songs: AResult[List[BaseSongWithAlbumResponse]] = (
            await provider.get_songs_async(session=session, public_ids=pids)
        )
        if a_songs.is_not_ok():
            logger.error(
                f"Provider {provider_id} error resolving {len(pids)} songs: {a_songs.info()}"
            )
            continue
        for song in a_songs.result():
            result_map[song.publicId] = song

    return result_map


class Stats:
    @staticmethod
    async def get_home_stats_async(
        session: AsyncSession,
        user_id: int,
    ) -> AResult[HomeStatsResponse]:
        """Assemble home page sections from real listening data.

        Each section uses its own query — no arbitrary slicing or fake data.
        Sections without available data (communityTop, moodSongs) return empty.
        """

        now: datetime = datetime.now(timezone.utc)
        month_ago: datetime = now - timedelta(days=30)

        # --- songsByTimePlayed: recent listens ---
        a_recent: AResult[List[str]] = (
            await StatsAccess.get_recently_played_songs_async(
                session=session, user_id=user_id, limit=3
            )
        )
        recent_ids: List[str] = a_recent.result() if a_recent.is_ok() else []

        # --- randomSongsLastMonth: random songs from last 30 days ---
        a_random: AResult[List[str]] = (
            await StatsAccess.get_random_songs_last_month_async(
                session=session,
                user_id=user_id,
                start_date=month_ago,
                end_date=now,
                limit=30,
            )
        )
        random_ids: List[str] = a_random.result() if a_random.is_ok() else []

        # --- monthlyTop: top songs from last 30 days ---
        a_top_month: AResult[List[str]] = (
            await StatsAccess.get_top_media_public_ids_async(
                session=session,
                user_id=user_id,
                start_date=month_ago,
                end_date=now,
                limit=15,
            )
        )
        monthly_ids: List[str] = a_top_month.result() if a_top_month.is_ok() else []

        # --- nostalgicMix: songs played longest ago ---
        a_nostalgic: AResult[List[str]] = (
            await StatsAccess.get_least_recently_played_songs_async(
                session=session, user_id=user_id, limit=6
            )
        )
        nostalgic_ids: List[str] = a_nostalgic.result() if a_nostalgic.is_ok() else []

        # --- hiddenGems: liked songs not played in the last 90 days ---
        ninety_days_ago: datetime = now - timedelta(days=90)

        a_played_since_90d: AResult[List[str]] = (
            await StatsAccess.get_recently_played_songs_since_async(
                session=session,
                user_id=user_id,
                since_date=ninety_days_ago,
            )
        )
        played_ids_since_90d: List[str] = (
            a_played_since_90d.result() if a_played_since_90d.is_ok() else []
        )

        a_liked: AResult[List[str]] = (
            await UserLikedMediaAccess.get_user_liked_media_public_ids_async(
                session=session, user_id=user_id
            )
        )
        all_liked_ids: List[str] = a_liked.result() if a_liked.is_ok() else []
        played_set: set[str] = set(played_ids_since_90d)
        hidden_ids: List[str] = [pid for pid in all_liked_ids if pid not in played_set][
            :3
        ]

        # --- weekly stats (streak + minutes this week) ---
        week_ago: datetime = now - timedelta(days=7)

        a_weekly_summary: AResult[dict[str, Any]] = await StatsAccess.get_summary_async(
            session=session,
            user_id=user_id,
            start_date=week_ago,
            end_date=now,
        )
        minutes_this_week: float = (
            a_weekly_summary.result().get("total_minutes", 0.0)
            if a_weekly_summary.is_ok()
            else 0.0
        )

        a_streak: AResult[int] = await StatsAccess.get_current_streak_async(
            session=session, user_id=user_id
        )
        current_streak: int = a_streak.result() if a_streak.is_ok() else 0

        # Resolve all unique song IDs in a single pass
        all_ids: List[str] = list(
            dict.fromkeys(
                recent_ids + random_ids + monthly_ids + nostalgic_ids + hidden_ids
            )
        )
        resolved: dict[str, BaseSongWithAlbumResponse] = (
            await _resolve_songs_from_ids_async(session=session, public_ids=all_ids)
        )

        def lookup(ids: List[str]) -> List[BaseSongWithAlbumResponse]:
            return [resolved[pid] for pid in ids if pid in resolved]

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=HomeStatsResponse(
                songsByTimePlayed=lookup(recent_ids),
                randomSongsLastMonth=lookup(random_ids),
                nostalgicMix=lookup(nostalgic_ids),
                hiddenGems=lookup(hidden_ids),
                communityTop=[],  # no multi-user aggregation yet
                monthlyTop=lookup(monthly_ids),
                moodSongs=[],  # no mood/genre data yet
                currentStreak=current_streak,
                minutesListenedThisWeek=minutes_this_week,
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
        start_date, end_date = parse_range(range_value, custom_start, custom_end)
        group_by: str = get_group_by(range_value, start_date, end_date)

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
