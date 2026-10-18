"use client";

import { useMemo, type JSX } from "react";
import { DownloadGroupResponse } from "@/dto";

const DAYS_TO_SHOW = 14;

export default function DownloadStats({
    groups,
}: {
    groups: DownloadGroupResponse[];
}): JSX.Element {
    const items = useMemo(() => groups.flatMap((g) => g.items), [groups]);

    const completed = items.filter((i) => i.status === "COMPLETED").length;
    const failed = items.filter((i) => i.status === "FAILED").length;
    const active = items.length - completed - failed;

    const timeline = useMemo((): number[] => {
        const counts = new Array(DAYS_TO_SHOW).fill(0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        items.forEach((item) => {
            if (!item.dateEnded || item.status !== "COMPLETED") return;
            const ended = new Date(item.dateEnded);
            ended.setHours(0, 0, 0, 0);
            const diff = Math.round(
                (today.getTime() - ended.getTime()) / 86_400_000
            );
            if (diff >= 0 && diff < DAYS_TO_SHOW)
                counts[DAYS_TO_SHOW - 1 - diff] += 1;
        });
        return counts;
    }, [items]);

    return (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total" value={items.length} />
            <StatCard label="Descargando" value={active} accent="#ee1086" />
            <StatCard label="Completadas" value={completed} accent="#1cad60" />
            <StatCard label="Fallidas" value={failed} accent="#c72e2e" />

            <div className="col-span-2 rounded-lg border border-neutral-600 bg-neutral-900/50 p-4 sm:col-span-4">
                <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-neutral-300">
                        Actividad (últimos {DAYS_TO_SHOW} días)
                    </span>
                    <span className="text-xs text-neutral-500">
                        {timeline.reduce((a, b) => a + b, 0)} descargas
                    </span>
                </div>
                <Sparkline data={timeline} />
            </div>
        </div>
    );
}

function StatCard({
    label,
    value,
    accent = "#ffffff",
}: {
    label: string;
    value: number;
    accent?: string;
}): JSX.Element {
    return (
        <div className="rounded-lg border border-neutral-600 bg-neutral-900/50 p-4">
            <div className="text-2xl font-bold" style={{ color: accent }}>
                {value}
            </div>
            <div className="text-xs text-neutral-400">{label}</div>
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
