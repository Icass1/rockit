"use client";

import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import type { MinutesEntry } from "@/components/Stats/mockStatsData";

function formatLabel(d: Date): string {
    return `${d.getDate()}/${d.getMonth() + 1}`;
}

interface ChartEntry {
    label: string;
    minutes: number;
    fullLabel: string;
}

interface TooltipProps {
    active?: boolean;
    payload?: { value: number; payload: ChartEntry }[];
    label?: string;
}

function CustomTooltip({ active, payload }: TooltipProps) {
    if (!active || !payload?.length) return null;
    const { value, payload: entry } = payload[0];
    return (
        <div className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 shadow-xl">
            <p className="text-xs text-neutral-400">{entry.fullLabel}</p>
            <p className="mt-0.5 text-sm font-bold text-white">
                {value}{" "}
                <span className="font-normal text-neutral-400">min</span>
            </p>
        </div>
    );
}

export default function MinutesBarChart({ data }: { data: MinutesEntry[] }) {
    const chartData: ChartEntry[] = data.map((d) => ({
        label: formatLabel(d.start),
        minutes: d.minutes,
        fullLabel: `${formatLabel(d.start)} – ${formatLabel(d.end)}`,
    }));

    const maxVal = Math.max(...data.map((d) => d.minutes));

    return (
        <ResponsiveContainer width="100%" height={220}>
            <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                barCategoryGap="30%"
            >
                <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#fb6467" />
                        <stop offset="100%" stopColor="#ee1086" />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    vertical={false}
                    stroke="#262626"
                    strokeDasharray="3 3"
                />
                <XAxis
                    dataKey="label"
                    tick={{ fill: "#737373", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                />
                <YAxis
                    tick={{ fill: "#737373", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickCount={5}
                />
                <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry) => (
                        <Cell
                            key={entry.label}
                            fill={
                                entry.minutes === maxVal
                                    ? "url(#barGrad)"
                                    : "rgba(238,16,134,0.45)"
                            }
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
