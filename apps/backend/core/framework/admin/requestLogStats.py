from logging import Logger
from typing import List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.aResult import AResult, AResultCode
from backend.core.access.requestLogAccess import RequestLogAccess
from backend.core.responses.requestLogStatsResponse import (
    RequestLogStatsResponse,
    RequestLogTimeSeriesPoint,
    RequestLogRouteStats,
    RequestLogTopIp,
    RequestLogCodeDistribution,
    RequestLogMethodDistribution,
    RequestLogUserActivity,
    RequestLogHourlyStats,
    RequestLogDailyStats,
    RequestLogLatencyPercentiles,
)
from backend.utils.logger import getLogger
from backend.core.access.requestLogAccess import (
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


class RequestLogStats:
    @staticmethod
    async def get_stats_async(
        session: AsyncSession,
    ) -> AResult[RequestLogStatsResponse]:
        """Get comprehensive request log statistics."""

        a_result_total = await RequestLogAccess.get_total_requests_async(
            session=session
        )
        if a_result_total.is_not_ok():
            logger.error(f"Error getting total requests. {a_result_total.info()}")
            return AResult(code=a_result_total.code(), message=a_result_total.message())

        a_result_avg_time = await RequestLogAccess.get_average_time_ms_async(
            session=session
        )
        if a_result_avg_time.is_not_ok():
            logger.error(f"Error getting avg time. {a_result_avg_time.info()}")
            return AResult(
                code=a_result_avg_time.code(), message=a_result_avg_time.message()
            )

        a_result_series = await RequestLogAccess.get_time_series_async(
            session=session, group_by="hour", limit=168
        )
        if a_result_series.is_not_ok():
            logger.error(f"Error getting time series. {a_result_series.info()}")
            return AResult(
                code=a_result_series.code(), message=a_result_series.message()
            )

        a_result_routes = await RequestLogAccess.get_route_stats_async(
            session=session, limit=50
        )
        if a_result_routes.is_not_ok():
            logger.error(f"Error getting route stats. {a_result_routes.info()}")
            return AResult(
                code=a_result_routes.code(), message=a_result_routes.message()
            )

        a_result_ips = await RequestLogAccess.get_top_ips_async(
            session=session, limit=20
        )
        if a_result_ips.is_not_ok():
            logger.error(f"Error getting top IPs. {a_result_ips.info()}")
            return AResult(code=a_result_ips.code(), message=a_result_ips.message())

        a_result_codes = await RequestLogAccess.get_code_distribution_async(
            session=session
        )
        if a_result_codes.is_not_ok():
            logger.error(f"Error getting code distribution. {a_result_codes.info()}")
            return AResult(code=a_result_codes.code(), message=a_result_codes.message())

        a_result_methods = await RequestLogAccess.get_method_distribution_async(
            session=session
        )
        if a_result_methods.is_not_ok():
            logger.error(
                f"Error getting method distribution. {a_result_methods.info()}"
            )
            return AResult(
                code=a_result_methods.code(), message=a_result_methods.message()
            )

        a_result_users = await RequestLogAccess.get_user_activity_async(
            session=session, limit=20
        )
        if a_result_users.is_not_ok():
            logger.error(f"Error getting user activity. {a_result_users.info()}")
            return AResult(code=a_result_users.code(), message=a_result_users.message())

        a_result_hourly = await RequestLogAccess.get_hourly_stats_async(session=session)
        if a_result_hourly.is_not_ok():
            logger.error(f"Error getting hourly stats. {a_result_hourly.info()}")
            return AResult(
                code=a_result_hourly.code(), message=a_result_hourly.message()
            )

        a_result_daily = await RequestLogAccess.get_daily_stats_async(
            session=session, limit=30
        )
        if a_result_daily.is_not_ok():
            logger.error(f"Error getting daily stats. {a_result_daily.info()}")
            return AResult(code=a_result_daily.code(), message=a_result_daily.message())

        a_result_percentiles = await RequestLogAccess.get_latency_percentiles_async(
            session=session
        )
        if a_result_percentiles.is_not_ok():
            logger.error(f"Error getting percentiles. {a_result_percentiles.info()}")
            return AResult(
                code=a_result_percentiles.code(), message=a_result_percentiles.message()
            )

        a_result_avg_day = await RequestLogAccess.get_average_requests_per_day_async(
            session=session
        )
        if a_result_avg_day.is_not_ok():
            logger.error(
                f"Error getting avg requests per day. {a_result_avg_day.info()}"
            )
            return AResult(
                code=a_result_avg_day.code(), message=a_result_avg_day.message()
            )

        time_series_data: List[TimeSeriesPoint] = a_result_series.result()
        route_stats_data: List[RouteStat] = a_result_routes.result()
        top_ips_data: List[TopIp] = a_result_ips.result()
        code_dist_data: List[CodeDistribution] = a_result_codes.result()
        method_dist_data: List[MethodDistribution] = a_result_methods.result()
        user_activity_data: List[UserActivity] = a_result_users.result()
        hourly_stats_data: List[HourlyStat] = a_result_hourly.result()
        daily_stats_data: List[DailyStat] = a_result_daily.result()
        percentiles_data: LatencyPercentiles = a_result_percentiles.result()

        response = RequestLogStatsResponse(
            totalRequests=a_result_total.result(),
            timeSeries=[
                RequestLogTimeSeriesPoint(
                    timestamp=item.timestamp,
                    count=item.count,
                    avgTimeMs=item.avgTimeMs,
                )
                for item in time_series_data
            ],
            routeStats=[
                RequestLogRouteStats(
                    normalizedRoute=item.normalizedRoute,
                    method=item.method,
                    count=item.count,
                    avgTimeMs=item.avgTimeMs,
                    minTimeMs=item.minTimeMs,
                    maxTimeMs=item.maxTimeMs,
                )
                for item in route_stats_data
            ],
            topIps=[
                RequestLogTopIp(ip=str(item.ip), count=item.count)
                for item in top_ips_data
            ],
            codeDistribution=[
                RequestLogCodeDistribution(code=item.code, count=item.count)
                for item in code_dist_data
            ],
            methodDistribution=[
                RequestLogMethodDistribution(
                    method=item.method, count=item.count, avgTimeMs=item.avgTimeMs
                )
                for item in method_dist_data
            ],
            userActivity=[
                RequestLogUserActivity(
                    userId=item.userId,
                    username=item.username,
                    requestCount=item.requestCount,
                    avgTimeMs=item.avgTimeMs,
                )
                for item in user_activity_data
            ],
            hourlyStats=[
                RequestLogHourlyStats(
                    hour=item.hour, count=item.count, avgTimeMs=item.avgTimeMs
                )
                for item in hourly_stats_data
            ],
            dailyStats=[
                RequestLogDailyStats(
                    date=item.date, count=item.count, avgTimeMs=item.avgTimeMs
                )
                for item in daily_stats_data
            ],
            latencyPercentiles=RequestLogLatencyPercentiles(
                p50Ms=percentiles_data.p50Ms,
                p90Ms=percentiles_data.p90Ms,
                p95Ms=percentiles_data.p95Ms,
                p99Ms=percentiles_data.p99Ms,
            ),
            averageTimeMs=a_result_avg_time.result(),
            averageRequestsPerDay=a_result_avg_day.result(),
        )

        return AResult(code=AResultCode.OK, message="OK", result=response)
