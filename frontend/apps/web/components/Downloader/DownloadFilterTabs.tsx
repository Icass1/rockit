"use client";

import type { JSX } from "react";
import type { DownloadTotalsResponse } from "@/dto";
import { useStore } from "@nanostores/react";
import type { DownloadFilter } from "@/models/types/downloadBrowser";
import { rockIt } from "@/lib/rockit/rockIt";

export type { DownloadFilter } from "@/models/types/downloadBrowser";

export default function DownloadFilterTabs({
    value,
    onChange,
    totals,
}: {
    value: DownloadFilter;
    onChange: (filter: DownloadFilter) => void;
    totals: DownloadTotalsResponse;
}): JSX.Element {
    const v = useStore(rockIt.vocabularyManager.vocabularyAtom);
    const tabs: { key: DownloadFilter; label: string; count: number }[] = [
        { key: "all", label: v.ALL, count: totals.total },
        { key: "active", label: v.DOWNLOADING, count: totals.active },
        { key: "completed", label: v.COMPLETED, count: totals.completed },
        { key: "failed", label: v.FAILED, count: totals.failed },
    ];
    return (
        <div className="flex flex-wrap gap-2 border-b border-neutral-700">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    aria-pressed={value === tab.key}
                    onClick={() => onChange(tab.key)}
                    className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm ${value === tab.key ? "border-pink-500 text-white" : "border-transparent text-neutral-400"}`}
                >
                    {tab.label}
                    <span className="rounded-full bg-neutral-800 px-2 text-xs">
                        {tab.count}
                    </span>
                </button>
            ))}
        </div>
    );
}
