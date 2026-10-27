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
        <section className="rounded-3xl border border-white/7 bg-neutral-950/60 p-5 md:p-6">
            <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                    <p className="text-[10px] font-semibold tracking-[0.22em] text-(--color-rockit-pink) uppercase">
                        Top 10
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-white">
                        {title}
                    </h3>
                </div>
                <p className="text-xs text-neutral-600">by time listened</p>
            </div>
            {ranked.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-sm text-neutral-600">
                    Nothing played in this period
                </div>
            ) : (
                <div className="space-y-2.5">
                    {ranked.map((item, index) => {
                        const body = (
                            <>
                                <div
                                    className="absolute inset-y-0 left-0 rounded-xl bg-linear-to-r from-fuchsia-500/15 to-transparent transition-all duration-700"
                                    style={{
                                        width: `${(item.value / max) * 100}%`,
                                    }}
                                />
                                <span className="relative w-5 text-center text-xs font-bold text-neutral-600 tabular-nums">
                                    {index + 1}
                                </span>
                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-neutral-800">
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
                                    <p className="truncate text-sm font-semibold text-white">
                                        {item.name}
                                    </p>
                                    <p className="truncate text-xs text-neutral-500">
                                        {item.subtitle ?? "Rockit"}
                                    </p>
                                </div>
                                <span className="relative text-xs font-semibold text-neutral-400 tabular-nums">
                                    {formatDuration(item.value)}
                                </span>
                                {onPlay && (
                                    <Play
                                        className="relative text-neutral-600 group-hover:text-white"
                                        size={15}
                                        fill="currentColor"
                                    />
                                )}
                            </>
                        );
                        const className =
                            "group relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-transparent bg-white/3 px-3 py-2 text-left transition-colors hover:border-white/10 hover:bg-white/6";
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
