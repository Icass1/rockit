from datetime import datetime, timedelta, timezone
from typing import Any

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
        pg_period = {
            "hour": "hour",
            "day": "day",
            "week": "week",
            "month": "month",
        }.get(group_by, "day")

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

        if group_by == "hour":
            cur = start.replace(hour=0, minute=0, second=0, microsecond=0)
            while cur < end:
                nxt = cur + timedelta(hours=1)
                entries.append(
                    StatsMinutesEntryResponse(
                        minutes=round(db_data.get(cur, 0.0), 1),
                        start=_utc(cur),
                        end=_utc(nxt),
                        label=f"{cur.hour:02d}:00",
                    )
                )
                cur = nxt

        elif group_by == "day":
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
        WITH {_get_artist_info_cte()},
        artist_plays AS (
            SELECT ai.artist_public_id,
                   ai.artist_name,
                   ai.artist_image_url,
                   COUNT(*) AS play_count
            FROM     core.user_media_listened uml
            JOIN     artist_info ai ON ai.media_id = uml.media_id
            WHERE    uml.user_id    = :user_id
              AND    uml.date_added >= :start_date
              AND    uml.date_added <  :end_date
            GROUP BY ai.artist_public_id, ai.artist_name, ai.artist_image_url
        )
        SELECT (ARRAY_AGG(ap.artist_public_id ORDER BY ap.play_count DESC))[1] AS public_id,
               ap.artist_name       AS name,
               (ARRAY_AGG(ap.artist_image_url ORDER BY ap.play_count DESC))[1] AS image_url,
               SUM(ap.play_count)   AS play_count
        FROM   artist_plays ap
        GROUP BY ap.artist_name
        ORDER BY play_count DESC
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
        WITH {_get_album_info_cte()},
        album_plays AS (
            SELECT ai.album_public_id,
                   ai.album_name,
                   ai.album_image_url,
                   COUNT(*) AS play_count
            FROM     core.user_media_listened uml
            JOIN     album_info ai ON ai.media_id = uml.media_id
            WHERE    uml.user_id    = :user_id
              AND    uml.date_added >= :start_date
              AND    uml.date_added <  :end_date
            GROUP BY ai.album_public_id, ai.album_name, ai.album_image_url
        )
        SELECT (ARRAY_AGG(ap.album_public_id ORDER BY ap.play_count DESC))[1] AS public_id,
               ap.album_name        AS name,
               (ARRAY_AGG(ap.album_image_url ORDER BY ap.play_count DESC))[1] AS image_url,
               SUM(ap.play_count)   AS play_count
        FROM   album_plays ap
        GROUP BY ap.album_name
        ORDER BY play_count DESC
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

    @staticmethod
    async def get_recently_played_songs_since_async(
        session: AsyncSession,
        user_id: int,
        since_date: datetime,
        limit: int = 500,
    ) -> AResult[list[str]]:
        """Get song public_ids played after since_date, ordered by most recent first."""

        sql = text(f"""
        WITH {_get_media_info_cte()}
        SELECT mi.public_id
        FROM   core.user_media_listened uml
        JOIN   media_info mi ON mi.media_id = uml.media_id
        WHERE  uml.user_id = :user_id
          AND  mi.media_type_key = {MediaTypeEnum.SONG.value}
          AND  uml.date_added >= :since_date
        GROUP BY mi.public_id
        ORDER BY MAX(uml.date_added) DESC
        LIMIT :limit
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "since_date": since_date.astimezone(timezone.utc),
                    "limit": limit,
                },
            )
        ).fetchall()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[str(r.public_id) for r in rows],
        )

    @staticmethod
    async def get_top_media_public_ids_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        limit: int = 50,
    ) -> AResult[list[str]]:
        """Get top songs and videos public_ids by play count."""

        limit_clause = f"LIMIT {limit}" if limit > 0 else ""

        sql = text(f"""
        WITH {_get_media_info_cte()},
        play_counts AS (
            SELECT uml.media_id, COUNT(*) AS play_count
            FROM   core.user_media_listened uml
            JOIN   media_info mi ON mi.media_id = uml.media_id
            WHERE  uml.user_id    = :user_id
              AND  uml.date_added >= :start_date
              AND  uml.date_added <  :end_date
              AND  mi.media_type_key IN ({MediaTypeEnum.SONG.value}, {MediaTypeEnum.VIDEO.value})
            GROUP BY uml.media_id
            ORDER BY play_count DESC
            {limit_clause}
        )
        SELECT mi.public_id
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
                },
            )
        ).fetchall()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[str(r.public_id) for r in rows],
        )

    @staticmethod
    async def get_recently_played_media_public_ids_async(
        session: AsyncSession,
        user_id: int,
        limit: int = 50,
    ) -> AResult[list[str]]:
        """Get recently played songs and videos public_ids ordered by date_added DESC."""

        sql = text(f"""
        WITH {_get_media_info_cte()}
        SELECT mi.public_id
        FROM   core.user_media_listened uml
        JOIN   media_info mi ON mi.media_id = uml.media_id
        WHERE  uml.user_id = :user_id
          AND  mi.media_type_key IN ({MediaTypeEnum.SONG.value}, {MediaTypeEnum.VIDEO.value})
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

    @staticmethod
    async def get_least_recently_played_songs_async(
        session: AsyncSession,
        user_id: int,
        limit: int = 12,
    ) -> AResult[list[str]]:
        """Get song public_ids ordered by oldest last-played date ASC."""

        sql = text(f"""
        WITH {_get_media_info_cte()}
        SELECT mi.public_id
        FROM   core.user_media_listened uml
        JOIN   media_info mi ON mi.media_id = uml.media_id
        WHERE  uml.user_id = :user_id
          AND  mi.media_type_key = {MediaTypeEnum.SONG.value}
        GROUP BY mi.public_id
        ORDER BY MAX(uml.date_added) ASC
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

    @staticmethod
    async def get_random_songs_last_month_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        limit: int = 30,
    ) -> AResult[list[str]]:
        """Get a random selection of songs listened to in the given date range."""

        sql = text(f"""
        WITH {_get_media_info_cte()}
        SELECT mi.public_id
        FROM   core.user_media_listened uml
        JOIN   media_info mi ON mi.media_id = uml.media_id
        WHERE  uml.user_id = :user_id
          AND  mi.media_type_key = {MediaTypeEnum.SONG.value}
          AND  uml.date_added >= :start_date
          AND  uml.date_added <  :end_date
        GROUP BY mi.public_id
        ORDER BY random()
        LIMIT :limit
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
            result=[str(r.public_id) for r in rows],
        )

    # --- Weighted sampling methods for home page ---

    @staticmethod
    def _impressed_clause(impressed_ids: list[int], column: str = "sc.media_id") -> str:
        """Build SQL NOT IN clause for impressed media_ids."""
        if not impressed_ids:
            return ""
        ids_str = ",".join(str(i) for i in impressed_ids)
        return f"AND {column} NOT IN ({ids_str})"

    @staticmethod
    async def get_weighted_most_listened_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        limit: int = 15,
        pool_multiplier: int = 4,
        impressed_ids: list[int] | None = None,
    ) -> AResult[list[str]]:
        """Weighted-sample most listened songs from the last 30 days.

        Score = log(1 + play_count) * avg_completion_ratio * (1 - skip_rate).
        Uses Efraimidis-Spirakis weighted reservoir sampling via POWER(random(), 1/score).
        """
        impressed = impressed_ids or []
        impressed_clause = StatsAccess._impressed_clause(impressed)
        pool_size = limit * pool_multiplier

        sql = text(f"""
        WITH {_get_media_info_cte()},
        play_counts AS (
            SELECT uml.media_id, COUNT(*) AS play_count
            FROM   core.user_media_listened uml
            JOIN   media_info mi ON mi.media_id = uml.media_id
            WHERE  uml.user_id    = :user_id
              AND  uml.date_added >= :start_date
              AND  uml.date_added <  :end_date
              AND  mi.media_type_key = {MediaTypeEnum.SONG.value}
            GROUP BY uml.media_id
        ),
        completion AS (
            SELECT umli.media_id,
                   AVG(CASE
                       WHEN mi.duration_ms > 0
                       THEN LEAST(
                           (umli.time_ms_end - umli.time_ms_start)::float
                           / mi.duration_ms, 1.0)
                       ELSE 1.0
                   END) AS avg_completion_ratio
            FROM   core.user_media_listen_interval umli
            JOIN   media_info mi ON mi.media_id = umli.media_id
            WHERE  umli.user_id    = :user_id
              AND  umli.date_added >= :start_date
              AND  umli.date_added <  :end_date
            GROUP BY umli.media_id
        ),
        skips AS (
            SELECT usm.media_id, COUNT(*) AS skip_count
            FROM   core.user_skipped_media usm
            WHERE  usm.user_id    = :user_id
              AND  usm.date_added >= :start_date
              AND  usm.date_added <  :end_date
            GROUP BY usm.media_id
        ),
        scored AS (
            SELECT pc.media_id,
                   LOG(1 + pc.play_count)
                       * COALESCE(c.avg_completion_ratio, 1.0)
                       * (1 - LEAST(
                           COALESCE(s.skip_count, 0)::float / GREATEST(pc.play_count, 1),
                           0.9
                         )) AS score
            FROM play_counts pc
            LEFT JOIN completion c ON c.media_id = pc.media_id
            LEFT JOIN skips s ON s.media_id = pc.media_id
        )
        SELECT mi.public_id,
               POWER(random(), 1.0 / GREATEST(sc.score, 0.001)) AS sample_key
        FROM   scored sc
        JOIN   media_info mi ON mi.media_id = sc.media_id
        WHERE  sc.score > 0
          {impressed_clause}
        ORDER BY sample_key DESC
        LIMIT :pool_size
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "start_date": start_date.astimezone(timezone.utc),
                    "end_date": end_date.astimezone(timezone.utc),
                    "pool_size": pool_size,
                },
            )
        ).fetchall()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[str(r.public_id) for r in rows],
        )

    @staticmethod
    async def get_weighted_recent_mix_async(
        session: AsyncSession,
        user_id: int,
        limit: int = 6,
        pool_multiplier: int = 5,
        impressed_ids: list[int] | None = None,
    ) -> AResult[list[str]]:
        """Weighted-sample forgotten favorites — tracks with the oldest last-play.

        Score = days_since_last_play * (1.5 if liked else 1.0).
        Only tracks played at least 2 times historically are candidates.
        """
        impressed = impressed_ids or []
        impressed_clause = StatsAccess._impressed_clause(impressed)
        pool_size = limit * pool_multiplier

        sql = text(f"""
        WITH {_get_media_info_cte()},
        last_play AS (
            SELECT uml.media_id,
                   MAX(uml.date_added) AS last_played,
                   COUNT(*)            AS total_plays
            FROM   core.user_media_listened uml
            JOIN   media_info mi ON mi.media_id = uml.media_id
            WHERE  uml.user_id = :user_id
              AND  mi.media_type_key = {MediaTypeEnum.SONG.value}
            GROUP BY uml.media_id
            HAVING COUNT(*) >= 2
        ),
        liked AS (
            SELECT ulm.media_id
            FROM   core.user_liked_media ulm
            WHERE  ulm.user_id = :user_id
        ),
        scored AS (
            SELECT lp.media_id,
                   EXTRACT(EPOCH FROM (NOW() - lp.last_played)) / 86400.0
                       * CASE WHEN lk.media_id IS NOT NULL THEN 1.5 ELSE 1.0 END
                       AS score
            FROM last_play lp
            LEFT JOIN liked lk ON lk.media_id = lp.media_id
        )
        SELECT mi.public_id,
               POWER(random(), 1.0 / GREATEST(sc.score, 0.001)) AS sample_key
        FROM   scored sc
        JOIN   media_info mi ON mi.media_id = sc.media_id
        WHERE  sc.score > 0
          {impressed_clause}
        ORDER BY sample_key DESC
        LIMIT :pool_size
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "pool_size": pool_size,
                },
            )
        ).fetchall()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[str(r.public_id) for r in rows],
        )

    @staticmethod
    async def get_weighted_quick_selections_async(
        session: AsyncSession,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
        limit: int = 36,
        pool_multiplier: int = 5,
        impressed_ids: list[int] | None = None,
    ) -> AResult[list[str]]:
        """Weighted-sample quick selections from last 30 days.

        Score = log(1 + play_count) * (1 / (days_since_last_play + 1)).
        Balanced frequency + recency, meant to feel like a broad shuffle.
        """
        impressed = impressed_ids or []
        impressed_clause = StatsAccess._impressed_clause(impressed)
        pool_size = limit * pool_multiplier

        sql = text(f"""
        WITH {_get_media_info_cte()},
        song_stats AS (
            SELECT uml.media_id,
                   COUNT(*)            AS play_count,
                   MAX(uml.date_added) AS last_played
            FROM   core.user_media_listened uml
            JOIN   media_info mi ON mi.media_id = uml.media_id
            WHERE  uml.user_id    = :user_id
              AND  uml.date_added >= :start_date
              AND  uml.date_added <  :end_date
              AND  mi.media_type_key = {MediaTypeEnum.SONG.value}
            GROUP BY uml.media_id
        ),
        scored AS (
            SELECT ss.media_id,
                   LOG(1 + ss.play_count)
                       * (1.0 / (EXTRACT(EPOCH FROM (NOW() - ss.last_played)) / 86400.0 + 1))
                       AS score
            FROM song_stats ss
        )
        SELECT mi.public_id,
               POWER(random(), 1.0 / GREATEST(sc.score, 0.001)) AS sample_key
        FROM   scored sc
        JOIN   media_info mi ON mi.media_id = sc.media_id
        WHERE  sc.score > 0
          {impressed_clause}
        ORDER BY sample_key DESC
        LIMIT :pool_size
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "start_date": start_date.astimezone(timezone.utc),
                    "end_date": end_date.astimezone(timezone.utc),
                    "pool_size": pool_size,
                },
            )
        ).fetchall()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[str(r.public_id) for r in rows],
        )

    @staticmethod
    async def get_weighted_recently_played_pool_async(
        session: AsyncSession,
        user_id: int,
        pool_size: int = 10,
        limit: int = 3,
        impressed_ids: list[int] | None = None,
    ) -> AResult[list[str]]:
        """Weighted-sample recently played songs.

        Slot 1 is handled as a fixed anchor (most recent play) in the framework layer.
        This method returns a weighted sample from the last 10 distinct tracks for slots 2+.
        Score = 1 / (hours_since_last_play + 1) — pure recency decay.
        """
        impressed = impressed_ids or []
        impressed_clause = StatsAccess._impressed_clause(impressed)

        sql = text(f"""
        WITH {_get_media_info_cte()},
        recent AS (
            SELECT uml.media_id,
                   MAX(uml.date_added) AS last_played
            FROM   core.user_media_listened uml
            JOIN   media_info mi ON mi.media_id = uml.media_id
            WHERE  uml.user_id = :user_id
              AND  mi.media_type_key = {MediaTypeEnum.SONG.value}
            GROUP BY uml.media_id
            ORDER BY last_played DESC
            LIMIT :pool_size
        ),
        scored AS (
            SELECT r.media_id,
                   1.0 / (EXTRACT(EPOCH FROM (NOW() - r.last_played)) / 3600.0 + 1) AS score
            FROM recent r
        )
        SELECT mi.public_id,
               POWER(random(), 1.0 / GREATEST(sc.score, 0.001)) AS sample_key
        FROM   scored sc
        JOIN   media_info mi ON mi.media_id = sc.media_id
        WHERE  sc.score > 0
          {impressed_clause}
        ORDER BY sample_key DESC
        LIMIT :limit
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "pool_size": pool_size,
                    "limit": limit,
                },
            )
        ).fetchall()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[str(r.public_id) for r in rows],
        )

    @staticmethod
    async def get_most_recent_play_async(
        session: AsyncSession,
        user_id: int,
    ) -> AResult[str | None]:
        """Get the single most recently played song public_id (anchor for Recently Played)."""

        sql = text(f"""
        WITH {_get_media_info_cte()}
        SELECT mi.public_id
        FROM   core.user_media_listened uml
        JOIN   media_info mi ON mi.media_id = uml.media_id
        WHERE  uml.user_id = :user_id
          AND  mi.media_type_key = {MediaTypeEnum.SONG.value}
        ORDER BY uml.date_added DESC
        LIMIT 1
        """)
        row = (await session.execute(sql, {"user_id": user_id})).fetchone()

        if row is None:
            return AResult(code=AResultCode.OK, message="OK", result=None)
        return AResult(code=AResultCode.OK, message="OK", result=str(row.public_id))

    @staticmethod
    async def get_weighted_hidden_gems_pool_async(
        session: AsyncSession,
        user_id: int,
        ninety_days_ago: datetime,
        limit: int = 3,
        pool_multiplier: int = 3,
        impressed_ids: list[int] | None = None,
    ) -> AResult[list[str]]:
        """Weighted-sample hidden gems — liked songs not played in 90 days.

        Score = days_since_last_play * (1 + total_historical_plays / 10).
        Favors gems that were played a reasonable number of times before being forgotten.
        """
        impressed = impressed_ids or []
        impressed_clause = StatsAccess._impressed_clause(impressed)
        pool_size = limit * pool_multiplier

        sql = text(f"""
        WITH {_get_media_info_cte()},
        liked AS (
            SELECT ulm.media_id, ulm.date_added AS liked_at
            FROM   core.user_liked_media ulm
            WHERE  ulm.user_id = :user_id
        ),
        recently_played AS (
            SELECT DISTINCT uml.media_id
            FROM   core.user_media_listened uml
            WHERE  uml.user_id    = :user_id
              AND  uml.date_added >= :ninety_days_ago
        ),
        historical_plays AS (
            SELECT uml.media_id, COUNT(*) AS total_plays
            FROM   core.user_media_listened uml
            WHERE  uml.user_id = :user_id
            GROUP BY uml.media_id
        ),
        candidates AS (
            SELECT lk.media_id,
                   EXTRACT(EPOCH FROM (NOW() - lk.liked_at)) / 86400.0 AS days_since_liked,
                   COALESCE(hp.total_plays, 0) AS total_plays
            FROM liked lk
            LEFT JOIN recently_played rp ON rp.media_id = lk.media_id
            LEFT JOIN historical_plays hp ON hp.media_id = lk.media_id
            WHERE rp.media_id IS NULL
        ),
        scored AS (
            SELECT c.media_id,
                   c.days_since_liked * (1 + c.total_plays / 10.0) AS score
            FROM candidates c
        )
        SELECT mi.public_id,
               POWER(random(), 1.0 / GREATEST(sc.score, 0.001)) AS sample_key
        FROM   scored sc
        JOIN   media_info mi ON mi.media_id = sc.media_id
        WHERE  sc.score > 0
          {impressed_clause}
        ORDER BY sample_key DESC
        LIMIT :pool_size
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "ninety_days_ago": ninety_days_ago.astimezone(timezone.utc),
                    "pool_size": pool_size,
                },
            )
        ).fetchall()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[str(r.public_id) for r in rows],
        )

    @staticmethod
    async def get_weighted_your_mix_async(
        session: AsyncSession,
        user_id: int,
        limit: int = 5,
        pool_multiplier: int = 10,
        impressed_ids: list[int] | None = None,
    ) -> AResult[list[str]]:
        """Weighted-sample from ALL tracks ever played — the wildcard card.

        Uniform weight (1) so this is close to true random, but still cooldown-excluded.
        Intentionally the least curated card.
        """
        impressed = impressed_ids or []
        impressed_clause = StatsAccess._impressed_clause(
            impressed, column="uml.media_id"
        )
        pool_size = limit * pool_multiplier

        sql = text(f"""
        WITH {_get_media_info_cte()}
        SELECT mi.public_id,
               POWER(random(), 1.0) AS sample_key
        FROM   core.user_media_listened uml
        JOIN   media_info mi ON mi.media_id = uml.media_id
        WHERE  uml.user_id = :user_id
          AND  mi.media_type_key = {MediaTypeEnum.SONG.value}
          {impressed_clause}
        GROUP BY mi.public_id
        ORDER BY sample_key DESC
        LIMIT :pool_size
        """)
        rows = (
            await session.execute(
                sql,
                {
                    "user_id": user_id,
                    "pool_size": pool_size,
                },
            )
        ).fetchall()

        return AResult(
            code=AResultCode.OK,
            message="OK",
            result=[str(r.public_id) for r in rows],
        )
