"use client";

import { FeaturedLists } from "@/components/Library/FeaturedLists";
import { LibraryFilters } from "@/components/Library/LibraryFilters";
import { LibraryLists } from "@/components/Library/LibraryLists";
import { langData } from "@/stores/lang";
import { useStore } from "@nanostores/react";

export default function Library() {
    const $lang = useStore(langData);

    if (!$lang) return;
    return (
        <div className="h-full w-full overflow-y-auto pt-24 pb-24 md:px-8">
            <section className="flex items-center justify-between px-10 md:px-0">
                <div className="hidden md:flex">
                    <label className="text-4xl font-bold text-white">
                        {$lang.library}
                    </label>
                </div>
                <LibraryFilters />
            </section>

            <FeaturedLists />
            <LibraryLists />
        </div>
    );
}
