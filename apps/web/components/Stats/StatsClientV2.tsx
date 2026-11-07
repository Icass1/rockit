"use client";

import { JSX, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    EWebSocketMessage,
    formatStatsRange,
    statsRangeOptions,
    type StatsRange as Range,
} from "@rockit/shared";
import useFetch from "@/hooks/useFetch";
import { Http } from "@/lib/http";
import { rockIt } from "@/lib/rockit/rockIt";
import { getLocalEndOfDay, getLocalStartOfDay } from "@/lib/utils/dateUtils";
import {
    useLanguage,
    useVocabulary,
} from "@/components/providers/VocabularyProvider";
import UserStatsV2 from "@/components/Stats/UserStatsV2";

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
    const $vocabulary = useVocabulary();
    const lang = useLanguage();
    const [range, setRange] = useState<Range>("7d");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    const fetchStats = useCallback(
        () =>
            Http.getUserStatsV2({
                range,
                start:
                    range === "custom" && customStart
                        ? getLocalStartOfDay(customStart)
                        : null,
                end:
                    range === "custom" && customEnd
                        ? getLocalEndOfDay(customEnd)
                        : null,
                timezoneOffsetMinutes: new Date().getTimezoneOffset(),
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

    const rangeLabel = formatStatsRange(
        range,
        $vocabulary,
        lang,
        customStart,
        customEnd
    );

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
                        <h1 className="text-foreground-strong text-4xl font-bold tracking-tight md:text-5xl">
                            {$vocabulary.STATS}
                        </h1>
                        <Link
                            href="/stats"
                            className="border-border text-muted-foreground hover:border-primary hover:text-primary inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium transition-colors"
                        >
                            v1
                        </Link>
                    </div>
                    <p className="text-subtle-foreground mt-1.5 text-sm md:text-base">
                        {$vocabulary.MOBILE_STATS_FOR}{" "}
                        <span className="text-muted-foreground font-medium">
                            {rangeLabel}
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {statsRangeOptions($vocabulary).map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => handleRangeChange(opt.value)}
                            className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-300 ${
                                range === opt.value
                                    ? "bg-primary text-primary-foreground"
                                    : "text-subtle-foreground hover:bg-foreground-strong/6 hover:text-foreground-strong"
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
                            className="bg-background text-subtle-foreground absolute -top-2 left-3 px-1 text-[10px]"
                        >
                            {$vocabulary.MOBILE_DATE_FROM}
                        </label>
                        <input
                            id="stats-start"
                            type="date"
                            value={customStart}
                            onChange={(e) => setCustomStart(e.target.value)}
                            className="border-border-subtle bg-secondary/50 text-foreground-strong focus:border-primary focus:ring-primary rounded-xl border px-4 py-2.5 text-sm transition-colors focus:ring-1 focus:outline-none"
                        />
                    </div>
                    <span className="text-disabled-foreground">→</span>
                    <div className="relative">
                        <label
                            htmlFor="stats-end"
                            className="bg-background text-subtle-foreground absolute -top-2 left-3 px-1 text-[10px]"
                        >
                            {$vocabulary.MOBILE_DATE_TO}
                        </label>
                        <input
                            id="stats-end"
                            type="date"
                            value={customEnd}
                            onChange={(e) => setCustomEnd(e.target.value)}
                            className="border-border-subtle bg-secondary/50 text-foreground-strong focus:border-primary focus:ring-primary rounded-xl border px-4 py-2.5 text-sm transition-colors focus:ring-1 focus:outline-none"
                        />
                    </div>
                </div>
            )}

            {loading && <LoadingSkeleton />}

            {error && (
                <div className="animate-fade-in-up mt-8">
                    <p className="text-destructive-soft text-sm">
                        {$vocabulary.MOBILE_STATS_ERROR}
                        {error}
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
