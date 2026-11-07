"use client";

import { JSX } from "react";
import type { StatsV2SummaryResponse } from "@/dto";
import { Clock3, Flame, Headphones, Radio, Waves } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface SummaryCardsV2Props {
    summary: StatsV2SummaryResponse;
    rangeLabel: string;
}

function formatDuration(minutes: number): string {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = Math.round(minutes % 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

export default function SummaryCardsV2({
    summary,
    rangeLabel,
}: SummaryCardsV2Props): JSX.Element {
    const mediaMix = [
        {
            name: "Songs",
            value: summary.uniqueSongsListened,
            color: "var(--theme-primary)",
        },
        {
            name: "Videos",
            value: summary.uniqueVideosListened,
            color: "var(--theme-info)",
        },
    ];
    const facts = [
        {
            icon: Waves,
            label: "Listening sessions",
            value: summary.totalListenSessions.toLocaleString(),
        },
        {
            icon: Headphones,
            label: "Unique media",
            value: summary.uniqueMediasListened.toLocaleString(),
        },
        {
            icon: Clock3,
            label: "Average play",
            value: formatDuration(summary.avgPlayTimePerMediaMs / 60000),
        },
        {
            icon: Flame,
            label: "Current streak",
            value: `${summary.currentStreak} days`,
        },
    ];

    return (
        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="border-primary/20 bg-summary relative min-h-80 overflow-hidden rounded-[2rem] border p-7 md:p-10">
                <div className="border-primary/8 absolute -right-16 -bottom-24 h-72 w-72 rounded-full border-[48px]" />
                <p className="text-primary-soft text-xs font-semibold tracking-[0.25em] uppercase">
                    {rangeLabel}
                </p>
                <p className="text-foreground-strong mt-7 text-6xl font-black tracking-[-0.06em] md:text-8xl">
                    {formatDuration(summary.totalPlayTimeMinutes)}
                </p>
                <p className="text-muted-foreground mt-2 text-lg">
                    total listening time
                </p>
                <div className="text-muted-foreground mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                    <span>
                        <strong className="text-foreground-strong">
                            {Math.round(
                                summary.totalPlayTimeMinutes
                            ).toLocaleString()}
                        </strong>{" "}
                        minutes
                    </span>
                    <span>
                        <strong className="text-foreground-strong">
                            {summary.uniqueMediasListened.toLocaleString()}
                        </strong>{" "}
                        different plays
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="border-foreground-strong/7 bg-foreground-strong/3 col-span-2 flex min-h-40 items-center rounded-3xl border px-5">
                    <div className="h-36 w-36 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={mediaMix}
                                    dataKey="value"
                                    innerRadius={38}
                                    outerRadius={58}
                                    paddingAngle={4}
                                    stroke="none"
                                >
                                    {mediaMix.map((entry) => (
                                        <Cell
                                            key={entry.name}
                                            fill={entry.color}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        background: "var(--theme-secondary)",
                                        border: "1px solid var(--theme-border)",
                                        borderRadius: 12,
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div>
                        <Radio
                            size={18}
                            className="text-subtle-foreground mb-3"
                        />
                        <p className="text-foreground-strong text-sm font-bold">
                            Your media mix
                        </p>
                        <p className="text-subtle-foreground mt-2 text-xs">
                            <span className="text-primary-soft">●</span>{" "}
                            {summary.uniqueSongsListened} songs
                        </p>
                        <p className="text-subtle-foreground mt-1 text-xs">
                            <span className="text-info">●</span>{" "}
                            {summary.uniqueVideosListened} videos
                        </p>
                    </div>
                </div>
                {facts.map(({ icon: Icon, label, value }) => (
                    <div
                        key={label}
                        className="border-foreground-strong/7 bg-foreground-strong/3 rounded-2xl border p-4"
                    >
                        <Icon size={17} className="text-disabled-foreground" />
                        <p className="text-foreground-strong mt-5 text-xl font-bold">
                            {value}
                        </p>
                        <p className="text-disabled-foreground mt-1 text-[10px] font-semibold tracking-wider uppercase">
                            {label}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
