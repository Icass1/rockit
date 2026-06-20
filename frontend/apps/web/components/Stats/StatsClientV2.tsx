"use client";

import { JSX, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useStore } from "@nanostores/react";
import { EWebSocketMessage } from "@rockit/shared";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import UserStatsV2 from "@/components/Stats/UserStatsV2";

type Range = "7d" | "30d" | "1y" | "all" | "custom";

const RANGE_OPTIONS: { label: string; value: Range }[] = [
    { label: "7 days", value: "7d" },
    { label: "30 days", value: "30d" },
    { label: "1 year", value: "1y" },
    { label: "All", value: "all" },
    { label: "Custom", value: "custom" },
];

function getRangeLabel(
    range: Range,
    customStart?: string,
    customEnd?: string
): string {
    switch (range) {
        case "7d":
            return "last 7 days";
        case "30d":
            return "last 30 days";
        case "1y":
            return "last year";
        case "all":
            return "all time";
        case "custom":
            if (customStart && customEnd) {
                const s = new Date(customStart).toLocaleDateString();
                const e = new Date(customEnd).toLocaleDateString();
                return `${s} — ${e}`;
            }
            return "custom range";
    }
}

function LoadingSkeleton(): JSX.Element {
    return (
        <div className="flex flex-col gap-10 md:gap-14">
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-x-10">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                        <div className="skeleton mb-2 h-8 w-24 rounded md:h-9 lg:h-10" />
                        <div className="skeleton h-3 w-20 rounded" />
                    </div>
                ))}
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-4">
                    <div className="flex items-center gap-4">
                        <div className="skeleton h-px flex-1 rounded" />
                        <div className="skeleton h-3 w-40 rounded" />
                        <div className="skeleton h-px flex-1 rounded" />
                    </div>
                    <div className="skeleton h-75 w-full rounded" />
                </div>
            ))}
        </div>
    );
}

export default function StatsClientV2(): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [range, setRange] = useState<Range>("7d");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    const fetchStats = useCallback(
        () =>
            Http.getUserStatsV2({
                range,
                start:
                    range === "custom" && customStart
                        ? new Date(customStart).toISOString()
                        : null,
                end:
                    range === "custom" && customEnd
                        ? new Date(customEnd).toISOString()
                        : null,
            }),
        [range, customStart, customEnd]
    );

    const { data, loading, error, update } = useFetch(fetchStats);

    useEffect(() => {
        const handler = (): void => {
            update();
        };
        rockIt.webSocketManager.onMessage(
            EWebSocketMessage.MediaListened,
            handler
        );
        return () => {
            rockIt.webSocketManager.offMessage(
                EWebSocketMessage.MediaListened,
                handler
            );
        };
    }, [update]);

    const rangeLabel = getRangeLabel(range, customStart, customEnd);

    function handleRangeChange(newRange: Range): void {
        setRange(newRange);
        if (newRange !== "custom") {
            setCustomStart("");
            setCustomEnd("");
        }
    }

    return (
        <div className="mx-auto w-full max-w-400 overflow-x-hidden px-4 pt-6 pb-24 md:overflow-visible md:px-8 md:pt-10">
            <div
                className="animate-fade-in-up mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between"
                style={{ animationDelay: "50ms" }}
            >
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        <h1 className="text-4xl font-bold tracking-tight text-white md:text-5xl">
                            {$vocabulary.STATS}
                        </h1>
                        <Link
                            href="/stats"
                            className="inline-flex items-center rounded-full border border-neutral-700 px-3 py-0.5 text-xs font-medium text-neutral-400 transition-colors hover:border-[#ee1086] hover:text-[#ee1086]"
                        >
                            v1
                        </Link>
                    </div>
                    <p className="mt-1.5 text-sm text-neutral-500 md:text-base">
                        Showing stats for{" "}
                        <span className="font-medium text-neutral-400">
                            {rangeLabel}
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {RANGE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleRangeChange(opt.value)}
                            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${
                                range === opt.value
                                    ? "bg-[#ee1086] text-white"
                                    : "text-neutral-500 hover:bg-white/6 hover:text-white"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {range === "custom" && (
                <div className="animate-fade-in-up mb-6 flex flex-wrap items-center justify-end gap-3">
                    <div className="relative">
                        <label
                            htmlFor="stats-start"
                            className="absolute -top-2 left-3 bg-[#0b0b0b] px-1 text-[10px] text-neutral-500"
                        >
                            From
                        </label>
                        <input
                            id="stats-start"
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-2.5 text-sm text-white transition-colors focus:border-[#ee1086] focus:ring-1 focus:ring-[#ee1086] focus:outline-none"
                        />
                    </div>
                    <span className="text-neutral-600">→</span>
                    <div className="relative">
                        <label
                            htmlFor="stats-end"
                            className="absolute -top-2 left-3 bg-[#0b0b0b] px-1 text-[10px] text-neutral-500"
                        >
                            To
                        </label>
                        <input
                            id="stats-end"
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="rounded-xl border border-neutral-800 bg-neutral-900/50 px-4 py-2.5 text-sm text-white transition-colors focus:border-[#ee1086] focus:ring-1 focus:ring-[#ee1086] focus:outline-none"
                        />
                    </div>
                </div>
            )}

            {loading && <LoadingSkeleton />}

            {error && (
                <div className="animate-fade-in-up mt-8">
                    <p className="text-sm text-red-400">
                        Error loading stats: {error}
                    </p>
                </div>
            )}

            {data && (
                <UserStatsV2
                    data={data}
                    range={range}
                    rangeLabel={rangeLabel}
                />
            )}
        </div>
    );
}
