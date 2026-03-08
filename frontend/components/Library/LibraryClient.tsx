"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LibraryFilters, ViewMode } from "@/components/Library/LibraryFilters";
import { LibraryLists } from "@/components/Library/LibraryLists";
import UploadModal from "@/components/Library/UploadModal";
import { ContentType } from "@/components/Library/hooks/useLibraryData";

export default function LibraryClient() {
    const { langFile: lang } = useLanguage();
    const [filterMode, setFilterMode] = useState<"default" | "asc" | "desc">(
        "default"
    );
    const [searchQuery, setSearchQuery] = useState("");
    const [activeType, setActiveType] = useState<ContentType>("all");
    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const [showUploadModal, setShowUploadModal] = useState(false);

    if (!lang) return false;

    return (
        <div className="webkit-scroll h-full w-full pb-24 pt-24 md:px-8">
            <section className="flex flex-col gap-3 px-5 md:flex-row md:items-start md:justify-between md:px-0">
                {/* Desktop title + upload button side by side */}
                <div className="hidden shrink-0 items-center gap-4 md:flex">
                    <h1 className="text-4xl font-bold text-white">
                        {lang.library}
                    </h1>
                    <button
                        onClick={() => setShowUploadModal(true)}
                        title="Upload music"
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800 text-white transition hover:bg-neutral-700"
                    >
                        <Upload className="h-4 w-4" />
                    </button>
                </div>

                {/* Filters + mobile upload button */}
                <div className="flex w-full items-start gap-3 md:flex-1">
                    <div className="flex-1">
                        <LibraryFilters
                            filterMode={filterMode}
                            setFilterMode={setFilterMode}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            activeType={activeType}
                            setActiveType={setActiveType}
                            viewMode={viewMode}
                            setViewMode={setViewMode}
                        />
                    </div>
                    {/* Mobile-only upload button (inline with search row) */}
                    <button
                        onClick={() => setShowUploadModal(true)}
                        title="Upload music"
                        className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-white transition hover:bg-neutral-700 md:hidden"
                    >
                        <Upload className="h-4 w-4" />
                    </button>
                </div>
            </section>

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
