"use client";

import type { JSX } from "react";
import type { DownloadTotalsResponse } from "@/dto";
import type { DownloadFilter } from "@/models/types/downloadBrowser";
import { useVocabulary } from "@/components/providers/VocabularyProvider";

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
    const v = useVocabulary();
    const tabs: { key: DownloadFilter; label: string; count: number }[] = [
        { key: "all", label: v.ALL, count: totals.total },
        { key: "active", label: v.DOWNLOADING, count: totals.active },
        { key: "completed", label: v.COMPLETED, count: totals.completed },
        { key: "failed", label: v.FAILED, count: totals.failed },
    ];
    return (
        <div className="border-border flex flex-wrap gap-2 border-b">
            {tabs.map((tab) => (
                <button
                    key={tab.key}
                    aria-pressed={value === tab.key}
                    onClick={() => onChange(tab.key)}
                    className={`flex items-center gap-2 border-b-2 px-3 py-2 text-sm ${value === tab.key ? "border-primary text-foreground-strong" : "text-muted-foreground border-transparent"}`}
                >
                    {tab.label}
                    <span className="bg-muted rounded-full px-2 text-xs">
                        {tab.count}
                    </span>
                </button>
            ))}
        </div>
    );
}
