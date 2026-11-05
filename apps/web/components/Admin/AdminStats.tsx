"use client";

import { JSX, useEffect, useState } from "react";
import { type RequestLogStatsResponse } from "@/dto";
import {
    Activity,
    BarChart3,
    Clock,
    Fingerprint,
    Globe,
    Route,
    TrendingUp,
    Users,
    Zap,
} from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { Http } from "@/lib/http";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

const STATUS_COLORS: Record<string, string> = {
    "2": "var(--theme-success)",
    "3": "var(--theme-info)",
    "4": "var(--theme-warning)",
    "5": "var(--theme-destructive)",
};

const PRIMARY = "var(--theme-primary)";
const BRAND_LIGHT = "var(--theme-brand-light)";
const AXIS_MUTED = "var(--theme-border-strong)";
const LABEL_MUTED = "var(--theme-subtle-foreground)";
const CHART_GRID = "var(--theme-border)";

function formatMs(ms: number): string {
    if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.round(ms)}ms`;
}

function formatNumber(n: number): string {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return n.toLocaleString();
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    sub?: string;
}

function StatCard({ icon, label, value, sub }: StatCardProps): JSX.Element {
    return (
        <div className="border-border-subtle bg-secondary rounded-xl border p-4">
            <div className="text-subtle-foreground mb-2 flex items-center gap-2 text-sm">
                {icon}
                <span>{label}</span>
            </div>
            <div className="text-foreground-strong text-2xl font-bold">
                {value}
            </div>
            {sub && (
                <div className="text-disabled-foreground mt-0.5 text-xs">
                    {sub}
                </div>
            )}
        </div>
    );
}

interface SectionHeaderProps {
    title: string;
    icon: React.ReactNode;
}

function SectionHeader({ title, icon }: SectionHeaderProps): JSX.Element {
    return (
        <div className="mb-4 flex items-center gap-2">
            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                {icon}
            </div>
            <h2 className="text-foreground-strong text-lg font-semibold">
                {title}
            </h2>
        </div>
    );
}

export default function AdminStats(): JSX.Element {
    const [data, setData] = useState<RequestLogStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const $vocabulary = useVocabulary();

    useEffect((): void => {
        const fetchStats = async (): Promise<void> => {
            setLoading(true);
            setError(null);
            const result = await Http.getRequestLogStats();
            if (result.isOk()) {
                setData(result.result);
            } else {
                const msg =
                    typeof result.detail === "string"
                        ? result.detail
                        : $vocabulary.ADMIN_FAILED_TO_LOAD_STATS;
                setError(msg);
            }
            setLoading(false);
        };
        fetchStats();
    }, [$vocabulary.ADMIN_FAILED_TO_LOAD_STATS]);

    if (loading) {
        return (
            <div className="space-y-4">
                <div className="skeleton h-32 w-full rounded-xl" />
                <div className="skeleton h-64 w-full rounded-xl" />
                <div className="skeleton h-64 w-full rounded-xl" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="border-border-subtle bg-secondary flex flex-col items-center justify-center rounded-xl border py-20">
                <Activity className="text-disabled-foreground mb-4 h-12 w-12" />
                <p className="text-subtle-foreground">
                    {error || $vocabulary.ADMIN_NO_STATS}
                </p>
                <button
                    onClick={(): void => window.location.reload()}
                    className="bg-primary text-primary-foreground hover:bg-brand-mid mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition"
                >
                    {$vocabulary.RETRY}
                </button>
            </div>
        );
    }

    const timeSeriesReversed = [...data.timeSeries].reverse();
    const routeStatsSorted = [...data.routeStats].sort(
        (a, b): number => b.count - a.count
    );
    const routeTop = routeStatsSorted.slice(0, 15);
    const codeChartData = data.codeDistribution.map(
        (c): { name: string; count: number; fill: string } => ({
            name: `${c.code}`,
            count: c.count,
            fill: STATUS_COLORS[String(c.code)[0]] || AXIS_MUTED,
        })
    );
    const methodChartData = data.methodDistribution.map(
        (m): { name: string; count: number; avgTime: number } => ({
            name: m.method,
            count: m.count,
            avgTime: Math.round(m.avgTimeMs),
        })
    );
    const noData = data.dailyStats.length === 0;

    if (noData) {
        return (
            <div className="border-border-subtle bg-secondary flex flex-col items-center justify-center rounded-xl border py-20">
                <BarChart3 className="text-disabled-foreground mb-4 h-12 w-12" />
                <p className="text-subtle-foreground">
                    {$vocabulary.ADMIN_NO_DATA_YET}{" "}
                    {$vocabulary.ADMIN_NO_DATA_DESC}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    icon={<Globe className="h-4 w-4" />}
                    label={$vocabulary.ADMIN_TOTAL_REQUESTS}
                    value={formatNumber(data.totalRequests)}
                    sub={`${data.averageRequestsPerDay.toFixed(1)} ${$vocabulary.ADMIN_REQ_PER_DAY}`}
                />
                <StatCard
                    icon={<Clock className="h-4 w-4" />}
                    label={$vocabulary.ADMIN_AVG_RESPONSE_TIME}
                    value={formatMs(data.averageTimeMs)}
                />
                <StatCard
                    icon={<Zap className="h-4 w-4" />}
                    label={$vocabulary.ADMIN_P95_LATENCY}
                    value={formatMs(data.latencyPercentiles.p95Ms)}
                    sub={`${$vocabulary.ADMIN_P99}: ${formatMs(data.latencyPercentiles.p99Ms)}`}
                />
                <StatCard
                    icon={<TrendingUp className="h-4 w-4" />}
                    label={$vocabulary.ADMIN_P50_P90}
                    value={`${formatMs(data.latencyPercentiles.p50Ms)} / ${formatMs(data.latencyPercentiles.p90Ms)}`}
                />
            </div>

            <div>
                <SectionHeader
                    title={$vocabulary.ADMIN_REQUESTS_OVER_TIME}
                    icon={<Activity className="text-primary h-4 w-4" />}
                />
                <div className="border-border-subtle bg-secondary rounded-xl border p-4">
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={timeSeriesReversed}>
                            <defs>
                                <linearGradient
                                    id="requestGradient"
                                    x1="0"
                                    y1="0"
                                    x2="0"
                                    y2="1"
                                >
                                    <stop
                                        offset="5%"
                                        stopColor={PRIMARY}
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={PRIMARY}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke={CHART_GRID}
                            />
                            <XAxis
                                dataKey="timestamp"
                                tick={{ fill: LABEL_MUTED, fontSize: 11 }}
                                tickFormatter={(v: string): string => {
                                    const parts = v.split(" ");
                                    return parts.length > 1
                                        ? parts[1].substring(0, 5)
                                        : v.substring(5);
                                }}
                                stroke={CHART_GRID}
                            />
                            <YAxis
                                tick={{ fill: LABEL_MUTED, fontSize: 11 }}
                                stroke={CHART_GRID}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor:
                                        "var(--theme-surface-raised)",
                                    border: "1px solid var(--theme-border)",
                                    borderRadius: "8px",
                                    color: "var(--theme-foreground-strong)",
                                }}
                                labelFormatter={(label): string =>
                                    String(label)
                                }
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke={PRIMARY}
                                fillOpacity={1}
                                fill="url(#requestGradient)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div>
                    <SectionHeader
                        title={$vocabulary.ADMIN_AVG_RESPONSE_TIME}
                        icon={<Clock className="text-primary h-4 w-4" />}
                    />
                    <div className="border-border-subtle bg-secondary rounded-xl border p-4">
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={timeSeriesReversed}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={CHART_GRID}
                                />
                                <XAxis
                                    dataKey="timestamp"
                                    tick={{
                                        fill: LABEL_MUTED,
                                        fontSize: 11,
                                    }}
                                    tickFormatter={(v: string): string => {
                                        const parts = v.split(" ");
                                        return parts.length > 1
                                            ? parts[1].substring(0, 5)
                                            : v.substring(5);
                                    }}
                                    stroke={CHART_GRID}
                                />
                                <YAxis
                                    tick={{
                                        fill: LABEL_MUTED,
                                        fontSize: 11,
                                    }}
                                    stroke={CHART_GRID}
                                    tickFormatter={(v: number): string =>
                                        `${v}ms`
                                    }
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor:
                                            "var(--theme-surface-raised)",
                                        border: "1px solid var(--theme-border)",
                                        borderRadius: "8px",
                                        color: "var(--theme-foreground-strong)",
                                    }}
                                    formatter={(
                                        value: unknown
                                    ): [string, string] => [
                                        `${Math.round(Number(value))}ms`,
                                        $vocabulary.ADMIN_AVG_TIME,
                                    ]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="avgTimeMs"
                                    stroke={BRAND_LIGHT}
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div>
                    <SectionHeader
                        title={$vocabulary.ADMIN_HOURLY_ACTIVITY}
                        icon={<BarChart3 className="text-primary h-4 w-4" />}
                    />
                    <div className="border-border-subtle bg-secondary rounded-xl border p-4">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={data.hourlyStats}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={CHART_GRID}
                                />
                                <XAxis
                                    dataKey="hour"
                                    tick={{
                                        fill: LABEL_MUTED,
                                        fontSize: 11,
                                    }}
                                    tickFormatter={(v: number): string =>
                                        `${v}h`
                                    }
                                    stroke={CHART_GRID}
                                />
                                <YAxis
                                    tick={{
                                        fill: LABEL_MUTED,
                                        fontSize: 11,
                                    }}
                                    stroke={CHART_GRID}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor:
                                            "var(--theme-surface-raised)",
                                        border: "1px solid var(--theme-border)",
                                        borderRadius: "8px",
                                        color: "var(--theme-foreground-strong)",
                                    }}
                                    labelFormatter={(label: unknown): string =>
                                        `${String(label)}:00`
                                    }
                                />
                                <Bar
                                    dataKey="count"
                                    fill={PRIMARY}
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <div>
                    <SectionHeader
                        title={$vocabulary.ADMIN_RESPONSE_CODES}
                        icon={<Route className="text-primary h-4 w-4" />}
                    />
                    <div className="border-border-subtle bg-secondary rounded-xl border p-4">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={codeChartData} layout="vertical">
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={CHART_GRID}
                                />
                                <XAxis
                                    type="number"
                                    tick={{
                                        fill: LABEL_MUTED,
                                        fontSize: 11,
                                    }}
                                    stroke={CHART_GRID}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{
                                        fill: LABEL_MUTED,
                                        fontSize: 11,
                                    }}
                                    stroke={CHART_GRID}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor:
                                            "var(--theme-surface-raised)",
                                        border: "1px solid var(--theme-border)",
                                        borderRadius: "8px",
                                        color: "var(--theme-foreground-strong)",
                                    }}
                                    formatter={(
                                        value: unknown
                                    ): [string, string] => [
                                        Number(value).toLocaleString(),
                                        $vocabulary.ADMIN_COUNT,
                                    ]}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {codeChartData.map(
                                        (entry, i): JSX.Element => (
                                            <Cell key={i} fill={entry.fill} />
                                        )
                                    )}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div>
                    <SectionHeader
                        title={$vocabulary.ADMIN_HTTP_METHODS}
                        icon={<Route className="text-primary h-4 w-4" />}
                    />
                    <div className="border-border-subtle bg-secondary rounded-xl border p-4">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={methodChartData}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={CHART_GRID}
                                />
                                <XAxis
                                    dataKey="name"
                                    tick={{
                                        fill: LABEL_MUTED,
                                        fontSize: 11,
                                    }}
                                    stroke={CHART_GRID}
                                />
                                <YAxis
                                    tick={{
                                        fill: LABEL_MUTED,
                                        fontSize: 11,
                                    }}
                                    stroke={CHART_GRID}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor:
                                            "var(--theme-surface-raised)",
                                        border: "1px solid var(--theme-border)",
                                        borderRadius: "8px",
                                        color: "var(--theme-foreground-strong)",
                                    }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill={PRIMARY}
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div>
                <SectionHeader
                    title={$vocabulary.ADMIN_TOP_ROUTES}
                    icon={<Route className="text-primary h-4 w-4" />}
                />
                <div className="border-border-subtle bg-secondary overflow-hidden rounded-xl border">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-border-subtle bg-background/50 border-b">
                                    <th className="text-muted-foreground px-4 py-3 font-medium">
                                        {$vocabulary.ADMIN_ROUTE}
                                    </th>
                                    <th className="text-muted-foreground px-4 py-3 font-medium">
                                        {$vocabulary.ADMIN_METHOD}
                                    </th>
                                    <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                                        {$vocabulary.ADMIN_COUNT}
                                    </th>
                                    <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                                        {$vocabulary.ADMIN_AVG_TIME}
                                    </th>
                                    <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                                        {$vocabulary.ADMIN_MIN}
                                    </th>
                                    <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                                        {$vocabulary.ADMIN_MAX}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {routeTop.map((r, i): JSX.Element => (
                                    <tr
                                        key={i}
                                        className="border-border-subtle/50 hover:bg-muted/30 border-b transition"
                                    >
                                        <td className="text-foreground-strong max-w-xs truncate px-4 py-3 font-mono text-xs">
                                            {r.normalizedRoute}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="bg-muted text-foreground rounded px-2 py-0.5 text-xs font-medium">
                                                {r.method}
                                            </span>
                                        </td>
                                        <td className="text-foreground-strong px-4 py-3 text-right">
                                            {r.count.toLocaleString()}
                                        </td>
                                        <td className="text-muted-foreground px-4 py-3 text-right">
                                            {formatMs(r.avgTimeMs)}
                                        </td>
                                        <td className="text-subtle-foreground px-4 py-3 text-right">
                                            {formatMs(r.minTimeMs)}
                                        </td>
                                        <td className="text-subtle-foreground px-4 py-3 text-right">
                                            {formatMs(r.maxTimeMs)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {data.userActivity.length > 0 && (
                <div>
                    <SectionHeader
                        title={$vocabulary.ADMIN_USER_ACTIVITY}
                        icon={<Users className="text-primary h-4 w-4" />}
                    />
                    <div className="border-border-subtle bg-secondary overflow-hidden rounded-xl border">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-border-subtle bg-background/50 border-b">
                                        <th className="text-muted-foreground px-4 py-3 font-medium">
                                            {$vocabulary.ADMIN_USER}
                                        </th>
                                        <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                                            {$vocabulary.ADMIN_REQUESTS}
                                        </th>
                                        <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                                            {$vocabulary.ADMIN_AVG_TIME}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.userActivity.map(
                                        (u, i): JSX.Element => (
                                            <tr
                                                key={i}
                                                className="border-border-subtle/50 hover:bg-muted/30 border-b transition"
                                            >
                                                <td className="text-foreground-strong px-4 py-3">
                                                    {u.username ||
                                                        $vocabulary.ADMIN_ANONYMOUS}
                                                </td>
                                                <td className="text-foreground-strong px-4 py-3 text-right">
                                                    {u.requestCount.toLocaleString()}
                                                </td>
                                                <td className="text-muted-foreground px-4 py-3 text-right">
                                                    {formatMs(u.avgTimeMs)}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {data.topIps.length > 0 && (
                <div>
                    <SectionHeader
                        title={$vocabulary.ADMIN_TOP_IPS}
                        icon={<Fingerprint className="text-primary h-4 w-4" />}
                    />
                    <div className="border-border-subtle bg-secondary overflow-hidden rounded-xl border">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-border-subtle bg-background/50 border-b">
                                        <th className="text-muted-foreground px-4 py-3 font-medium">
                                            {$vocabulary.ADMIN_IP}
                                        </th>
                                        <th className="text-muted-foreground px-4 py-3 text-right font-medium">
                                            {$vocabulary.ADMIN_REQUESTS}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topIps.map((ip, i): JSX.Element => (
                                        <tr
                                            key={i}
                                            className="border-border-subtle/50 hover:bg-muted/30 border-b transition"
                                        >
                                            <td className="text-foreground-strong px-4 py-3 font-mono text-xs">
                                                {ip.ip}
                                            </td>
                                            <td className="text-foreground-strong px-4 py-3 text-right">
                                                {ip.count.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
