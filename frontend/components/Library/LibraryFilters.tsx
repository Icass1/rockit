"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { ContentType } from "@/components/Library/hooks/useLibraryData";

export type ViewMode = "grid" | "list";

export function LibraryFilters({
    activeType,
    setActiveType,
}: {
    activeType: ContentType;
    setActiveType: (type: ContentType) => void;
}) {
    const { langFile: lang } = useLanguage();
    if (!lang) return null;

    const pills: { key: ContentType; label: string }[] = [
        { key: "all", label: lang.all ?? "All" },
        { key: "albums", label: lang.albums },
        { key: "playlists", label: lang.playlists },
        { key: "songs", label: lang.songs },
        { key: "videos", label: lang.yt_videos },
        { key: "stations", label: lang.radio_stations },
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
