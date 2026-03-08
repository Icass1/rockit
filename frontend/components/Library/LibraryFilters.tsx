"use client";

import { ArrowDownAZ, ArrowUpAZ, ClockArrowDown, LayoutGrid, List } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ContentType } from "@/components/Library/hooks/useLibraryData";

export type ViewMode = "grid" | "list";

export function LibraryFilters({
    filterMode,
    setFilterMode,
    searchQuery,
    setSearchQuery,
    activeType,
    setActiveType,
    viewMode,
    setViewMode,
}: {
    filterMode: "default" | "asc" | "desc";
    setFilterMode: (mode: "default" | "asc" | "desc") => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    activeType: ContentType;
    setActiveType: (type: ContentType) => void;
    viewMode: ViewMode;
    setViewMode: (mode: ViewMode) => void;
}) {
    const { langFile: lang } = useLanguage();
    if (!lang) return false;

    const contentTypes: { key: ContentType; label: string }[] = [
        { key: "all", label: lang.library },  // "Library" works as "All" in this context
        { key: "albums", label: lang.albums },
        { key: "playlists", label: lang.playlists },
        { key: "songs", label: lang.songs },
        { key: "videos", label: lang.yt_videos },
        { key: "stations", label: lang.radio_stations },
    ];

    return (
        <div className="flex w-full flex-col gap-4">
            <div className="flex w-full items-center gap-4 md:w-fit">
                <button
                    className="hidden md:flex"
                    onClick={() => {
                        setFilterMode(
                            filterMode === "default"
                                ? "asc"
                                : filterMode === "asc"
                                  ? "desc"
                                  : "default"
                        );
                    }}
                >
                    {filterMode === "default" && (
                        <ClockArrowDown className="h-6 w-6 text-white" />
                    )}
                    {filterMode === "asc" && (
                        <ArrowDownAZ className="h-6 w-6 text-white" />
                    )}
                    {filterMode === "desc" && (
                        <ArrowUpAZ className="h-6 w-6 text-white" />
                    )}
                </button>

                <input
                    className="text-1xl h-8 w-full rounded-full bg-neutral-900 pl-10 pr-2 font-semibold shadow focus:outline-none"
                    style={{
                        backgroundImage: "url(/search-icon.png)",
                        backgroundPosition: "15px center",
                        backgroundSize: "14px",
                        backgroundRepeat: "no-repeat",
                    }}
                    type="search"
                    placeholder={lang.search_library}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />

                <button
                    className="hidden md:flex"
                    onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                    title={viewMode === "grid" ? "List view" : "Grid view"}
                >
                    {viewMode === "grid" ? (
                        <List className="h-6 w-6 text-white" />
                    ) : (
                        <LayoutGrid className="h-6 w-6 text-white" />
                    )}
                </button>
            </div>

            <div className="flex w-full overflow-x-auto pb-2 md:pb-0">
                <div className="flex flex-nowrap gap-2">
                    {contentTypes.map((type) => (
                        <button
                            key={type.key}
                            onClick={() => setActiveType(type.key)}
                            className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium transition ${
                                activeType === type.key
                                    ? "bg-white text-black"
                                    : "bg-neutral-800 text-white hover:bg-neutral-700"
                            }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
