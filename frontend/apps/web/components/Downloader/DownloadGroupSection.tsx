"use client";

import { type JSX, useState } from "react";
import { DownloadGroupResponse } from "@/dto";
import { ChevronDown, Trash2 } from "lucide-react";
import DownloadCoverCard from "@/components/Downloader/DownloadCoverCard";
import FadeInOnView from "@/components/Downloader/FadeInOnView";

const VISIBLE_LIMIT = 12;

export default function DownloadGroupSection({
    group,
    onClear,
}: {
    group: DownloadGroupResponse;
    onClear?: () => void;
}): JSX.Element {
    const [expanded, setExpanded] = useState(false);
    const visibleItems = expanded ? group.items : group.items.slice(0, VISIBLE_LIMIT);

    return (
        <section>
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <h2 className="font-semibold text-white">{group.name}</h2>
                    <p className="text-xs text-neutral-400">
                        {group.items.length} elementos ·{" "}
                        {new Date(group.dateStarted).toLocaleDateString()}
                    </p>
                </div>
                {onClear && (
                    <button onClick={onClear} className="text-neutral-400 hover:text-red-500">
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10">
                {visibleItems.map((item, i) => (
                    <FadeInOnView key={item.publicId} delay={(i % 12) * 40}>
                        <DownloadCoverCard item={item} />
                    </FadeInOnView>
                ))}
            </div>

            {group.items.length > VISIBLE_LIMIT && (
                <button
                    onClick={(): void => setExpanded(!expanded)}
                    className="mt-3 flex items-center gap-1 text-sm text-neutral-400 hover:text-white"
                >
                    <ChevronDown size={14} className={expanded ? "rotate-180" : ""} />
                    {expanded ? "Ver menos" : `Ver ${group.items.length - VISIBLE_LIMIT} más`}
                </button>
            )}
        </section>
    );
}
