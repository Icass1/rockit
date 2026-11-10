"use client";

import { JSX, useId, useMemo } from "react";
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
import {
    useLanguage,
    useVocabulary,
} from "@/components/providers/VocabularyProvider";

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
    showYear,
}: {
    active?: boolean;
    payload?: { value: number; payload: StatsMinutesEntryResponse }[];
    label?: string;
    range?: string;
    showYear: boolean;
}): JSX.Element | null {
    const vocabulary = useVocabulary();
    const lang = useLanguage();

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
        label = start.toLocaleDateString(lang, {
            weekday: "long",
            ...(showYear
                ? { year: "numeric", month: "short", day: "numeric" }
                : {}),
        });
    } else {
        const startStr = start.toLocaleDateString(lang, {
            month: "short",
            day: "numeric",
            ...(showYear ? { year: "numeric" } : {}),
        });
        const endStr = new Date(end.getTime() - 1).toLocaleDateString(lang, {
            month: "short",
            day: "numeric",
            ...(showYear ? { year: "numeric" } : {}),
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
                    {vocabulary.MINUTES}
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
    const lang = useLanguage();
    const gradientId = useId();
    const monthly = _data.some((entry) =>
        /^(JANUARY|FEBRUARY|MARCH|APRIL|MAY|JUNE|JULY|AUGUST|SEPTEMBER|OCTOBER|NOVEMBER|DECEMBER)$/.test(
            entry.label
        )
    );
    const showYear =
        new Set(
            _data.flatMap((entry) => [
                new Date(entry.start).getFullYear(),
                new Date(new Date(entry.end).getTime() - 1).getFullYear(),
            ])
        ).size > 1;

    const data = useMemo(() => {
        return _data.map((entry) => {
            const isHourly = /^\d{2}:\d{2}$/.test(entry.label);
            if (isHourly) {
                return {
                    ...entry,
                    label: toLocalHHMM(entry.start),
                };
            }
            const label =
                range === "7d"
                    ? new Date(entry.start).toLocaleDateString(lang, {
                          weekday: "short",
                      })
                    : /^W\d+$/.test(entry.label)
                      ? new Date(entry.start).toLocaleDateString(lang, {
                            month: "short",
                            day: "numeric",
                        })
                      : ((monthly
                            ? new Date(entry.start).toLocaleDateString(lang, {
                                  month: "short",
                              })
                            : $vocabulary[
                                  entry.label as keyof typeof $vocabulary
                              ]) ??
                        new Date(entry.start).toLocaleDateString(lang, {
                            month: "short",
                            day: "numeric",
                        }));
            return {
                ...entry,
                label,
            };
        });
    }, [_data, $vocabulary, lang, range, monthly]);

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
        <div className="overflow-x-auto">
            <div style={{ minWidth: monthly ? data.length * 64 : undefined }}>
                <ResponsiveContainer width="100%" height={320}>
                    <BarChart
                        data={data}
                        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient
                                id={gradientId}
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
                            dataKey="start"
                            tickFormatter={(start: string) =>
                                data.find((entry) => entry.start === start)
                                    ?.label ?? ""
                            }
                            tick={{
                                fill: "var(--theme-foreground-strong)",
                                fontSize: 12,
                                fontWeight: 500,
                            }}
                            axisLine={false}
                            tickLine={false}
                            interval={monthly ? 0 : "preserveStartEnd"}
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
                            content={
                                <CustomTooltip
                                    range={range}
                                    showYear={showYear}
                                />
                            }
                            cursor={{
                                fill: "color-mix(in srgb, var(--theme-foreground-strong) 3%, transparent)",
                            }}
                        />
                        <Bar
                            dataKey="minutes"
                            fill={`url(#${gradientId})`}
                            radius={[6, 6, 0, 0]}
                            maxBarSize={64}
                            animationBegin={200}
                            animationDuration={800}
                            animationEasing="ease-out"
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
