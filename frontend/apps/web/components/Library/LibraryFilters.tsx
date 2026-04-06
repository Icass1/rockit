"use client";

import { useStore } from "@nanostores/react";
import { EContentType } from "@/models/enums/contentType";
import { rockIt } from "@/lib/rockit/rockIt";

export function LibraryFilters({
    activeType,
    setActiveType,
}: {
    activeType: EContentType;
    setActiveType: (type: EContentType) => void;
}) {
    const $vocabulary = useStore(rockIt.vocabularyManager.vocabularyAtom);

    const pills: { key: EContentType; label: string }[] = [
        { key: EContentType.ALL, label: $vocabulary.ALL },
        { key: EContentType.ALBUMS, label: $vocabulary.ALBUMS },
        { key: EContentType.PLAYLISTS, label: $vocabulary.PLAYLISTS },
        { key: EContentType.SONGS, label: $vocabulary.SONGS },
        { key: EContentType.VIDEOS, label: $vocabulary.VIDEOS },
        { key: EContentType.STATIONS, label: $vocabulary.RADIO_STATIONS },
        { key: EContentType.SHARED, label: $vocabulary.SHARED_2_YOU },
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
                    className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition-colors select-none ${
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
