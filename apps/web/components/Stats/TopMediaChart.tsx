"use client";

import { JSX, useMemo } from "react";
import Link from "next/link";
import type { StatsRankedItemResponse } from "@/dto";
import { Play } from "lucide-react";

interface TopMediaChartProps {
    title: string;
    items: StatsRankedItemResponse[];
    onPlay?: (item: StatsRankedItemResponse) => void;
}

function formatDuration(ms: number): string {
    const minutes = Math.round(ms / 60000);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function TopMediaChart({
    title,
    items,
    onPlay,
}: TopMediaChartProps): JSX.Element {
    const ranked = useMemo(
        () => [...items].sort((a, b) => b.value - a.value).slice(0, 10),
        [items]
    );
    const max = ranked[0]?.value ?? 1;

    return (
        <section className="border-foreground-strong/7 bg-background/60 rounded-3xl border p-5 md:p-6">
            <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                    <p className="text-primary text-[10px] font-semibold tracking-[0.22em] uppercase">
                        Top 10
                    </p>
                    <h3 className="text-foreground-strong mt-1 text-xl font-bold">
                        {title}
                    </h3>
                </div>
                <p className="text-disabled-foreground text-xs">
                    by time listened
                </p>
            </div>
            {ranked.length === 0 ? (
                <div className="text-disabled-foreground flex h-64 items-center justify-center text-sm">
                    Nothing played in this period
                </div>
            ) : (
                <div className="space-y-2.5">
                    {ranked.map((item, index) => {
                        const body = (
                            <>
                                <div
                                    className="from-primary/15 absolute inset-y-0 left-0 rounded-xl bg-linear-to-r to-transparent transition-all duration-700"
                                    style={{
                                        width: `${(item.value / max) * 100}%`,
                                    }}
                                />
                                <span className="text-disabled-foreground relative w-5 text-center text-xs font-bold tabular-nums">
                                    {index + 1}
                                </span>
                                <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                                    {item.imageUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={item.imageUrl}
                                            alt=""
                                            className="h-full w-full object-cover"
                                        />
                                    )}
                                </div>
                                <div className="relative min-w-0 flex-1">
                                    <p className="text-foreground-strong truncate text-sm font-semibold">
                                        {item.name}
                                    </p>
                                    <p className="text-subtle-foreground truncate text-xs">
                                        {item.subtitle ?? "Rockit"}
                                    </p>
                                </div>
                                <span className="text-muted-foreground relative text-xs font-semibold tabular-nums">
                                    {formatDuration(item.value)}
                                </span>
                                {onPlay && (
                                    <Play
                                        className="text-disabled-foreground group-hover:text-foreground-strong relative"
                                        size={15}
                                        fill="currentColor"
                                    />
                                )}
                            </>
                        );
                        const className =
                            "group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-transparent bg-foreground-strong/3 px-3 py-2 text-left transition-colors hover:border-foreground-strong/10 hover:bg-foreground-strong/6";
                        return onPlay ? (
                            <button
                                key={item.publicId}
                                type="button"
                                onClick={() => onPlay(item)}
                                className={className}
                            >
                                {body}
                            </button>
                        ) : (
                            <Link
                                key={item.publicId}
                                href={item.href}
                                className={className}
                            >
                                {body}
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
