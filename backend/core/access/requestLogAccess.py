from logging import Logger
from typing import List

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.utils.logger import getLogger

from backend.core.utils.safeAsyncCall import safe_async

from backend.core.aResult import AResult, AResultCode

from backend.core.models.adminStats import (
    CodeDistribution,
    DailyStat,
    HourlyStat,
    LatencyPercentiles,
    MethodDistribution,
    RouteStat,
    TimeSeriesPoint,
    TopIp,
    UserActivity,
)

logger: Logger = getLogger(__name__)


class RequestLogAccess:
    @staticmethod
    @safe_async
    async def get_total_requests_async(
        session: AsyncSession,
    ) -> AResult[int]:
        result = await session.execute(text("SELECT COUNT(*) from core.request_log"))
        count = result.scalar() or 0
        return AResult(AResultCode.OK, "OK", int(count))

    @staticmethod
    @safe_async
    async def get_average_time_ms_async(
        session: AsyncSession,
    ) -> AResult[float]:
        result = await session.execute(
            text("SELECT COALESCE(AVG(time_taken_ms), 0) from core.request_log")
        )
        avg = float(result.scalar() or 0)
        return AResult(AResultCode.OK, "OK", round(avg, 2))

    @staticmethod
    @safe_async
    async def get_time_series_async(
        session: AsyncSession,
        group_by: str = "hour",
        limit: int = 168,
    ) -> AResult[List[TimeSeriesPoint]]:
        if group_by == "hour":
            query = text("""
                SELECT
                    to_char(date_trunc('hour', timestamp::timestamp), 'YYYY-MM-DD HH24:MI:SS') AS ts,
                    COUNT(*) AS count,
                    COALESCE(AVG(time_taken_ms), 0) AS avg_time
                from core.request_log
                GROUP BY date_trunc('hour', timestamp::timestamp)
                ORDER BY ts DESC
                LIMIT :limit
                """)
        elif group_by == "day":
            query = text("""
                SELECT
                    to_char(date_trunc('day', timestamp::timestamp), 'YYYY-MM-DD') AS ts,
                    COUNT(*) AS count,
                    COALESCE(AVG(time_taken_ms), 0) AS avg_time
                from core.request_log
                GROUP BY date_trunc('day', timestamp::timestamp)
                ORDER BY ts DESC
                LIMIT :limit
                """)
        else:
            query = text("""
                SELECT
                    to_char(date_trunc('month', timestamp::timestamp), 'YYYY-MM') AS ts,
                    COUNT(*) AS count,
                    COALESCE(AVG(time_taken_ms), 0) AS avg_time
                from core.request_log
                GROUP BY date_trunc('month', timestamp::timestamp)
                ORDER BY ts DESC
                LIMIT :limit
                """)

        result = await session.execute(query, {"limit": limit})
        rows = result.fetchall()
        return AResult(
            AResultCode.OK,
            "OK",
            [
                TimeSeriesPoint(
                    timestamp=row[0],
                    count=int(row[1]),
                    avgTimeMs=round(float(row[2]), 2),
                )
                for row in rows
            ],
        )

    @staticmethod
    @safe_async
    async def get_route_stats_async(
        session: AsyncSession,
        limit: int = 50,
    ) -> AResult[List[RouteStat]]:
        result = await session.execute(
            text("""
                SELECT
                    regexp_replace(route, '/[A-Za-z0-9-]{10,}', :replacement, 'g') AS normalized_route,
                    method,
                    COUNT(*) AS count,
                    COALESCE(AVG(time_taken_ms), 0) AS avg_time,
                    COALESCE(MIN(time_taken_ms), 0) AS min_time,
                    COALESCE(MAX(time_taken_ms), 0) AS max_time
                from core.request_log
                GROUP BY normalized_route, method
                ORDER BY count DESC
                LIMIT :limit
                """),
            {"limit": limit, "replacement": "/<id>"},
        )
        rows = result.fetchall()
        return AResult(
            AResultCode.OK,
            "OK",
            [
                RouteStat(
                    normalizedRoute=row[0],
                    method=row[1],
                    count=int(row[2]),
                    avgTimeMs=round(float(row[3]), 2),
                    minTimeMs=round(float(row[4]), 2),
                    maxTimeMs=round(float(row[5]), 2),
                )
                for row in rows
            ],
        )

    @staticmethod
    @safe_async
    async def get_top_ips_async(
        session: AsyncSession,
        limit: int = 20,
    ) -> AResult[List[TopIp]]:
        result = await session.execute(
            text("""
                SELECT ip, COUNT(*) AS count
                from core.request_log
                WHERE ip IS NOT NULL
                GROUP BY ip
                ORDER BY count DESC
                LIMIT :limit
                """),
            {"limit": limit},
        )
        rows = result.fetchall()
        return AResult(
            AResultCode.OK,
            "OK",
            [TopIp(ip=row[0], count=int(row[1])) for row in rows],
        )

    @staticmethod
    @safe_async
    async def get_code_distribution_async(
        session: AsyncSession,
    ) -> AResult[List[CodeDistribution]]:
        result = await session.execute(text("""
                SELECT response_code, COUNT(*) AS count
                from core.request_log
                GROUP BY response_code
                ORDER BY count DESC
                """))
        rows = result.fetchall()
        return AResult(
            AResultCode.OK,
            "OK",
            [CodeDistribution(code=int(row[0]), count=int(row[1])) for row in rows],
        )

    @staticmethod
    @safe_async
    async def get_method_distribution_async(
        session: AsyncSession,
    ) -> AResult[List[MethodDistribution]]:
        result = await session.execute(text("""
                SELECT
                    method,
                    COUNT(*) AS count,
                    COALESCE(AVG(time_taken_ms), 0) AS avg_time
                from core.request_log
                GROUP BY method
                ORDER BY count DESC
                """))
        rows = result.fetchall()
        return AResult(
            AResultCode.OK,
            "OK",
            [
                MethodDistribution(
                    method=row[0],
                    count=int(row[1]),
                    avgTimeMs=round(float(row[2]), 2),
                )
                for row in rows
            ],
        )

    @staticmethod
    @safe_async
    async def get_user_activity_async(
        session: AsyncSession,
        limit: int = 20,
    ) -> AResult[List[UserActivity]]:
        result = await session.execute(
            text("""
                SELECT
                    rl.user_id,
                    u.username,
                    COUNT(*) AS request_count,
                    COALESCE(AVG(rl.time_taken_ms), 0) AS avg_time
                from core.request_log rl
                LEFT JOIN core.user u ON rl.user_id = u.id
                WHERE rl.user_id IS NOT NULL
                GROUP BY rl.user_id, u.username
                ORDER BY request_count DESC
                LIMIT :limit
                """),
            {"limit": limit},
        )
        rows = result.fetchall()
        return AResult(
            AResultCode.OK,
            "OK",
            [
                UserActivity(
                    userId=int(row[0]) if row[0] else None,
                    username=row[1],
                    requestCount=int(row[2]),
                    avgTimeMs=round(float(row[3]), 2),
                )
                for row in rows
            ],
        )

    @staticmethod
    @safe_async
    async def get_hourly_stats_async(
        session: AsyncSession,
    ) -> AResult[List[HourlyStat]]:
        result = await session.execute(text("""
                SELECT
                    EXTRACT(HOUR FROM timestamp::timestamp)::int AS hour,
                    COUNT(*) AS count,
                    COALESCE(AVG(time_taken_ms), 0) AS avg_time
                from core.request_log
                GROUP BY EXTRACT(HOUR FROM timestamp::timestamp)::int
                ORDER BY hour
                """))
        rows = result.fetchall()
        return AResult(
            AResultCode.OK,
            "OK",
            [
                HourlyStat(
                    hour=int(row[0]),
                    count=int(row[1]),
                    avgTimeMs=round(float(row[2]), 2),
                )
                for row in rows
            ],
        )

    @staticmethod
    @safe_async
    async def get_daily_stats_async(
        session: AsyncSession,
        limit: int = 30,
    ) -> AResult[List[DailyStat]]:
        result = await session.execute(
            text("""
                SELECT
                    to_char(date_trunc('day', timestamp::timestamp), 'YYYY-MM-DD') AS date,
                    COUNT(*) AS count,
                    COALESCE(AVG(time_taken_ms), 0) AS avg_time
                from core.request_log
                GROUP BY date_trunc('day', timestamp::timestamp)
                ORDER BY date DESC
                LIMIT :limit
                """),
            {"limit": limit},
        )
        rows = result.fetchall()
        return AResult(
            AResultCode.OK,
            "OK",
            [
                DailyStat(
                    date=row[0],
                    count=int(row[1]),
                    avgTimeMs=round(float(row[2]), 2),
                )
                for row in rows
            ],
        )

    @staticmethod
    @safe_async
    async def get_latency_percentiles_async(
        session: AsyncSession,
    ) -> AResult[LatencyPercentiles]:
        result = await session.execute(text("""
                SELECT
                    COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY time_taken_ms), 0) AS p50,
                    COALESCE(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY time_taken_ms), 0) AS p90,
                    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY time_taken_ms), 0) AS p95,
                    COALESCE(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY time_taken_ms), 0) AS p99
                from core.request_log
                """))
        row = result.fetchone()
        p50 = row[0] if row else 0
        p90 = row[1] if row else 0
        p95 = row[2] if row else 0
        p99 = row[3] if row else 0
        return AResult(
            AResultCode.OK,
            "OK",
            LatencyPercentiles(
                p50Ms=int(p50),
                p90Ms=int(p90),
                p95Ms=int(p95),
                p99Ms=int(p99),
            ),
        )

    @staticmethod
    @safe_async
    async def get_average_requests_per_day_async(
        session: AsyncSession,
    ) -> AResult[float]:
        result = await session.execute(text("""
                SELECT
                    COALESCE(
                        COUNT(*)::float / NULLIF(COUNT(DISTINCT date_trunc('day', timestamp::timestamp)), 0),
                        0
                    )
                from core.request_log
                """))
        avg = float(result.scalar() or 0)
        return AResult(AResultCode.OK, "OK", round(avg, 2))
