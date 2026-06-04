"use client";

import { JSX, useCallback, useState } from "react";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";
import UserStats from "./UserStats";

type Range = "7d" | "30d" | "1y" | "custom";

const RANGE_OPTIONS: { label: string; value: Range }[] = [
    { label: "7 days", value: "7d" },
    { label: "30 days", value: "30d" },
    { label: "1 year", value: "1y" },
    { label: "Custom", value: "custom" },
];

function getRangeLabel(range: Range, customStart?: string, customEnd?: string): string {
    switch (range) {
        case "7d":
            return "last 7 days";
        case "30d":
            return "last 30 days";
        case "1y":
            return "last year";
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
        <div className="flex flex-col gap-12 md:gap-16">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-8">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-2">
                        <div className="skeleton h-9 w-24 rounded" />
                        <div className="skeleton h-3 w-20 rounded" />
                    </div>
                ))}
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-4">
                    <div className="skeleton h-3 w-32 rounded" />
                    <div className="skeleton h-[200px] w-full rounded-lg" />
                </div>
            ))}
        </div>
    );
}

export default function StatsClient(): JSX.Element {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const [range, setRange] = useState<Range>("7d");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    const fetchStats = useCallback(
        () =>
            Http.getUserStats({
                range,
                start: range === "custom" ? (customStart || null) : null,
                end: range === "custom" ? (customEnd || null) : null,
            }),
        [range, customStart, customEnd]
    );

    const { data, loading, error } = useFetch(fetchStats);

    const rangeLabel = getRangeLabel(range, customStart, customEnd);

    function handleRangeChange(newRange: Range): void {
        setRange(newRange);
        if (newRange !== "custom") {
            setCustomStart("");
            setCustomEnd("");
        }
    }

    return (
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-6 md:px-8 md:pt-10">
            <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-4xl font-bold text-white md:text-5xl">
                        {$vocabulary.STATS ?? "Stats"}
                    </h1>
                    <p className="mt-1.5 text-sm text-neutral-500 md:text-base">
                        Showing stats for{" "}
                        <span className="text-neutral-400">{rangeLabel}</span>
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {RANGE_OPTIONS.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleRangeChange(opt.value)}
                            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                                range === opt.value
                                    ? "bg-[#ee1086] text-white shadow-[0_0_20px_rgba(238,16,134,0.4)]"
                                    : "bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            {range === "custom" && (
                <div className="mb-6 flex items-center gap-3">
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
                <div className="mt-8 rounded-xl border border-red-900/50 bg-red-950/20 px-5 py-4">
                    <p className="text-sm text-red-400">
                        Error loading stats: {error}
                    </p>
                </div>
            )}

            {data && <UserStats data={data} rangeLabel={rangeLabel} />}
        </div>
    );
}
