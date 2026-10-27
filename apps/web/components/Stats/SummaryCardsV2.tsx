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
        { name: "Songs", value: summary.uniqueSongsListened, color: "#ee1086" },
        {
            name: "Videos",
            value: summary.uniqueVideosListened,
            color: "#38bdf8",
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
            <div className="relative min-h-80 overflow-hidden rounded-[2rem] border border-fuchsia-500/20 bg-[radial-gradient(circle_at_15%_20%,rgba(238,16,134,0.32),transparent_38%),linear-gradient(135deg,#171014,#080808)] p-7 md:p-10">
                <div className="absolute -right-16 -bottom-24 h-72 w-72 rounded-full border-[48px] border-fuchsia-500/8" />
                <p className="text-xs font-semibold tracking-[0.25em] text-fuchsia-300 uppercase">
                    {rangeLabel}
                </p>
                <p className="mt-7 text-6xl font-black tracking-[-0.06em] text-white md:text-8xl">
                    {formatDuration(summary.totalPlayTimeMinutes)}
                </p>
                <p className="mt-2 text-lg text-neutral-400">
                    total listening time
                </p>
                <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-neutral-400">
                    <span>
                        <strong className="text-white">
                            {Math.round(
                                summary.totalPlayTimeMinutes
                            ).toLocaleString()}
                        </strong>{" "}
                        minutes
                    </span>
                    <span>
                        <strong className="text-white">
                            {summary.uniqueMediasListened.toLocaleString()}
                        </strong>{" "}
                        different plays
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 flex min-h-40 items-center rounded-3xl border border-white/7 bg-white/3 px-5">
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
                                        background: "#171717",
                                        border: "1px solid #333",
                                        borderRadius: 12,
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div>
                        <Radio size={18} className="mb-3 text-neutral-500" />
                        <p className="text-sm font-bold text-white">
                            Your media mix
                        </p>
                        <p className="mt-2 text-xs text-neutral-500">
                            <span className="text-fuchsia-400">●</span>{" "}
                            {summary.uniqueSongsListened} songs
                        </p>
                        <p className="mt-1 text-xs text-neutral-500">
                            <span className="text-sky-400">●</span>{" "}
                            {summary.uniqueVideosListened} videos
                        </p>
                    </div>
                </div>
                {facts.map(({ icon: Icon, label, value }) => (
                    <div
                        key={label}
                        className="rounded-2xl border border-white/7 bg-white/3 p-4"
                    >
                        <Icon size={17} className="text-neutral-600" />
                        <p className="mt-5 text-xl font-bold text-white">
                            {value}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold tracking-wider text-neutral-600 uppercase">
                            {label}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
