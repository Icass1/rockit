from datetime import datetime, timedelta, timezone
from typing import Any, List

import random

from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.aResult import AResult, AResultCode

from backend.core.access.statsAccess import StatsAccess
from backend.core.access.homeImpressionsAccess import HomeImpressionsAccess

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

# Cooldown windows per section (hours). After showing a track in a section,
# it is excluded from that section's candidate pool for this duration.
SECTION_COOLDOWN_HOURS: dict[str, int] = {
    "recently_played": 3,
    "most_listened": 12,
    "recent_mix": 24,
    "hidden_gems": 48,
    "quick_selections": 2,
    "your_mix": 6,
}

# Maximum tracks from the same artist in a single section output.
MAX_PER_ARTIST: dict[str, int] = {
    "recently_played": 2,
    "most_listened": 2,
    "recent_mix": 2,
    "hidden_gems": 2,
    "quick_selections": 3,
    "your_mix": 2,
}

# ~1% chance per home load — keeps impressions table bounded without
# a dedicated background task. Over enough traffic this is sufficient.
IMPRESSIONS_CLEANUP_PROBABILITY = 0.01


def _apply_diversity(
    songs: list[BaseSongWithAlbumResponse],
    max_per_artist: int,
) -> list[BaseSongWithAlbumResponse]:
    """Post-filter: limit tracks per artist to max_per_artist.

    Iterates in order and keeps the first N tracks per artist, dropping excess.
    """
    artist_counts: dict[str, int] = {}
    result: list[BaseSongWithAlbumResponse] = []

    for song in songs:
        artist_key = song.artists[0].publicId if song.artists else song.publicId
        count = artist_counts.get(artist_key, 0)
        if count < max_per_artist:
            result.append(song)
            artist_counts[artist_key] = count + 1

    return result


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
        """Assemble home page sections using weighted sampling with rotation.

        Each section:
        1. Loads impressed media_ids (recently shown) from the impressions table.
        2. Queries a weighted-sampled candidate pool, excluding impressed tracks.
        3. Records the newly shown tracks as impressions (fire-and-forget).
        4. Applies a per-artist diversity cap as a post-filter.
        5. Carousel cards reuse the same generated lists — no duplicate queries.
        """

        now: datetime = datetime.now(timezone.utc)
        month_ago: datetime = now - timedelta(days=30)
        ninety_days_ago: datetime = now - timedelta(days=90)

        # Opportunistic cleanup — ~1% chance per call, no scheduler needed.
        if random.random() < IMPRESSIONS_CLEANUP_PROBABILITY:
            await HomeImpressionsAccess.cleanup_old_impressions_async(session=session)

        # --- Section 1: Recently Played (anchor + weighted sample) ---
        a_anchor: AResult[str | None] = await StatsAccess.get_most_recent_play_async(
            session=session,
            user_id=user_id,
        )
        anchor_id: str | None = a_anchor.result() if a_anchor.is_ok() else None

        a_rp_impressed: AResult[list[int]] = (
            await HomeImpressionsAccess.get_impressed_media_ids_async(
                session=session,
                user_id=user_id,
                section="recently_played",
                cooldown_hours=SECTION_COOLDOWN_HOURS["recently_played"],
            )
        )
        rp_impressed: list[int] = (
            a_rp_impressed.result() if a_rp_impressed.is_ok() else []
        )

        a_recent_pool: AResult[list[str]] = (
            await StatsAccess.get_weighted_recently_played_pool_async(
                session=session,
                user_id=user_id,
                pool_size=10,
                limit=3,
                impressed_ids=rp_impressed,
            )
        )
        recent_pool_ids: list[str] = (
            a_recent_pool.result() if a_recent_pool.is_ok() else []
        )

        recent_ids: list[str] = []
        if anchor_id:
            rest = [pid for pid in recent_pool_ids if pid != anchor_id][:2]
            recent_ids = [anchor_id] + rest
        else:
            recent_ids = recent_pool_ids[:3]

        # Record impressions for recently_played
        recent_media_ids = await Stats._media_ids_from_public_ids(session, recent_ids)
        await HomeImpressionsAccess.record_impressions_async(
            session=session,
            user_id=user_id,
            section="recently_played",
            media_ids=recent_media_ids,
        )

        # --- Section 2: Most Listened (weighted sampling) ---
        a_ml_impressed: AResult[list[int]] = (
            await HomeImpressionsAccess.get_impressed_media_ids_async(
                session=session,
                user_id=user_id,
                section="most_listened",
                cooldown_hours=SECTION_COOLDOWN_HOURS["most_listened"],
            )
        )
        ml_impressed: list[int] = (
            a_ml_impressed.result() if a_ml_impressed.is_ok() else []
        )

        a_monthly: AResult[list[str]] = (
            await StatsAccess.get_weighted_most_listened_async(
                session=session,
                user_id=user_id,
                start_date=month_ago,
                end_date=now,
                limit=15,
                pool_multiplier=4,
                impressed_ids=ml_impressed,
            )
        )
        monthly_ids: list[str] = a_monthly.result() if a_monthly.is_ok() else []

        monthly_media_ids = await Stats._media_ids_from_public_ids(session, monthly_ids)
        await HomeImpressionsAccess.record_impressions_async(
            session=session,
            user_id=user_id,
            section="most_listened",
            media_ids=monthly_media_ids,
        )

        # --- Section 3: Recent Mix (weighted sampling) ---
        a_rm_impressed: AResult[list[int]] = (
            await HomeImpressionsAccess.get_impressed_media_ids_async(
                session=session,
                user_id=user_id,
                section="recent_mix",
                cooldown_hours=SECTION_COOLDOWN_HOURS["recent_mix"],
            )
        )
        rm_impressed: list[int] = (
            a_rm_impressed.result() if a_rm_impressed.is_ok() else []
        )

        a_nostalgic: AResult[list[str]] = (
            await StatsAccess.get_weighted_recent_mix_async(
                session=session,
                user_id=user_id,
                limit=6,
                pool_multiplier=5,
                impressed_ids=rm_impressed,
            )
        )
        nostalgic_ids: list[str] = a_nostalgic.result() if a_nostalgic.is_ok() else []

        nostalgic_media_ids = await Stats._media_ids_from_public_ids(
            session, nostalgic_ids
        )
        await HomeImpressionsAccess.record_impressions_async(
            session=session,
            user_id=user_id,
            section="recent_mix",
            media_ids=nostalgic_media_ids,
        )

        # --- Section 4: Hidden Gems (weighted sampling) ---
        a_hg_impressed: AResult[list[int]] = (
            await HomeImpressionsAccess.get_impressed_media_ids_async(
                session=session,
                user_id=user_id,
                section="hidden_gems",
                cooldown_hours=SECTION_COOLDOWN_HOURS["hidden_gems"],
            )
        )
        hg_impressed: list[int] = (
            a_hg_impressed.result() if a_hg_impressed.is_ok() else []
        )

        a_hidden: AResult[list[str]] = (
            await StatsAccess.get_weighted_hidden_gems_pool_async(
                session=session,
                user_id=user_id,
                ninety_days_ago=ninety_days_ago,
                limit=3,
                pool_multiplier=3,
                impressed_ids=hg_impressed,
            )
        )
        hidden_ids: list[str] = a_hidden.result() if a_hidden.is_ok() else []

        hidden_media_ids = await Stats._media_ids_from_public_ids(session, hidden_ids)
        await HomeImpressionsAccess.record_impressions_async(
            session=session,
            user_id=user_id,
            section="hidden_gems",
            media_ids=hidden_media_ids,
        )

        # --- Section 5: Quick Selections (weighted sampling) ---
        a_qs_impressed: AResult[list[int]] = (
            await HomeImpressionsAccess.get_impressed_media_ids_async(
                session=session,
                user_id=user_id,
                section="quick_selections",
                cooldown_hours=SECTION_COOLDOWN_HOURS["quick_selections"],
            )
        )
        qs_impressed: list[int] = (
            a_qs_impressed.result() if a_qs_impressed.is_ok() else []
        )

        a_random: AResult[list[str]] = (
            await StatsAccess.get_weighted_quick_selections_async(
                session=session,
                user_id=user_id,
                start_date=month_ago,
                end_date=now,
                limit=36,
                pool_multiplier=5,
                impressed_ids=qs_impressed,
            )
        )
        random_ids: list[str] = a_random.result() if a_random.is_ok() else []

        random_media_ids = await Stats._media_ids_from_public_ids(session, random_ids)
        await HomeImpressionsAccess.record_impressions_async(
            session=session,
            user_id=user_id,
            section="quick_selections",
            media_ids=random_media_ids,
        )

        # --- Section 6: Your Mix / Carousel wildcard (weighted sampling) ---
        a_ym_impressed: AResult[list[int]] = (
            await HomeImpressionsAccess.get_impressed_media_ids_async(
                session=session,
                user_id=user_id,
                section="your_mix",
                cooldown_hours=SECTION_COOLDOWN_HOURS["your_mix"],
            )
        )
        ym_impressed: list[int] = (
            a_ym_impressed.result() if a_ym_impressed.is_ok() else []
        )

        a_your_mix: AResult[list[str]] = await StatsAccess.get_weighted_your_mix_async(
            session=session,
            user_id=user_id,
            limit=5,
            pool_multiplier=10,
            impressed_ids=ym_impressed,
        )
        your_mix_ids: list[str] = a_your_mix.result() if a_your_mix.is_ok() else []

        your_mix_media_ids = await Stats._media_ids_from_public_ids(
            session, your_mix_ids
        )
        await HomeImpressionsAccess.record_impressions_async(
            session=session,
            user_id=user_id,
            section="your_mix",
            media_ids=your_mix_media_ids,
        )

        # --- Weekly stats (streak + minutes this week) ---
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

        # --- Resolve all unique song IDs in a single batch ---
        all_ids: List[str] = list(
            dict.fromkeys(
                recent_ids
                + random_ids
                + monthly_ids
                + nostalgic_ids
                + hidden_ids
                + your_mix_ids
            )
        )
        resolved: dict[str, BaseSongWithAlbumResponse] = (
            await _resolve_songs_from_ids_async(session=session, public_ids=all_ids)
        )

        def lookup(ids: List[str]) -> List[BaseSongWithAlbumResponse]:
            return [resolved[pid] for pid in ids if pid in resolved]

        def lookup_diverse(
            ids: List[str], section: str
        ) -> List[BaseSongWithAlbumResponse]:
            songs = lookup(ids)
            max_pa = MAX_PER_ARTIST.get(section, 2)
            return _apply_diversity(songs, max_pa)

        # --- Assemble response ---
        # Carousel reuses the same generated lists as the bento sections.
        # "Your Mix" serves as the wildcard carousel card.
        recent_diverse = lookup_diverse(recent_ids, "recently_played")
        monthly_diverse = lookup_diverse(monthly_ids, "most_listened")
        nostalgic_diverse = lookup_diverse(nostalgic_ids, "recent_mix")
        hidden_diverse = lookup_diverse(hidden_ids, "hidden_gems")
        your_mix_diverse = lookup_diverse(your_mix_ids, "your_mix")
        random_diverse = lookup_diverse(random_ids, "quick_selections")

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=HomeStatsResponse(
                songsByTimePlayed=recent_diverse,
                randomSongsLastMonth=random_diverse,
                nostalgicMix=nostalgic_diverse,
                hiddenGems=hidden_diverse,
                communityTop=[],
                monthlyTop=monthly_diverse,
                moodSongs=[],
                yourMix=your_mix_diverse,
                currentStreak=current_streak,
                minutesListenedThisWeek=minutes_this_week,
            ),
        )

    @staticmethod
    async def _media_ids_from_public_ids(
        session: AsyncSession,
        public_ids: list[str],
    ) -> list[int]:
        """Resolve public_ids to internal media_ids for impressions recording."""
        if not public_ids:
            return []

        a_medias: AResult[List[MediaModel]] = (
            await Media.get_medias_from_public_ids_async(
                session=session,
                public_ids=list(dict.fromkeys(public_ids)),
                media_type_keys=[MediaTypeEnum.SONG],
            )
        )
        if a_medias.is_not_ok() or not a_medias.result():
            return []

        return [m.id for m in a_medias.result()]

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
