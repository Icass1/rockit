"use client";

import { useStore } from "@nanostores/react";
import { rockIt } from "@/lib/rockit/rockIt";
import { ContentType } from "@/components/Library/hooks/useLibraryData";

export type ViewMode = "grid" | "list";

export function LibraryFilters({
    activeType,
    setActiveType,
}: {
    activeType: ContentType;
    setActiveType: (type: ContentType) => void;
}) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const pills: { key: ContentType; label: string }[] = [
        { key: "all", label: $vocabulary.ALL ?? "All" },
        { key: "albums", label: $vocabulary.ALBUMS },
        { key: "playlists", label: $vocabulary.PLAYLISTS },
        { key: "songs", label: $vocabulary.SONGS },
        { key: "videos", label: $vocabulary.VIDEOS },
        { key: "stations", label: $vocabulary.RADIO_STATIONS },
    ];

    return (
        <div
            className="flex min-w-0 items-center gap-1.5 overflow-x-auto pb-0.5"
            style={{ scrollbarWidth: "none" }}
        >
            {pills.map(({ key, label }) => (
                <button
                    key={key}
                    onClick={() => setActiveType(key)}
                    className={`shrink-0 select-none rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                        activeType === key
                            ? "bg-white text-black"
                            : "bg-neutral-800 text-white hover:bg-neutral-700"
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
