"use client";

import { JSX, useMemo } from "react";
import type { StatsMinutesEntryResponse } from "@/dto";
import { toLocalHHMM } from "@rockit/shared";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

interface MinutesBarChartProps {
    data: StatsMinutesEntryResponse[];
    range?: string;
}

const PRIMARY = "var(--theme-primary)";
const BRAND_LIGHT = "var(--theme-brand-light)";
const CHART_GRID = "var(--theme-border)";

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

    const isHourly = /^\d{2}:\d{2}$/.test(entry.label);
    const isDaily = range === "7d";
    let label: string;
    if (isHourly) {
        label = `${toLocalHHMM(entry.start)} — ${toLocalHHMM(entry.end)}`;
    } else if (isDaily) {
        label = start.toLocaleDateString("en-US", { weekday: "long" });
    } else {
        const startStr = start.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
        const endStr = end.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
        label = startStr === endStr ? startStr : `${startStr} — ${endStr}`;
    }

    return (
        <div className="border-border-subtle/60 bg-secondary/95 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-md">
            <p className="text-muted-foreground text-xs whitespace-nowrap">
                {label}
            </p>
            <p className="text-foreground-strong mt-0.5 text-lg font-bold whitespace-nowrap">
                {payload[0].value.toFixed(1)}
                <span className="text-muted-foreground ml-1 text-sm font-medium">
                    min
                </span>
            </p>
        </div>
    );
}

export default function MinutesBarChart({
    data: _data,
    range = "30d",
}: MinutesBarChartProps): JSX.Element {
    const $vocabulary = useVocabulary();

    const data = useMemo(() => {
        return _data.map((entry) => {
            const isHourly = /^\d{2}:\d{2}$/.test(entry.label);
            if (isHourly) {
                return {
                    ...entry,
                    label: toLocalHHMM(entry.start),
                };
            }
            return {
                ...entry,
                label: $vocabulary[entry.label as keyof typeof $vocabulary],
            };
        });
    }, [_data, $vocabulary]);

    if (data.length === 0) {
        return (
            <div className="flex h-70 items-center justify-center">
                <p className="text-disabled-foreground text-sm">
                    {$vocabulary.NO_DATA}
                </p>
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
                            stopColor={BRAND_LIGHT}
                            stopOpacity={1}
                        />
                        <stop
                            offset="100%"
                            stopColor={PRIMARY}
                            stopOpacity={0.85}
                        />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_GRID}
                    strokeOpacity={0.2}
                    vertical={false}
                />
                <XAxis
                    dataKey="label"
                    tick={{
                        fill: "var(--theme-foreground-strong)",
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
                        fill: "var(--theme-foreground-strong)",
                        fontSize: 12,
                    }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                />
                <Tooltip
                    content={<CustomTooltip range={range} />}
                    cursor={{
                        fill: "color-mix(in srgb, var(--theme-foreground-strong) 3%, transparent)",
                    }}
                />
                <Bar
                    dataKey="minutes"
                    fill="url(#barGradient)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={64}
                    animationBegin={200}
                    animationDuration={800}
                    animationEasing="ease-out"
                    shape={(props: unknown) => {
                        const { value } = props as { value: number };
                        if (value <= 0) return null;
                        return (
                            <rect
                                {...(props as Record<string, unknown>)}
                                rx={6}
                                ry={6}
                            />
                        );
                    }}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
