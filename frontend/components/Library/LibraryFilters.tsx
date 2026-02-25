"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowDownAZ, ArrowUpAZ, ClockArrowDown } from "lucide-react";

export function LibraryFilters({
    filterMode,
    setFilterMode,
    searchQuery,
    setSearchQuery,
}: {
    filterMode: "default" | "asc" | "desc";
    setFilterMode: (mode: "default" | "asc" | "desc") => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;
}) {
    const { langFile: lang } = useLanguage();
    if (!lang) return false;

    return (
        <div className="flex w-full items-center gap-4 md:w-fit">
            <button
                className="hidden md:flex"
                onClick={() => {
                    // ciclo default → asc → desc → default
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
        </div>
    );
}
