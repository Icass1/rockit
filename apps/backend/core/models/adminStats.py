from dataclasses import dataclass
from ipaddress import IPv4Address


@dataclass
class TimeSeriesPoint:
    timestamp: str
    count: int
    avgTimeMs: float


@dataclass
class RouteStat:
    normalizedRoute: str
    method: str
    count: int
    avgTimeMs: float
    minTimeMs: float
    maxTimeMs: float


@dataclass
class TopIp:
    ip: IPv4Address
    count: int


@dataclass
class CodeDistribution:
    code: int
    count: int


@dataclass
class MethodDistribution:
    method: str
    count: int
    avgTimeMs: float


@dataclass
class UserActivity:
    userId: int | None
    username: str | None
    requestCount: int
    avgTimeMs: float


@dataclass
class HourlyStat:
    hour: int
    count: int
    avgTimeMs: float


@dataclass
class DailyStat:
    date: str
    count: int
    avgTimeMs: float


@dataclass
class LatencyPercentiles:
    p50Ms: int
    p90Ms: int
    p95Ms: int
    p99Ms: int
