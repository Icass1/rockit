"use client";

import { JSX, useState } from "react";
import type { StatsSummaryResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

function formatNumber(num: number): string {
    if (num >= 1_000_000) {
        return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    }
    if (num >= 10_000) {
        return `${(num / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    }
    return num.toLocaleString();
}

function formatDuration(minutes: number): string {
    const d = Math.floor(minutes / 1440);
    const h = Math.floor((minutes % 1440) / 60);
    const m = Math.round(minutes % 60);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || parts.length === 0) parts.push(`${m}m`);
    return parts.join(" ");
}

interface SummaryCardsProps {
    summary: StatsSummaryResponse;
}

export default function SummaryCards({
    summary,
}: SummaryCardsProps): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [showMinutes, setShowMinutes] = useState(false);

    const minutesDisplay = showMinutes
        ? `${Math.round(summary.minutesListened).toLocaleString()} ${$vocabulary.MINUTES ?? "min"}`
        : formatDuration(summary.minutesListened);

    return (
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-10 lg:gap-16">
            <button
                type="button"
                className="group relative cursor-default text-left"
            >
                <div className="absolute -inset-8 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(238,16,134,0.1)_0%,transparent_70%)] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
                <div className="relative">
                    <p className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        {formatNumber(summary.songsListened)}
                    </p>
                    <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase md:text-sm">
                        {$vocabulary.SONGS_LISTENED ?? "Songs Listened"}
                    </p>
                </div>
            </button>

            <button
                type="button"
                className="group relative cursor-pointer text-left"
                onClick={() => setShowMinutes(!showMinutes)}
            >
                <div className="relative">
                    <p className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                        {minutesDisplay}
                    </p>
                    <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase md:text-sm">
                        {$vocabulary.MINUTES_LISTEND ?? "Minutes Listened"}
                    </p>
                </div>
            </button>

            <div className="relative">
                <p className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                    {summary.avgMinutesPerSong.toFixed(2)}
                </p>
                <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase md:text-sm">
                    {$vocabulary.AVERAGE_MINUTES_PER_SONG ?? "Avg / Song"}
                </p>
            </div>

            <div className="relative">
                <p className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                    {summary.currentStreak}d
                </p>
                <p className="mt-2 text-xs font-semibold tracking-[0.2em] text-neutral-500 uppercase md:text-sm">
                    {$vocabulary.LEVEL_ABBR ?? "Streak"}
                </p>
            </div>
        </div>
    );
}
