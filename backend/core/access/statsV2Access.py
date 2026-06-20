from datetime import datetime, timedelta, timezone
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.responses.statsHeatmapCellResponse import StatsHeatmapCellResponse
from backend.core.responses.statsMinutesEntryResponse import StatsMinutesEntryResponse
from backend.core.responses.statsRankedItemResponse import StatsRankedItemResponse
from backend.core.utils.statsLabels import DAY_NAMES, MONTH_NAMES
from backend.utils.logger import getLogger

logger = getLogger(__name__)


HEATMAP_HOURS_START = 0
HEATMAP_HOURS_END = 24


def _build_cte(name: str, fragments: list[str]) -> str:
    """Wrap UNION ALL'd SELECT fragments in a named CTE."""
    return f"{name} AS (\n" + "\n\nUNION ALL\n\n".join(fragments) + "\n)"


def _empty_cte(name: str, columns: list[tuple[str, str]]) -> str:
    """Return a zero-row CTE with the correct column names and types."""
    cols = ", ".join(f"NULL::{t} AS {c}" for c, t in columns)
    return f"{name} AS (SELECT {cols} WHERE false)"


def _get_media_info_cte() -> str:
    from backend.core.framework import providers

    frags = [
        p.get_stats_media_info_cte_fragment() for p in providers.get_media_providers()
    ]
    frags = [f for f in frags if f]
    if not frags:
        return _empty_cte(
            "media_info",
            [
                ("media_id", "int"),
                ("duration_ms", "bigint"),
                ("public_id", "text"),
                ("media_name", "text"),
                ("image_url", "text"),
                ("media_type_key", "int"),
            ],
        )
    return _build_cte("media_info", frags)


def _get_artist_info_cte() -> str:
    from backend.core.framework import providers

    frags = [
        p.get_stats_artist_info_cte_fragment() for p in providers.get_media_providers()
    ]
    frags = [f for f in frags if f]
    if not frags:
        return _empty_cte(
            "artist_info",
            [
                ("media_id", "int"),
                ("artist_public_id", "text"),
                ("artist_name", "text"),
                ("artist_image_url", "text"),
            ],
        )
    return _build_cte("artist_info", frags)


def _get_album_info_cte() -> str:
    from backend.core.framework import providers

    frags = [
        p.get_stats_album_info_cte_fragment() for p in providers.get_media_providers()
    ]
    frags = [f for f in frags if f]
    if not frags:
        return _empty_cte(
            "album_info",
            [
                ("media_id", "int"),
                ("album_public_id", "text"),
                ("album_name", "text"),
                ("album_image_url", "text"),
            ],
        )
    return _build_cte("album_info", frags)


