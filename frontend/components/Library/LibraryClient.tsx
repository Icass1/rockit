"use client";

import { useState } from "react";
import {
    ArrowDownAZ,
    ArrowUpAZ,
    ClockArrowDown,
    LayoutGrid,
    List,
    Upload,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ContentType } from "@/components/Library/hooks/useLibraryData";
import { LibraryFilters, ViewMode } from "@/components/Library/LibraryFilters";
import { LibraryLists } from "@/components/Library/LibraryLists";
import UploadModal from "@/components/Library/UploadModal";

export default function LibraryClient() {
    const { langFile: lang } = useLanguage();
    const [filterMode, setFilterMode] = useState<"default" | "asc" | "desc">(
        "default"
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [activeType, setActiveType] = useState<ContentType>("all");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [showUploadModal, setShowUploadModal] = useState(false);

    if (!lang) return null;

    const cycleSortMode = () =>
        setFilterMode((m) =>
            m === "default" ? "asc" : m === "asc" ? "desc" : "default"
        );

    return (
        <div className="webkit-scroll h-full w-full pb-24 pt-28 md:px-8">
            {/* DESKTOP HEADER */}
            <header className="mb-6 hidden items-center gap-3 py-4 md:flex">
                {/* Left: title + pills */}
                <div className="mr-4 flex items-center gap-8">
                    <h1 className="shrink-0 select-none text-4xl font-bold text-white">
                        {lang.library}
                    </h1>
                    <LibraryFilters
                        activeType={activeType}
                        setActiveType={setActiveType}
                    />
                </div>

                {/* Right: sort + view toggle + upload + search */}
                <div className="ml-auto flex shrink-0 items-center gap-1">
                    {/* Sort */}
                    <button
                        onClick={cycleSortMode}
                        title="Sort"
                        className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md text-neutral-400 transition hover:text-white"
                    >
                        {filterMode === "default" && (
                            <ClockArrowDown className="h-5 w-5" />
                        )}
                        {filterMode === "asc" && (
                            <ArrowDownAZ className="h-5 w-5" />
                        )}
                        {filterMode === "desc" && (
                            <ArrowUpAZ className="h-5 w-5" />
                        )}
                    </button>

                    {/* View toggle */}
                    <button
                        onClick={() =>
                            setViewMode((v) => (v === "grid" ? "list" : "grid"))
                        }
                        title={viewMode === "grid" ? "List view" : "Grid view"}
                        className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md text-neutral-400 transition hover:text-white"
                    >
                        {viewMode === "grid" ? (
                            <List className="h-5 w-5" />
                        ) : (
                            <LayoutGrid className="h-5 w-5" />
                        )}
                    </button>

                    {/* Upload */}
                    <button
                        onClick={() => setShowUploadModal(true)}
                        title={lang.upload ?? "Upload music"}
                        className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full text-neutral-400 transition hover:text-white"
                    >
                        <Upload className="h-5 w-5" />
                    </button>

                    {/* Search - fixed width that expands on focus */}
                    <div className="relative">
                        <input
                            className="h-8 w-56 rounded-full bg-neutral-900 pl-8 pr-3 text-sm font-medium shadow transition-[width] duration-200 focus:outline-none"
                            style={{
                                backgroundImage: "url(/search-icon.png)",
                                backgroundPosition: "10px center",
                                backgroundSize: "13px",
                                backgroundRepeat: "no-repeat",
                            }}
                            type="search"
                            placeholder={lang.search_library}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            {/* MOBILE HEADER */}
            <header className="mb-4 flex flex-col gap-2 px-4 md:hidden">
                {/* Row 1: search + upload */}
                <div className="flex items-center gap-2">
                    <input
                        className="h-9 flex-1 rounded-full bg-neutral-900 pl-9 pr-3 text-sm font-medium shadow focus:outline-none"
                        style={{
                            backgroundImage: "url(/search-icon.png)",
                            backgroundPosition: "12px center",
                            backgroundSize: "14px",
                            backgroundRepeat: "no-repeat",
                        }}
                        type="search"
                        placeholder={lang.search_library}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button
                        onClick={() => setShowUploadModal(true)}
                        title={lang.upload ?? "Upload music"}
                        className="flex h-9 w-9 shrink-0 select-none items-center justify-center rounded-full bg-neutral-800 text-neutral-300 transition hover:bg-neutral-700 hover:text-white"
                    >
                        <Upload className="h-4 w-4" />
                    </button>
                </div>

                {/* Row 2: pills */}
                <LibraryFilters
                    activeType={activeType}
                    setActiveType={setActiveType}
                />
            </header>

            <LibraryLists
                filterMode={filterMode}
                searchQuery={searchQuery}
                activeType={activeType}
                viewMode={viewMode}
            />

            <UploadModal
                isOpen={showUploadModal}
                onClose={() => setShowUploadModal(false)}
            />
        </div>
    );
}
