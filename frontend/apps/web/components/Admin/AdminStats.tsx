"use client";

import { useEffect, useState } from "react";
import { type RequestLogStatsResponse } from "@/dto";
import { useStore } from "@nanostores/react";
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
import { rockIt } from "@/lib/rockit/rockIt";

const STATUS_COLORS: Record<string, string> = {
    "2": "#22c55e",
    "3": "#3b82f6",
    "4": "#eab308",
    "5": "#ef4444",
};

const PINK = "#ee1086";
const PINK_LIGHT = "#fb6467";
const NEUTRAL_600 = "#525252";
const NEUTRAL_500 = "#737373";
const NEUTRAL_700 = "#404040";

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

function StatCard({ icon, label, value, sub }: StatCardProps) {
    return (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-neutral-500">
                {icon}
                <span>{label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            {sub && (
                <div className="mt-0.5 text-xs text-neutral-600">{sub}</div>
            )}
        </div>
    );
}

interface SectionHeaderProps {
    title: string;
    icon: React.ReactNode;
}

function SectionHeader({ title, icon }: SectionHeaderProps) {
    return (
        <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ee1086]/10">
                {icon}
            </div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
    );
}

export default function AdminStats() {
    const [data, setData] = useState<RequestLogStatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    useEffect(() => {
        const fetchStats = async () => {
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
            <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 py-20">
                <Activity className="mb-4 h-12 w-12 text-neutral-600" />
                <p className="text-neutral-500">
                    {error || $vocabulary.ADMIN_NO_STATS}
                </p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 rounded-lg bg-[#ee1086] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#f53a76]"
                >
                    {$vocabulary.RETRY}
                </button>
            </div>
        );
    }

    const timeSeriesReversed = [...data.timeSeries].reverse();
    const routeStatsSorted = [...data.routeStats].sort(
        (a, b) => b.count - a.count
    );
    const routeTop = routeStatsSorted.slice(0, 15);
    const codeChartData = data.codeDistribution.map((c) => ({
        name: `${c.code}`,
        count: c.count,
        fill: STATUS_COLORS[String(c.code)[0]] || NEUTRAL_600,
    }));
    const methodChartData = data.methodDistribution.map((m) => ({
        name: m.method,
        count: m.count,
        avgTime: Math.round(m.avgTimeMs),
    }));
    const noData = data.dailyStats.length === 0;

    if (noData) {
        return (
            <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-800 bg-neutral-900 py-20">
                <BarChart3 className="mb-4 h-12 w-12 text-neutral-600" />
                <p className="text-neutral-500">
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
                    icon={<Activity className="h-4 w-4 text-[#ee1086]" />}
                />
                <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
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
                                        stopColor={PINK}
                                        stopOpacity={0.3}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor={PINK}
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                stroke={NEUTRAL_700}
                            />
                            <XAxis
                                dataKey="timestamp"
                                tick={{ fill: NEUTRAL_500, fontSize: 11 }}
                                tickFormatter={(v: string) => {
                                    const parts = v.split(" ");
                                    return parts.length > 1
                                        ? parts[1].substring(0, 5)
                                        : v.substring(5);
                                }}
                                stroke={NEUTRAL_700}
                            />
                            <YAxis
                                tick={{ fill: NEUTRAL_500, fontSize: 11 }}
                                stroke={NEUTRAL_700}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "#262626",
                                    border: "1px solid #404040",
                                    borderRadius: "8px",
                                    color: "#fff",
                                }}
                                labelFormatter={(label) => String(label)}
                            />
                            <Area
                                type="monotone"
                                dataKey="count"
                                stroke={PINK}
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
                        icon={<Clock className="h-4 w-4 text-[#ee1086]" />}
                    />
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                        <ResponsiveContainer width="100%" height={260}>
                            <LineChart data={timeSeriesReversed}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={NEUTRAL_700}
                                />
                                <XAxis
                                    dataKey="timestamp"
                                    tick={{
                                        fill: NEUTRAL_500,
                                        fontSize: 11,
                                    }}
                                    tickFormatter={(v: string) => {
                                        const parts = v.split(" ");
                                        return parts.length > 1
                                            ? parts[1].substring(0, 5)
                                            : v.substring(5);
                                    }}
                                    stroke={NEUTRAL_700}
                                />
                                <YAxis
                                    tick={{
                                        fill: NEUTRAL_500,
                                        fontSize: 11,
                                    }}
                                    stroke={NEUTRAL_700}
                                    tickFormatter={(v: number) => `${v}ms`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#262626",
                                        border: "1px solid #404040",
                                        borderRadius: "8px",
                                        color: "#fff",
                                    }}
                                    formatter={(value: unknown) => [
                                        `${Math.round(Number(value))}ms`,
                                        $vocabulary.ADMIN_AVG_TIME,
                                    ]}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="avgTimeMs"
                                    stroke={PINK_LIGHT}
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
                        icon={<BarChart3 className="h-4 w-4 text-[#ee1086]" />}
                    />
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={data.hourlyStats}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={NEUTRAL_700}
                                />
                                <XAxis
                                    dataKey="hour"
                                    tick={{
                                        fill: NEUTRAL_500,
                                        fontSize: 11,
                                    }}
                                    tickFormatter={(v: number) => `${v}h`}
                                    stroke={NEUTRAL_700}
                                />
                                <YAxis
                                    tick={{
                                        fill: NEUTRAL_500,
                                        fontSize: 11,
                                    }}
                                    stroke={NEUTRAL_700}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#262626",
                                        border: "1px solid #404040",
                                        borderRadius: "8px",
                                        color: "#fff",
                                    }}
                                    labelFormatter={(label: unknown) =>
                                        `${String(label)}:00`
                                    }
                                />
                                <Bar
                                    dataKey="count"
                                    fill={PINK}
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
                        icon={<Route className="h-4 w-4 text-[#ee1086]" />}
                    />
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={codeChartData} layout="vertical">
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={NEUTRAL_700}
                                />
                                <XAxis
                                    type="number"
                                    tick={{
                                        fill: NEUTRAL_500,
                                        fontSize: 11,
                                    }}
                                    stroke={NEUTRAL_700}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    tick={{
                                        fill: NEUTRAL_500,
                                        fontSize: 11,
                                    }}
                                    stroke={NEUTRAL_700}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#262626",
                                        border: "1px solid #404040",
                                        borderRadius: "8px",
                                        color: "#fff",
                                    }}
                                    formatter={(value: unknown) => [
                                        Number(value).toLocaleString(),
                                        $vocabulary.ADMIN_COUNT,
                                    ]}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                                    {codeChartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div>
                    <SectionHeader
                        title={$vocabulary.ADMIN_HTTP_METHODS}
                        icon={<Route className="h-4 w-4 text-[#ee1086]" />}
                    />
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={methodChartData}>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke={NEUTRAL_700}
                                />
                                <XAxis
                                    dataKey="name"
                                    tick={{
                                        fill: NEUTRAL_500,
                                        fontSize: 11,
                                    }}
                                    stroke={NEUTRAL_700}
                                />
                                <YAxis
                                    tick={{
                                        fill: NEUTRAL_500,
                                        fontSize: 11,
                                    }}
                                    stroke={NEUTRAL_700}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#262626",
                                        border: "1px solid #404040",
                                        borderRadius: "8px",
                                        color: "#fff",
                                    }}
                                />
                                <Bar
                                    dataKey="count"
                                    fill={PINK}
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
                    icon={<Route className="h-4 w-4 text-[#ee1086]" />}
                />
                <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-neutral-800 bg-neutral-950/50">
                                    <th className="px-4 py-3 font-medium text-neutral-400">
                                        {$vocabulary.ADMIN_ROUTE}
                                    </th>
                                    <th className="px-4 py-3 font-medium text-neutral-400">
                                        {$vocabulary.ADMIN_METHOD}
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-neutral-400">
                                        {$vocabulary.ADMIN_COUNT}
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-neutral-400">
                                        {$vocabulary.ADMIN_AVG_TIME}
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-neutral-400">
                                        {$vocabulary.ADMIN_MIN}
                                    </th>
                                    <th className="px-4 py-3 text-right font-medium text-neutral-400">
                                        {$vocabulary.ADMIN_MAX}
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {routeTop.map((r, i) => (
                                    <tr
                                        key={i}
                                        className="border-b border-neutral-800/50 transition hover:bg-neutral-800/30"
                                    >
                                        <td className="max-w-xs truncate px-4 py-3 font-mono text-xs text-white">
                                            {r.normalizedRoute}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-300">
                                                {r.method}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right text-white">
                                            {r.count.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right text-neutral-400">
                                            {formatMs(r.avgTimeMs)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-neutral-500">
                                            {formatMs(r.minTimeMs)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-neutral-500">
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
                        icon={<Users className="h-4 w-4 text-[#ee1086]" />}
                    />
                    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-800 bg-neutral-950/50">
                                        <th className="px-4 py-3 font-medium text-neutral-400">
                                            {$vocabulary.ADMIN_USER}
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium text-neutral-400">
                                            {$vocabulary.ADMIN_REQUESTS}
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium text-neutral-400">
                                            {$vocabulary.ADMIN_AVG_TIME}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.userActivity.map((u, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-neutral-800/50 transition hover:bg-neutral-800/30"
                                        >
                                            <td className="px-4 py-3 text-white">
                                                {u.username ||
                                                    $vocabulary.ADMIN_ANONYMOUS}
                                            </td>
                                            <td className="px-4 py-3 text-right text-white">
                                                {u.requestCount.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right text-neutral-400">
                                                {formatMs(u.avgTimeMs)}
                                            </td>
                                        </tr>
                                    ))}
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
                        icon={
                            <Fingerprint className="h-4 w-4 text-[#ee1086]" />
                        }
                    />
                    <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead>
                                    <tr className="border-b border-neutral-800 bg-neutral-950/50">
                                        <th className="px-4 py-3 font-medium text-neutral-400">
                                            {$vocabulary.ADMIN_IP}
                                        </th>
                                        <th className="px-4 py-3 text-right font-medium text-neutral-400">
                                            {$vocabulary.ADMIN_REQUESTS}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topIps.map((ip, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-neutral-800/50 transition hover:bg-neutral-800/30"
                                        >
                                            <td className="px-4 py-3 font-mono text-xs text-white">
                                                {ip.ip}
                                            </td>
                                            <td className="px-4 py-3 text-right text-white">
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
