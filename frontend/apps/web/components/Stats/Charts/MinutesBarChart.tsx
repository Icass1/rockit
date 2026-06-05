"use client";

import { JSX } from "react";
import type { StatsMinutesEntryResponse } from "@/dto";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

interface MinutesBarChartProps {
    data: StatsMinutesEntryResponse[];
    range?: string;
}

const PINK = "#ee1086";
const PINK_LIGHT = "#fb6467";
const NEUTRAL_700 = "#404040";

function CustomTooltip({
    active,
    payload,
    range,
}: {
    active?: boolean;
    payload?: { value: number; payload: StatsMinutesEntryResponse }[];
    label?: string;
    range?: string;
}): JSX.Element | null {
    if (!active || !payload || payload.length === 0) return null;

    const entry = payload[0].payload;
    const start = new Date(entry.start);
    const end = new Date(entry.end);

    const isDaily = range === "7d";
    const label = isDaily
        ? start.toLocaleDateString("en-US", { weekday: "long" })
        : `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

    return (
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/95 px-4 py-3 shadow-2xl backdrop-blur-md">
            <p className="whitespace-nowrap text-xs text-neutral-400">{label}</p>
            <p className="mt-0.5 whitespace-nowrap text-lg font-bold text-white">
                {payload[0].value.toFixed(1)}
                <span className="ml-1 text-sm font-medium text-neutral-400">
                    min
                </span>
            </p>
        </div>
    );
}

export default function MinutesBarChart({
    data,
    range = "30d",
}: MinutesBarChartProps): JSX.Element {
    if (data.length === 0) {
        return (
            <div className="flex h-[280px] items-center justify-center">
                <p className="text-sm text-neutral-600">No data available</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={320}>
            <BarChart
                data={data}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
            >
                <defs>
                    <linearGradient
                        id="barGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <stop
                            offset="0%"
                            stopColor={PINK_LIGHT}
                            stopOpacity={1}
                        />
                        <stop
                            offset="100%"
                            stopColor={PINK}
                            stopOpacity={0.85}
                        />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={NEUTRAL_700}
                    strokeOpacity={0.2}
                    vertical={false}
                />
                <XAxis
                    dataKey="label"
                    tick={{
                        fill: "#ffffff",
                        fontSize: 12,
                        fontWeight: 500,
                    }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    minTickGap={20}
                />
                <YAxis
                    tick={{
                        fill: "#ffffff",
                        fontSize: 12,
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                />
                <Tooltip
                    content={<CustomTooltip range={range} />}
                    cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <Bar
                    dataKey="minutes"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={64}
                    animationBegin={200}
                    animationDuration={800}
                    animationEasing="ease-out"
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
