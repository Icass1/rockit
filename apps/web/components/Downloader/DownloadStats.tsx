"use client";

import type { JSX } from "react";
import type { DownloadTotalsResponse } from "@/dto";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

export default function DownloadStats({
    totals,
}: {
    totals: DownloadTotalsResponse;
}): JSX.Element {
    const v = useVocabulary();
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
                {
                    label: v.DOWNLOADS,
                    value: totals.total,
                    color: "text-foreground-strong",
                },
                {
                    label: v.DOWNLOADING,
                    value: totals.active,
                    color: "text-primary-soft",
                },
                {
                    label: v.COMPLETED,
                    value: totals.completed,
                    color: "text-success-foreground",
                },
                {
                    label: v.FAILED,
                    value: totals.failed,
                    color: "text-destructive-soft",
                },
            ].map((stat) => (
                <div
                    key={stat.label}
                    className="border-border-subtle bg-secondary/50 rounded-lg border p-4"
                >
                    <p className={`text-2xl font-bold ${stat.color}`}>
                        {stat.value}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        {stat.label}
                    </p>
                </div>
            ))}
            {totals.daily?.length > 0 && (
                <div className="border-border-subtle bg-secondary/50 col-span-2 rounded-lg border p-4 sm:col-span-4">
                    <p className="text-muted-foreground mb-2 text-sm">
                        {v.DOWNLOADER_ACTIVITY}
                    </p>
                    <Sparkline data={totals.daily} />
                </div>
            )}
        </div>
    );
}

function Sparkline({ data }: { data: number[] }): JSX.Element {
    const width = 600;
    const height = 60;
    const max = Math.max(...data, 1);
    const stepX = width / (data.length - 1 || 1);
    const points = data
        .map((v, i) => `${i * stepX},${height - (v / max) * height}`)
        .join(" ");

    return (
        <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-16 w-full"
            preserveAspectRatio="none"
        >
            <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                        offset="0%"
                        stopColor="var(--theme-primary)"
                        stopOpacity="0.35"
                    />
                    <stop
                        offset="100%"
                        stopColor="var(--theme-primary)"
                        stopOpacity="0"
                    />
                </linearGradient>
            </defs>
            <polygon
                points={`0,${height} ${points} ${width},${height}`}
                fill="url(#sparkFill)"
            />
            <polyline
                points={points}
                fill="none"
                strokeWidth="2"
                className="stroke-primary"
            />
        </svg>
    );
}
