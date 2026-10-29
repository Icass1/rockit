"use client";

import type { JSX } from "react";
import type { DownloadTotalsResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";

export default function DownloadStats({
    totals,
}: {
    totals: DownloadTotalsResponse;
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
                {
                    label: v.DOWNLOADS,
                    value: totals.total,
                    color: "text-white",
                },
                {
                    label: v.DOWNLOADING,
                    value: totals.active,
                    color: "text-pink-400",
                },
                {
                    label: v.COMPLETED,
                    value: totals.completed,
                    color: "text-green-400",
                },
                {
                    label: v.FAILED,
                    value: totals.failed,
                    color: "text-red-400",
                },
            ].map((stat) => (
                <div
                    key={stat.label}
                    className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
                >
                    <p className={`text-2xl font-bold ${stat.color}`}>
                        {stat.value}
                    </p>
                    <p className="text-xs text-neutral-400">{stat.label}</p>
                </div>
            ))}
            {totals.daily?.length > 0 && (
                <div className="col-span-2 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 sm:col-span-4">
                    <p className="mb-2 text-sm text-neutral-400">
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
                    <stop offset="0%" stopColor="#ee1086" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#ee1086" stopOpacity="0" />
                </linearGradient>
            </defs>
            <polygon
                points={`0,${height} ${points} ${width},${height}`}
                fill="url(#sparkFill)"
            />
            <polyline
                points={points}
                fill="none"
                stroke="#ee1086"
                strokeWidth="2"
            />
        </svg>
    );
}
