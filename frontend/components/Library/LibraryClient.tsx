"use client";

import { useState } from "react";

import { LibraryFilters } from "@/components/Library/LibraryFilters";
// import { FeaturedLists } from "@/components/Library/FeaturedLists";
import { LibraryLists } from "@/components/Library/LibraryLists";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LibraryClient() {
    const { langFile: lang } = useLanguage();
    const [filterMode, setFilterMode] = useState<"default" | "asc" | "desc">(
        "default"
    );
    const [searchQuery, setSearchQuery] = useState("");

    if (!lang) return false;

    return (
        <div className="h-full w-full overflow-y-auto pb-24 pt-24 md:px-8">
            <section className="flex items-center justify-between px-10 md:px-0">
                <div className="hidden md:flex">
                    <h1 className="text-4xl font-bold text-white">
                        {lang.library}
                    </h1>
                </div>
                <LibraryFilters
                    filterMode={filterMode}
                    setFilterMode={setFilterMode}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                />
            </section>

            {/* <FeaturedLists filterMode={filterMode} searchQuery={searchQuery} /> */}

            <LibraryLists filterMode={filterMode} searchQuery={searchQuery} />
        </div>
    );
}
