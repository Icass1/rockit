from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.enums.mediaTypeEnum import MediaTypeEnum
from backend.core.responses.statsHeatmapCellResponse import StatsHeatmapCellResponse
from backend.core.responses.statsMinutesEntryResponse import StatsMinutesEntryResponse
from backend.core.responses.statsRankedItemResponse import StatsRankedItemResponse
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


class StatsAccess:
    @staticmethod
    async def get_summary_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> AResult[dict[str, Any]]:
        sql = text(f"""
        WITH {_get_media_info_cte()},
        listens AS (
            SELECT uml.media_id, cm.media_type_key
            FROM   core.user_media_listened uml
            JOIN   core.media               cm  ON cm.id = uml.media_id
            WHERE  uml.user_id    = :user_id
              AND  uml.date_added >= :start_date
              AND  uml.date_added <  :end_date
              AND  cm.media_type_key IN ({MediaTypeEnum.SONG.value}, {MediaTypeEnum.VIDEO.value})
        )
        SELECT
            COUNT(*)                                                        AS medias_listened,
            COUNT(*) FILTER (WHERE l.media_type_key = {MediaTypeEnum.SONG.value})  AS songs_listened,
            COUNT(*) FILTER (WHERE l.media_type_key = {MediaTypeEnum.VIDEO.value}) AS videos_listened,
            COALESCE(SUM(COALESCE(mi.duration_ms, 0))::float / 60000.0, 0) AS total_minutes,
            CASE WHEN COUNT(*) > 0
                 THEN SUM(COALESCE(mi.duration_ms, 0))::float / 60000.0 / COUNT(*)
                 ELSE 0
            END                                                             AS avg_minutes
        FROM listens l
        LEFT JOIN media_info mi ON mi.media_id = l.media_id
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
                result={
                    "medias_listened": 0,
                    "songs_listened": 0,
                    "videos_listened": 0,
                    "total_minutes": 0.0,
                    "avg_minutes": 0.0,
                },
            )
        return AResult(
            code=AResultCode.OK,
            message="OK",
            result={
                "medias_listened": int(row.medias_listened or 0),
                "songs_listened": int(row.songs_listened or 0),
                "videos_listened": int(row.videos_listened or 0),
                "total_minutes": float(row.total_minutes or 0),
                "avg_minutes": float(row.avg_minutes or 0),
            },
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
        listens AS (
            SELECT uml.media_id, uml.date_added
            FROM   core.user_media_listened uml
            JOIN   core.media               cm  ON cm.id = uml.media_id
            WHERE  uml.user_id    = :user_id
              AND  uml.date_added >= :start_date
              AND  uml.date_added <  :end_date
              AND  cm.media_type_key IN ({MediaTypeEnum.SONG.value}, {MediaTypeEnum.VIDEO.value})
        )
        SELECT DATE_TRUNC('{pg_period}', l.date_added AT TIME ZONE 'UTC') AS period_start,
               SUM(COALESCE(mi.duration_ms, 0))::float / 60000.0 AS minutes
        FROM   listens l
        LEFT JOIN media_info mi ON mi.media_id = l.media_id
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
            day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            cur = start
            while cur < end:
                nxt = cur + timedelta(days=1)
                entries.append(
                    StatsMinutesEntryResponse(
                        minutes=round(db_data.get(cur, 0.0), 1),
                        start=_utc(cur),
                        end=_utc(nxt),
                        label=day_names[cur.weekday()],
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
            month_names = [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ]
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
                        label=month_names[cur.month - 1],
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
        play_counts AS (
            SELECT uml.media_id, COUNT(*) AS play_count
            FROM   core.user_media_listened uml
            JOIN   media_info mi ON mi.media_id = uml.media_id
            WHERE  uml.user_id    = :user_id
              AND  uml.date_added >= :start_date
              AND  uml.date_added <  :end_date
              AND  mi.media_type_key = {MediaTypeEnum.SONG.value}
            GROUP BY uml.media_id
            ORDER BY play_count DESC
            LIMIT :limit
        )
        SELECT mi.public_id,
               mi.media_name,
               mi.image_url,
               pc.play_count,
               (SELECT ai.artist_name
                FROM   artist_info ai
                WHERE  ai.media_id = pc.media_id
                LIMIT  1)           AS subtitle
        FROM   play_counts pc
        JOIN   media_info  mi ON mi.media_id = pc.media_id
        ORDER BY pc.play_count DESC
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
                    value=int(r.play_count),
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
        play_counts AS (
            SELECT uml.media_id, COUNT(*) AS play_count
            FROM   core.user_media_listened uml
            JOIN   media_info mi ON mi.media_id = uml.media_id
            WHERE  uml.user_id    = :user_id
              AND  uml.date_added >= :start_date
              AND  uml.date_added <  :end_date
              AND  mi.media_type_key = {MediaTypeEnum.VIDEO.value}
            GROUP BY uml.media_id
            ORDER BY play_count DESC
            LIMIT :limit
        )
        SELECT mi.public_id,
               mi.media_name,
               mi.image_url,
               pc.play_count,
               (SELECT ai.artist_name
                FROM   artist_info ai
                WHERE  ai.media_id = pc.media_id
                LIMIT  1)           AS subtitle
        FROM   play_counts pc
        JOIN   media_info  mi ON mi.media_id = pc.media_id
        ORDER BY pc.play_count DESC
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
                    value=int(r.play_count),
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
        WITH {_get_artist_info_cte()}
        SELECT   ai.artist_public_id  AS public_id,
                 ai.artist_name       AS name,
                 ai.artist_image_url  AS image_url,
                 COUNT(*)             AS play_count
        FROM     core.user_media_listened uml
        JOIN     artist_info ai ON ai.media_id = uml.media_id
        WHERE    uml.user_id    = :user_id
          AND    uml.date_added >= :start_date
          AND    uml.date_added <  :end_date
        GROUP BY ai.artist_public_id, ai.artist_name, ai.artist_image_url
        ORDER BY play_count DESC
        LIMIT    :limit
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
                    value=int(r.play_count),
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
        WITH {_get_album_info_cte()}
        SELECT   ai.album_public_id  AS public_id,
                 ai.album_name       AS name,
                 ai.album_image_url  AS image_url,
                 COUNT(*)            AS play_count
        FROM     core.user_media_listened uml
        JOIN     album_info ai ON ai.media_id = uml.media_id
        WHERE    uml.user_id    = :user_id
          AND    uml.date_added >= :start_date
          AND    uml.date_added <  :end_date
        GROUP BY ai.album_public_id, ai.album_name, ai.album_image_url
        ORDER BY play_count DESC
        LIMIT    :limit
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
                    value=int(r.play_count),
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
        sql = text(f"""
        WITH {_get_media_info_cte()}
        SELECT EXTRACT(HOUR FROM uml.date_added)::int            AS hour,
               EXTRACT(DOW  FROM uml.date_added)::int            AS day_of_week,
               SUM(COALESCE(mi.duration_ms, 0))::float / 60000.0 AS minutes
        FROM   core.user_media_listened uml
        LEFT JOIN media_info mi ON mi.media_id = uml.media_id
        WHERE  uml.user_id    = :user_id
          AND  uml.date_added >= :start_date
          AND  uml.date_added <  :end_date
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
    @staticmethod
    async def get_first_listen_date_async(
        session: AsyncSession,
        user_id: int,
    ) -> AResult[datetime | None]:
        sql = text("""
        SELECT MIN(date_added) AS first_date
        FROM   core.user_media_listened
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
        FROM   core.user_media_listened
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

    @staticmethod
    async def get_recently_played_songs_async(
        session: AsyncSession,
        user_id: int,
        limit: int = 50,
    ) -> AResult[list[str]]:
        """Get recently played song public_ids ordered by date_added DESC."""

        sql = text(f"""
        WITH {_get_media_info_cte()}
        SELECT mi.public_id
        FROM   core.user_media_listened uml
        JOIN   media_info mi ON mi.media_id = uml.media_id
        WHERE  uml.user_id = :user_id
          AND  mi.media_type_key = {MediaTypeEnum.SONG.value}
        GROUP BY mi.public_id
        ORDER BY MAX(uml.date_added) DESC
        LIMIT :limit
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "limit": limit,
                },
            )
        ).fetchall()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[str(r.public_id) for r in rows],
        )
