"use client";

import { type JSX } from "react";
import { DownloadGroupResponse } from "@/dto";

export type DownloadFilter = "all" | "active" | "completed" | "failed";

export default function DownloadFilterTabs({
    value,
    onChange,
    groups,
}: {
    value: DownloadFilter;
    onChange: (f: DownloadFilter) => void;
    groups: DownloadGroupResponse[];
}): JSX.Element {
    const items = groups.flatMap((g) => g.items);
    const counts: Record<DownloadFilter, number> = {
        all: items.length,
        active: items.filter(
            (i) => i.status !== "COMPLETED" && i.status !== "FAILED"
        ).length,
        completed: items.filter((i) => i.status === "COMPLETED").length,
        failed: items.filter((i) => i.status === "FAILED").length,
    };

    const tabs: { key: DownloadFilter; label: string }[] = [
        { key: "all", label: "Todas" },
        { key: "active", label: "Descargando" },
        { key: "completed", label: "Completadas" },
        { key: "failed", label: "Fallidas" },
    ];

    return (
        <div className="flex gap-2 border-b border-neutral-700">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    onClick={(): void => onChange(tab.key)}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                        value === tab.key
                            ? "border-(--color-rockit-pink) text-white"
                            : "border-transparent text-neutral-400 hover:text-neutral-200"
                    }`}
                >
                    {tab.label}
                    <span className="rounded-full bg-neutral-700 px-1.5 text-xs">
                        {counts[tab.key]}
                    </span>
                </button>
            ))}
        </div>
    );
}
