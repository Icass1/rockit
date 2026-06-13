"use client";

import { JSX, useEffect, useRef, useState } from "react";
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

function AnimatedNumber({
    value,
    format,
}: {
    value: number;
    format?: (n: number) => string;
}): JSX.Element {
    const [display, setDisplay] = useState(0);
    const ref = useRef<number>(0);
    const raf = useRef<number>(0);

    useEffect(() => {
        const duration = 1200;
        const start = performance.now();
        const from = ref.current;

        function tick(now: number): void {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(from + (value - from) * eased);
            setDisplay(current);
            ref.current = current;

            if (progress < 1) {
                raf.current = requestAnimationFrame(tick);
            }
        }

        raf.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf.current);
    }, [value]);

    const formatted = format ? format(display) : display.toLocaleString();
    return <>{formatted}</>;
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
        ? `${Math.round(summary.minutesListened).toLocaleString()} ${$vocabulary.MINUTES}`
        : formatDuration(summary.minutesListened);

    return (
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-x-10 md:gap-y-0">
            <div>
                <p className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
                    <AnimatedNumber
                        value={summary.songsListened}
                        format={formatNumber}
                    />
                </p>
                <p className="mt-1.5 text-[11px] font-semibold tracking-[0.2em] text-neutral-500 uppercase md:text-xs">
                    {$vocabulary.SONGS_LISTENED}
                </p>
            </div>

            <button
                type="button"
                onClick={() => setShowMinutes(!showMinutes)}
                className="cursor-pointer text-left"
            >
                <p className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
                    {minutesDisplay}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold tracking-[0.2em] text-neutral-500 uppercase md:text-xs">
                    {$vocabulary.MINUTES_LISTEND}
                </p>
            </button>

            <div>
                <p className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
                    {summary.avgMinutesPerSong.toFixed(2)}
                </p>
                <p className="mt-1.5 text-[11px] font-semibold tracking-[0.2em] text-neutral-500 uppercase md:text-xs">
                    {$vocabulary.AVERAGE_MINUTES_PER_SONG}
                </p>
            </div>

            <div>
                <p className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
                    {summary.currentStreak}
                    <span className="ml-1 text-2xl text-[#ee1086] md:text-3xl">
                        d
                    </span>
                </p>
                <p className="mt-1.5 text-[11px] font-semibold tracking-[0.2em] text-neutral-500 uppercase md:text-xs">
                    {$vocabulary.LEVEL_ABBR}
                </p>
            </div>
        </div>
    );
}
