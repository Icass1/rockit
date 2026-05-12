from typing import List

from pydantic import BaseModel


class RequestLogTimeSeriesPoint(BaseModel):
    timestamp: str
    count: int
    avgTimeMs: float


class RequestLogRouteStats(BaseModel):
    normalizedRoute: str
    method: str
    count: int
    avgTimeMs: float
    minTimeMs: float
    maxTimeMs: float


class RequestLogTopIp(BaseModel):
    ip: str
    count: int


class RequestLogCodeDistribution(BaseModel):
    code: int
    count: int


class RequestLogMethodDistribution(BaseModel):
    method: str
    count: int
    avgTimeMs: float


class RequestLogUserActivity(BaseModel):
    userId: int | None
    username: str | None
    requestCount: int
    avgTimeMs: float


class RequestLogHourlyStats(BaseModel):
    hour: int
    count: int
    avgTimeMs: float


class RequestLogDailyStats(BaseModel):
    date: str
    count: int
    avgTimeMs: float


class RequestLogLatencyPercentiles(BaseModel):
    p50Ms: int
    p90Ms: int
    p95Ms: int
    p99Ms: int


class RequestLogStatsResponse(BaseModel):
    totalRequests: int
    timeSeries: List[RequestLogTimeSeriesPoint]
    routeStats: List[RequestLogRouteStats]
    topIps: List[RequestLogTopIp]
    codeDistribution: List[RequestLogCodeDistribution]
    methodDistribution: List[RequestLogMethodDistribution]
    userActivity: List[RequestLogUserActivity]
    hourlyStats: List[RequestLogHourlyStats]
    dailyStats: List[RequestLogDailyStats]
    latencyPercentiles: RequestLogLatencyPercentiles
    averageTimeMs: float
    averageRequestsPerDay: float