def _naive_utc(dt: datetime) -> datetime:
    """Strip tzinfo so comparisons with PostgreSQL naive timestamps work."""
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _utc(dt: datetime) -> datetime:
    """Attach UTC timezone to a naive datetime."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


@dataclass
class StatsV2SummaryData:
    unique_medias_listened: int
    unique_songs_listened: int
    unique_videos_listened: int
    total_sessions: int
    total_play_time_ms: int
    total_play_time_minutes: float
    avg_play_time_per_media_ms: float


class StatsV2Access:
    @staticmethod
    async def get_summary_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> AResult[StatsV2SummaryData]:
        sql = text(f"""
        WITH {_get_media_info_cte()},
        interval_listens AS (
            SELECT umli.media_id, cm.media_type_key,
                   (umli.time_ms_end - umli.time_ms_start) AS interval_ms
            FROM   core.user_media_listen_interval umli
            JOIN   core.media                       cm  ON cm.id = umli.media_id
            WHERE  umli.user_id    = :user_id
              AND  umli.date_added >= :start_date
              AND  umli.date_added <  :end_date
              AND  cm.media_type_key IN ({MediaTypeEnum.SONG.value}, {MediaTypeEnum.VIDEO.value})
        )
        SELECT
            COUNT(DISTINCT l.media_id)                                                        AS medias_listened,
            COUNT(DISTINCT l.media_id) FILTER (WHERE l.media_type_key = {MediaTypeEnum.SONG.value})  AS songs_listened,
            COUNT(DISTINCT l.media_id) FILTER (WHERE l.media_type_key = {MediaTypeEnum.VIDEO.value}) AS videos_listened,
            COUNT(*)                                                                           AS total_sessions,
            COALESCE(SUM(COALESCE(l.interval_ms, 0)), 0)::bigint                              AS total_play_time_ms,
            COALESCE(SUM(COALESCE(l.interval_ms, 0))::float / 60000.0, 0)                     AS total_play_time_minutes,
            CASE WHEN COUNT(DISTINCT l.media_id) > 0
                 THEN COALESCE(SUM(COALESCE(l.interval_ms, 0)), 0)::float / COUNT(DISTINCT l.media_id)
                 ELSE 0
            END                                                                               AS avg_play_time_per_media_ms
        FROM interval_listens l
        """)
        row = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "start_date": start_date.astimezone(timezone.utc),
                    "end_date": end_date.astimezone(timezone.utc),
                },
            )
        ).fetchone()

        if row is None:
            return AResult(
                code=AResultCode.OK,
                message="OK",
                result=StatsV2SummaryData(
                    unique_medias_listened=0,
                    unique_songs_listened=0,
                    unique_videos_listened=0,
                    total_sessions=0,
                    total_play_time_ms=0,
                    total_play_time_minutes=0.0,
                    avg_play_time_per_media_ms=0.0,
                ),
            )
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=StatsV2SummaryData(
                unique_medias_listened=int(row.medias_listened or 0),
                unique_songs_listened=int(row.songs_listened or 0),
                unique_videos_listened=int(row.videos_listened or 0),
                total_sessions=int(row.total_sessions or 0),
                total_play_time_ms=int(row.total_play_time_ms or 0),
                total_play_time_minutes=float(row.total_play_time_minutes or 0),
                avg_play_time_per_media_ms=float(row.avg_play_time_per_media_ms or 0),
            ),
        )

    @staticmethod
    async def get_minutes_by_period_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        group_by: str,
    ) -> AResult[list[StatsMinutesEntryResponse]]:
        pg_period = {"day": "day", "week": "week", "month": "month"}.get(
            group_by, "day"
        )

        sql = text(f"""
        WITH {_get_media_info_cte()},
        interval_listens AS (
            SELECT umli.media_id, umli.date_added,
                   (umli.time_ms_end - umli.time_ms_start) AS interval_ms
            FROM   core.user_media_listen_interval umli
            JOIN   core.media                       cm  ON cm.id = umli.media_id
            WHERE  umli.user_id    = :user_id
              AND  umli.date_added >= :start_date
              AND  umli.date_added <  :end_date
              AND  cm.media_type_key IN ({MediaTypeEnum.SONG.value}, {MediaTypeEnum.VIDEO.value})
        )
        SELECT DATE_TRUNC('{pg_period}', l.date_added AT TIME ZONE 'UTC') AS period_start,
               SUM(COALESCE(l.interval_ms, 0))::float / 60000.0 AS minutes
        FROM   interval_listens l
        GROUP BY period_start
        ORDER BY period_start
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "start_date": start_date.astimezone(timezone.utc),
                    "end_date": end_date.astimezone(timezone.utc),
                },
            )
        ).fetchall()

        db_data: dict[datetime, float] = {}
        for row in rows:
            key = row.period_start
            if hasattr(key, "tzinfo") and key.tzinfo is not None:
                key = key.replace(tzinfo=None)
            db_data[key] = float(row.minutes)

        entries: list[StatsMinutesEntryResponse] = []
        start = _naive_utc(start_date).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end = _naive_utc(end_date)

        if group_by == "day":
            cur = start
            while cur < end:
                nxt = cur + timedelta(days=1)
                entries.append(
                    StatsMinutesEntryResponse(
                        minutes=round(db_data.get(cur, 0.0), 1),
                        start=_utc(cur),
                        end=_utc(nxt),
                        label=DAY_NAMES[cur.weekday()],
                    )
                )
                cur = nxt

        elif group_by == "week":
            cur = start - timedelta(days=start.weekday())
            week_num = 1
            while cur < end:
                nxt = cur + timedelta(weeks=1)
                entries.append(
                    StatsMinutesEntryResponse(
                        minutes=round(db_data.get(cur, 0.0), 1),
                        start=_utc(cur),
                        end=_utc(nxt),
                        label=f"W{week_num}",
                    )
                )
                cur = nxt
                week_num += 1

        elif group_by == "month":
            cur = start.replace(day=1)
            while cur < end:
                nxt = cur.replace(
                    month=cur.month % 12 + 1,
                    year=cur.year + (1 if cur.month == 12 else 0),
                )
                entries.append(
                    StatsMinutesEntryResponse(
                        minutes=round(db_data.get(cur, 0.0), 1),
                        start=_utc(cur),
                        end=_utc(nxt),
                        label=MONTH_NAMES[cur.month - 1],
                    )
                )
                cur = nxt

        return AResult(code=AResultCode.OK, message="OK", result=entries)

    @staticmethod
    async def get_top_songs_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        limit: int = 3,
    ) -> AResult[list[StatsRankedItemResponse]]:
        sql = text(f"""
        WITH {_get_media_info_cte()},
        {_get_artist_info_cte()},
        listen_durations AS (
            SELECT umli.media_id,
                   SUM(umli.time_ms_end - umli.time_ms_start) AS total_ms
            FROM   core.user_media_listen_interval umli
            JOIN   media_info mi ON mi.media_id = umli.media_id
            WHERE  umli.user_id    = :user_id
              AND  umli.date_added >= :start_date
              AND  umli.date_added <  :end_date
              AND  mi.media_type_key = {MediaTypeEnum.SONG.value}
            GROUP BY umli.media_id
            ORDER BY total_ms DESC
            LIMIT :limit
        )
        SELECT mi.public_id,
               mi.media_name,
               mi.image_url,
               ld.total_ms,
               (SELECT ai.artist_name
                FROM   artist_info ai
                WHERE  ai.media_id = ld.media_id
                LIMIT  1)           AS subtitle
        FROM   listen_durations ld
        JOIN   media_info  mi ON mi.media_id = ld.media_id
        ORDER BY ld.total_ms DESC
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "start_date": start_date.astimezone(timezone.utc),
                    "end_date": end_date.astimezone(timezone.utc),
                    "limit": limit,
                },
            )
        ).fetchall()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[
                StatsRankedItemResponse(
                    publicId=r.public_id,
                    name=r.media_name,
                    href=f"/song/{r.public_id}",
                    value=int(r.total_ms),
                    imageUrl=r.image_url,
                    subtitle=r.subtitle,
                )
                for r in rows
            ],
        )

    @staticmethod
    async def get_top_videos_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        limit: int = 3,
    ) -> AResult[list[StatsRankedItemResponse]]:
        sql = text(f"""
        WITH {_get_media_info_cte()},
        {_get_artist_info_cte()},
        listen_durations AS (
            SELECT umli.media_id,
                   SUM(umli.time_ms_end - umli.time_ms_start) AS total_ms
            FROM   core.user_media_listen_interval umli
            JOIN   media_info mi ON mi.media_id = umli.media_id
            WHERE  umli.user_id    = :user_id
              AND  umli.date_added >= :start_date
              AND  umli.date_added <  :end_date
              AND  mi.media_type_key = {MediaTypeEnum.VIDEO.value}
            GROUP BY umli.media_id
            ORDER BY total_ms DESC
            LIMIT :limit
        )
        SELECT mi.public_id,
               mi.media_name,
               mi.image_url,
               ld.total_ms,
               (SELECT ai.artist_name
                FROM   artist_info ai
                WHERE  ai.media_id = ld.media_id
                LIMIT  1)           AS subtitle
        FROM   listen_durations ld
        JOIN   media_info  mi ON mi.media_id = ld.media_id
        ORDER BY ld.total_ms DESC
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "start_date": start_date.astimezone(timezone.utc),
                    "end_date": end_date.astimezone(timezone.utc),
                    "limit": limit,
                },
            )
        ).fetchall()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[
                StatsRankedItemResponse(
                    publicId=r.public_id,
                    name=r.media_name,
                    href=f"/video/{r.public_id}",
                    value=int(r.total_ms),
                    imageUrl=r.image_url,
                    subtitle=r.subtitle,
                )
                for r in rows
            ],
        )

    @staticmethod
    async def get_top_artists_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        limit: int = 3,
    ) -> AResult[list[StatsRankedItemResponse]]:
        sql = text(f"""
        WITH {_get_artist_info_cte()},
        artist_durations AS (
            SELECT ai.artist_public_id,
                   ai.artist_name,
                   ai.artist_image_url,
                   SUM(umli.time_ms_end - umli.time_ms_start) AS total_ms
            FROM     core.user_media_listen_interval umli
            JOIN     artist_info ai ON ai.media_id = umli.media_id
            WHERE    umli.user_id    = :user_id
              AND    umli.date_added >= :start_date
              AND    umli.date_added <  :end_date
            GROUP BY ai.artist_public_id, ai.artist_name, ai.artist_image_url
        )
        SELECT (ARRAY_AGG(ad.artist_public_id ORDER BY ad.total_ms DESC))[1] AS public_id,
               ad.artist_name       AS name,
               (ARRAY_AGG(ad.artist_image_url ORDER BY ad.total_ms DESC))[1] AS image_url,
               SUM(ad.total_ms)     AS total_ms
        FROM   artist_durations ad
        GROUP BY ad.artist_name
        ORDER BY total_ms DESC
        LIMIT  :limit
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "start_date": start_date.astimezone(timezone.utc),
                    "end_date": end_date.astimezone(timezone.utc),
                    "limit": limit,
                },
            )
        ).fetchall()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[
                StatsRankedItemResponse(
                    publicId=r.public_id,
                    name=r.name,
                    href=f"/artist/{r.public_id}",
                    value=int(r.total_ms),
                    imageUrl=r.image_url,
                    subtitle=None,
                )
                for r in rows
            ],
        )

    @staticmethod
    async def get_top_albums_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        limit: int = 3,
    ) -> AResult[list[StatsRankedItemResponse]]:
        sql = text(f"""
        WITH {_get_album_info_cte()},
        album_durations AS (
            SELECT ai.album_public_id,
                   ai.album_name,
                   ai.album_image_url,
                   SUM(umli.time_ms_end - umli.time_ms_start) AS total_ms
            FROM     core.user_media_listen_interval umli
            JOIN     album_info ai ON ai.media_id = umli.media_id
            WHERE    umli.user_id    = :user_id
              AND    umli.date_added >= :start_date
              AND    umli.date_added <  :end_date
            GROUP BY ai.album_public_id, ai.album_name, ai.album_image_url
        )
        SELECT (ARRAY_AGG(ad.album_public_id ORDER BY ad.total_ms DESC))[1] AS public_id,
               ad.album_name        AS name,
               (ARRAY_AGG(ad.album_image_url ORDER BY ad.total_ms DESC))[1] AS image_url,
               SUM(ad.total_ms)     AS total_ms
        FROM   album_durations ad
        GROUP BY ad.album_name
        ORDER BY total_ms DESC
        LIMIT  :limit
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "start_date": start_date.astimezone(timezone.utc),
                    "end_date": end_date.astimezone(timezone.utc),
                    "limit": limit,
                },
            )
        ).fetchall()
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[
                StatsRankedItemResponse(
                    publicId=r.public_id,
                    name=r.name,
                    href=f"/album/{r.public_id}",
                    value=int(r.total_ms),
                    imageUrl=r.image_url,
                    subtitle=None,
                )
                for r in rows
            ],
        )

    @staticmethod
    async def get_heatmap_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> AResult[list[StatsHeatmapCellResponse]]:
        sql = text("""
        SELECT EXTRACT(HOUR FROM umli.date_added)::int            AS hour,
               EXTRACT(DOW  FROM umli.date_added)::int            AS day_of_week,
               SUM(umli.time_ms_end - umli.time_ms_start)::float / 60000.0 AS minutes
        FROM   core.user_media_listen_interval umli
        WHERE  umli.user_id    = :user_id
          AND  umli.date_added >= :start_date
          AND  umli.date_added <  :end_date
        GROUP BY hour, day_of_week
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "start_date": start_date.astimezone(timezone.utc),
                    "end_date": end_date.astimezone(timezone.utc),
                },
            )
        ).fetchall()

        db_data = {(int(r.hour), int(r.day_of_week)): int(r.minutes) for r in rows}

        cells = [
            StatsHeatmapCellResponse(
                hour=hour,
                day=day,
                value=db_data.get((hour, day), 0),
            )
            for day in range(7)
            for hour in range(HEATMAP_HOURS_START, HEATMAP_HOURS_END + 1)
        ]
        return AResult(code=AResultCode.OK, message="OK", result=cells)

    @staticmethod
    async def get_first_listen_date_async(
        session: AsyncSession,
        user_id: int,
    ) -> AResult[datetime | None]:
        sql = text("""
        SELECT MIN(date_added) AS first_date
        FROM   core.user_media_listen_interval
        WHERE  user_id = :user_id
        """)
        row = (await session.execute(sql, {"user_id": user_id})).fetchone()
        if row is None or row.first_date is None:
            return AResult(code=AResultCode.OK, message="OK", result=None)
        return AResult(code=AResultCode.OK, message="OK", result=_utc(row.first_date))

    @staticmethod
    async def get_current_streak_async(
        session: AsyncSession,
        user_id: int,
    ) -> AResult[int]:
        sql = text("""
        SELECT DISTINCT DATE(date_added) AS listen_date
        FROM   core.user_media_listen_interval
        WHERE  user_id = :user_id
        ORDER BY listen_date DESC
        """)
        rows = (await session.execute(sql, {"user_id": user_id})).fetchall()
        dates = [r.listen_date for r in rows]

        if not dates:
            return AResult(code=AResultCode.OK, message="OK", result=0)

        today = datetime.now(timezone.utc).date()
        yesterday = today - timedelta(days=1)

        if dates[0] < yesterday:
            return AResult(code=AResultCode.OK, message="OK", result=0)

        streak = 0
        expected = dates[0]
        for d in dates:
            if d == expected:
                streak += 1
                expected = d - timedelta(days=1)
            else:
                break

        return AResult(code=AResultCode.OK, message="OK", result=streak)
